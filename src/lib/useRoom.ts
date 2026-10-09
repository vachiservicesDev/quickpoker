"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PokerAction, PokerView } from "./poker";

export type ConnectionMode = "connecting" | "live" | "compatible" | "offline";
type Status = "loading" | "join" | "ready" | "missing";

interface Identity {
  participantId: string;
  secret: string;
}

const FAST_POLL_MS = 1500;
const HIDDEN_POLL_MS = 10_000;
const LIVE_POLL_MS = 15_000; // safety net while Realtime is connected
const FULL_REFRESH_MS = 30_000; // picks up who's online even when nothing else changed

const storageKey = (code: string) => `qp:id:${code}`;

export function saveIdentity(code: string, identity: Identity) {
  try {
    localStorage.setItem(storageKey(code), JSON.stringify(identity));
  } catch {
    // Private mode: the user stays in the room until they close the tab.
  }
}

function loadIdentity(code: string): Identity | null {
  try {
    const raw = localStorage.getItem(storageKey(code));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.participantId && parsed?.secret ? parsed : null;
  } catch {
    return null;
  }
}

function clearIdentity(code: string) {
  try {
    localStorage.removeItem(storageKey(code));
  } catch {}
}

export function useRoom(code: string) {
  const [status, setStatus] = useState<Status>("loading");
  const [room, setRoom] = useState<PokerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("connecting");

  const identity = useRef<Identity | null>(null);
  const version = useRef(0);
  const realtimeUp = useRef(false);
  const lastFull = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const failures = useRef(0);

  const headers = useCallback((): HeadersInit => {
    const id = identity.current;
    return id ? { "x-qp-participant": id.participantId, "x-qp-secret": id.secret } : {};
  }, []);

  const apply = useCallback(
    (data: { version: number; room: PokerView }) => {
      if (data.version < version.current) return;
      version.current = data.version;
      setRoom(data.room);
      if (identity.current && !data.room.me) {
        // Our seat is gone (removed, or the room was recreated).
        identity.current = null;
        clearIdentity(code);
      }
      setStatus(data.room.me ? "ready" : "join");
    },
    [code],
  );

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const full = Date.now() - lastFull.current > FULL_REFRESH_MS || version.current === 0;
      const url = full ? `/api/rooms/${code}` : `/api/rooms/${code}?since=${version.current}`;
      const res = await fetch(url, { headers: headers(), cache: "no-store" });
      failures.current = 0;
      if (full) lastFull.current = Date.now();
      if (res.status === 204) return;
      if (res.status === 404) {
        setStatus("missing");
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
      apply(await res.json());
      setMode((m) => (realtimeUp.current ? "live" : m === "offline" || m === "connecting" ? "compatible" : m));
    } catch {
      failures.current += 1;
      if (failures.current >= 3) setMode("offline");
    } finally {
      inFlight.current = false;
    }
  }, [code, headers, apply]);

  // Polling loop: fast when Realtime isn't available, slow when it is.
  useEffect(() => {
    identity.current = loadIdentity(code);
    let stopped = false;
    const tick = async () => {
      await refresh();
      if (stopped) return;
      const delay = realtimeUp.current ? LIVE_POLL_MS : document.hidden ? HIDDEN_POLL_MS : FAST_POLL_MS;
      timer.current = setTimeout(tick, delay);
    };
    tick();
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, refresh]);

  // Optional Realtime ping. If a network blocks it, polling carries on alone.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let cleanup = () => {};
    let cancelled = false;
    import("@supabase/supabase-js").then(({ createClient }) => {
      if (cancelled) return;
      const client = createClient(url, key, { auth: { persistSession: false } });
      const channel = client
        .channel(`room:${code}`)
        .on("broadcast", { event: "changed" }, ({ payload }) => {
          if (typeof payload?.version === "number" && payload.version > version.current) refresh();
        })
        .subscribe((state) => {
          realtimeUp.current = state === "SUBSCRIBED";
          setMode(realtimeUp.current ? "live" : "compatible");
          if (realtimeUp.current) refresh();
        });
      cleanup = () => {
        realtimeUp.current = false;
        client.removeChannel(channel);
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [code, refresh]);

  const join = useCallback(
    async (name: string, role: "voter" | "observer") => {
      setError(null);
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't join the room. Try again.");
        return false;
      }
      identity.current = { participantId: data.participantId, secret: data.secret };
      saveIdentity(code, identity.current);
      apply(data);
      return true;
    },
    [code, apply],
  );

  const act = useCallback(
    async (action: PokerAction) => {
      setError(null);
      const res = await fetch(`/api/rooms/${code}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(action),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That didn't work. Try again.");
        if (res.status === 401) {
          identity.current = null;
          clearIdentity(code);
          setStatus("join");
        }
        return false;
      }
      if (action.type === "leave") {
        identity.current = null;
        clearIdentity(code);
      }
      apply(data);
      return true;
    },
    [code, headers, apply],
  );

  return { status, room, error, setError, mode, join, act };
}
