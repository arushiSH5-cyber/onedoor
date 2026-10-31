"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "me" | "onedoor"; text: string; at: string };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "YES", "0", "NO"];

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function PhoneSimulator() {
  const [session, setSession] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(Math.random().toString(36).slice(2));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy || !session) return;
    setDraft("");
    setError(null);
    setMessages((m) => [...m, { from: "me", text: body, at: nowLabel() }]);
    setBusy(true);
    try {
      const res = await fetch("/api/sms/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session, text: body }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { replies: string[] };
      for (const r of data.replies) {
        await new Promise((ok) => setTimeout(ok, 350));
        setMessages((m) => [...m, { from: "onedoor", text: r, at: nowLabel() }]);
      }
    } catch {
      setError("Message failed. Tap to retry.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSession(Math.random().toString(36).slice(2));
    setMessages([]);
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[2.6rem] border-[10px] border-ink bg-ink p-0 shadow-2xl">
        <div className="overflow-hidden rounded-[1.9rem] bg-paper">
          <div className="flex items-center justify-between bg-teal-900 px-5 pt-3 pb-2 text-xs text-white">
            <span>{nowLabel()}</span>
            <span className="h-4 w-16 rounded-full bg-ink" aria-hidden="true" />
            <span aria-hidden="true">▂▄▆ 4G</span>
          </div>
          <div className="flex items-center gap-2 border-b border-line bg-teal-900 px-4 pb-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 font-bold text-teal-900">1D</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">OneDoor</p>
              <p className="text-[11px] text-teal-100">SMS · any phone</p>
            </div>
            <button onClick={reset} className="ml-auto rounded-md px-2 py-1 text-[11px] text-teal-100 hover:bg-teal-800" aria-label="Reset conversation">
              Reset
            </button>
          </div>
          <div ref={scroller} className="h-[420px] space-y-2 overflow-y-auto bg-cream px-3 py-3" aria-live="polite" data-testid="sms-thread">
            {messages.length === 0 && (
              <div className="mt-16 text-center text-sm text-muted">
                <p>No messages yet.</p>
                <button className="btn-accent mt-3 py-2 text-sm" onClick={() => send("ONEDOOR")} data-testid="sms-start">
                  Text “ONEDOOR”
                </button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap shadow-sm ${
                    m.from === "me" ? "rounded-br-sm bg-teal-800 text-white" : "rounded-bl-sm bg-paper text-ink"
                  }`}
                >
                  {m.text}
                  <span className={`mt-0.5 block text-right text-[10px] ${m.from === "me" ? "text-teal-100" : "text-muted"}`}>{m.at}</span>
                </div>
              </div>
            ))}
            {busy && <div className="w-12 rounded-2xl bg-paper px-3 py-2 text-muted shadow-sm">•••</div>}
            {error && (
              <button className="w-full text-center text-xs text-brick-600" onClick={() => setError(null)}>
                {error}
              </button>
            )}
          </div>
          <form
            className="flex gap-2 border-t border-line bg-paper p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <label className="flex-1">
              <span className="sr-only">Text message</span>
              <input
                className="w-full rounded-full border border-line px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                placeholder="Text message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                data-testid="sms-input"
              />
            </label>
            <button className="rounded-full bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={!draft.trim() || busy}>
              Send
            </button>
          </form>
          <div className="grid grid-cols-3 gap-1.5 bg-teal-50 p-2">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => send(k)}
                disabled={busy || messages.length === 0}
                className="rounded-lg bg-paper py-2 text-sm font-semibold text-ink shadow-sm hover:bg-teal-100 disabled:opacity-40"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Tap a key to reply. Several benefits? Type them with spaces, e.g. “2 3”.</p>
    </div>
  );
}
