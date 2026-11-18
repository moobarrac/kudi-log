import { spawn } from "node:child_process";
import fs from "node:fs";
// Regenerates the app icons (lime "k." on ink). Needs Google Chrome installed. Run from the repo root: node scripts/make-icons.mjs
const ROOT = process.cwd();
const font = `file://${ROOT}/assets/fonts/BricolageGrotesque-ExtraBold.ttf`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// [file, size, radius (fraction), glyph size (fraction of icon)]
const ICONS = [
  ["public/icons/icon-192.png", 192, 0.22, 0.62],
  ["public/icons/icon-512.png", 512, 0.22, 0.62],
  ["public/icons/maskable-512.png", 512, 0, 0.46], // full bleed; glyph inside the 80% safe circle
  ["app/apple-icon.png", 180, 0, 0.56], // iOS rounds it itself
  ["app/icon.png", 64, 0.22, 0.66],
];
const html = (size, radius, glyph) => `<!doctype html><html><head><style>
@font-face { font-family: B; src: url("${font}"); font-weight: 800; }
html,body { margin:0; background: transparent; }
.i { width:${size}px; height:${size}px; border-radius:${radius * size}px; background:#101412; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.k { font-family:B; font-weight:800; color:#C6F24E; font-size:${glyph * size}px; line-height:1; letter-spacing:-0.04em; transform: translate(${-size * 0.035}px, ${size * 0.02}px); }
.d { position:absolute; width:${size * 0.075}px; height:${size * 0.075}px; border-radius:50%; background:#C6F24E; left:${size * 0.5 + glyph * size * 0.31}px; top:${size * 0.5 + glyph * size * 0.235}px; }
</style></head><body><div class="i"><span class="k">k</span><span class="d"></span></div></body></html>`;

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9336", "--allow-file-access-from-files", `--user-data-dir=${process.env.TMPDIR}/klicons-${Date.now()}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch("http://127.0.0.1:9336/json")).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d.result); };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const [file, size, radius, glyph] of ICONS) {
  const path = `${process.env.TMPDIR}/icon-${size}-${radius}.html`;
  fs.writeFileSync(path, html(size, radius, glyph));
  await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `file://${path}` }); await sleep(700);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  fs.writeFileSync(`${ROOT}/${file}`, Buffer.from(shot.data, "base64"));
  console.log("wrote", file);
}
ws.close(); chrome.kill();
