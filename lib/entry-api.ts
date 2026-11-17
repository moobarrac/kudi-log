// Browser-side calls to the entries API. Errors come back as plain-language messages from the server.

import type { EntryPatch } from "./entry-input";
import type { Entry } from "./types";

export async function callApi<T = { entry: Entry }>(url: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? fallback);
  return data as T;
}

export const deleteEntry = (id: string) => callApi(`/api/entries/${id}`, { method: "DELETE" }, "We couldn't delete that. Try again.");

export const restoreEntry = (entry: Entry) =>
  callApi("/api/entries/restore", { method: "POST", body: JSON.stringify(entry) }, "We couldn't bring that back. Log it again.");

export const patchEntry = (id: string, patch: EntryPatch) =>
  callApi(`/api/entries/${id}`, { method: "PATCH", body: JSON.stringify(patch) }, "We couldn't save that change. Try again.");
