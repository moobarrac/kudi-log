"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendSpoken, cleanTranscript, pickVoiceMode, type VoiceMode } from "@/lib/voice-text";

export type VoiceStatus = "idle" | "listening" | "recording" | "transcribing";

const MAX_SECONDS = 30;
/** If the browser's speech service hears nothing at all for this long, assume it's broken and record instead. */
const SPEECH_WATCHDOG_MS = 10_000;
const SPEECH_FAILED_KEY = "kudi:speech-failed";

type Options = {
  /** Current text in the box (read when voice finishes, so typing meanwhile isn't lost). */
  getText: () => string;
  setText: (t: string) => void;
};

// Minimal types for the Web Speech API (not in TypeScript's DOM lib everywhere).
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechCtor = new () => SpeechRec;

function speechCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function speechFailedBefore(): boolean {
  try {
    return localStorage.getItem(SPEECH_FAILED_KEY) === "1";
  } catch {
    return false;
  }
}

function recorderMime(): string {
  const options = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) ?? "";
}

/**
 * The mic in the quick log sheet. Two paths, both ₦0:
 * - "speech": the browser's own recognition, words appear as you talk (Chrome on Android/desktop).
 * - "record": a short clip goes to /api/transcribe (Groq Whisper free tier). iPhone, Firefox, and a fallback.
 * Either way the words land in the box and the normal parser preview takes over. Nothing is logged until "Log".
 */
export function useVoice({ getText, setText }: Options) {
  const [mode, setMode] = useState<VoiceMode>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rec = useRef<SpeechRec | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  // Decide on the client only (no window on the server).
  useEffect(() => {
    setMode(
      pickVoiceMode({
        speech: speechCtor() !== null,
        recorder: typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
        ios: isIOS(),
        speechFailed: speechFailedBefore(),
      }),
    );
  }, []);

  const cleanupMedia = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  // ---------- browser speech recognition ----------

  const fallBackToRecording = useCallback(() => {
    try {
      localStorage.setItem(SPEECH_FAILED_KEY, "1");
    } catch {}
    setMode("record");
    setError("Tap the mic again to record a voice note instead.");
  }, []);

  const startSpeech = useCallback(() => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const base = getText();
    let finalText = "";
    let failed = false;
    let heardSomething = false;
    const r = new Ctor();
    r.lang = "en-NG"; // Nigerian English
    r.interimResults = true;
    r.continuous = false; // stops after a pause, which suits a short spending note
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      heardSomething = true;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += ` ${res[0].transcript}`;
        else interim += ` ${res[0].transcript}`;
      }
      setText(appendSpoken(base, `${finalText} ${interim}`.trim()));
    };
    r.onerror = (e) => {
      failed = true;
      if (e.error === "aborted") return;
      if (e.error === "not-allowed") return setError("Allow the microphone to speak your spending.");
      if (e.error === "no-speech") return setError("I didn't hear anything. Tap the mic and try again.");
      // The browser's speech service isn't available (offline, blocked, unsupported): record instead from now on.
      fallBackToRecording();
    };
    // Some browsers expose the API but never answer (no results, no error). Don't leave people stuck on "Listening…".
    const watchdog = setTimeout(() => {
      if (heardSomething || rec.current !== r) return;
      failed = true;
      fallBackToRecording();
      r.abort();
      rec.current = null;
      setStatus("idle");
    }, SPEECH_WATCHDOG_MS);
    r.onend = () => {
      clearTimeout(watchdog);
      if (rec.current !== r && failed) return; // already handled by the watchdog
      rec.current = null;
      setStatus("idle");
      navigator.vibrate?.(10);
      const spoken = cleanTranscript(finalText);
      if (spoken) setText(appendSpoken(base, spoken));
      else if (!failed) {
        setText(base);
        setError("I didn't catch that. Tap the mic and try again.");
      } else setText(base);
    };

    rec.current = r;
    setStatus("listening");
    navigator.vibrate?.(10);
    r.start();
  }, [getText, setText, fallBackToRecording]);

  // ---------- record a clip, transcribe on the server ----------

  const sendClip = useCallback(
    async (blob: Blob) => {
      if (cancelled.current) return;
      setStatus("transcribing");
      try {
        const form = new FormData();
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        form.append("audio", blob, `voice.${ext}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.text) throw new Error(data.error ?? "That voice note didn't come through. Try again, or type it.");
        if (!cancelled.current) setText(appendSpoken(getText(), data.text));
      } catch (err) {
        if (!cancelled.current) setError(err instanceof Error ? err.message : "That voice note didn't come through.");
      } finally {
        if (!cancelled.current) setStatus("idle");
      }
    },
    [getText, setText],
  );

  const startRecording = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const mime = recorderMime();
      const r = new MediaRecorder(s, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32_000 });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      r.onstop = () => {
        cleanupMedia();
        recorder.current = null;
        navigator.vibrate?.(10);
        const blob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" });
        if (blob.size > 0) void sendClip(blob);
        else setStatus("idle");
      };
      recorder.current = r;
      r.start();
      setSeconds(0);
      setStatus("recording");
      navigator.vibrate?.(10);
      const startedAt = Date.now();
      timer.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(sec);
        if (sec >= MAX_SECONDS) recorder.current?.state === "recording" && recorder.current.stop();
      }, 250);
    } catch (err) {
      cleanupMedia();
      setStatus("idle");
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Allow the microphone to speak your spending."
          : name === "NotFoundError"
            ? "No microphone found on this device."
            : "The microphone didn't start. Try again, or type it.",
      );
    }
  }, [cleanupMedia, sendClip]);

  // ---------- controls ----------

  /** Tap the mic: start, or stop and use what was said. */
  const toggle = useCallback(() => {
    setError(null);
    cancelled.current = false;
    if (status === "listening") {
      const r = rec.current;
      r?.stop();
      // If the service doesn't end the session promptly, end it ourselves.
      setTimeout(() => {
        if (rec.current === r && r) {
          r.abort();
          rec.current = null;
          setStatus("idle");
        }
      }, 2000);
      return;
    }
    if (status === "recording") return recorder.current?.stop();
    if (status === "transcribing") return;
    if (mode === "speech") startSpeech();
    else if (mode === "record") void startRecording();
  }, [mode, status, startSpeech, startRecording]);

  /** Sheet closed: drop whatever was in progress. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    rec.current?.abort();
    rec.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    cleanupMedia();
    setStatus("idle");
    setError(null);
  }, [cleanupMedia]);

  useEffect(() => cancel, [cancel]);

  return { mode, status, seconds, maxSeconds: MAX_SECONDS, error, toggle, cancel };
}
