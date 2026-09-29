"use client";

import { useSyncExternalStore } from "react";
import { QuizAnswers } from "./types";

/**
 * Client-side run state: quiz answers, whether the rules were seen, and guest
 * status. Kept in localStorage so a guest keeps their progress without an
 * account (the spec requires the guest path to work end to end).
 *
 * Read through useSyncExternalStore rather than useState+useEffect so server
 * and client agree on the first paint and no render cascade is triggered.
 */

const KEY = "flow_state_v1";

export interface FlowState {
  quiz: QuizAnswers;
  quizCompleted: boolean;
  rulesSeen: boolean;
  guest: boolean;
}

const EMPTY: FlowState = {
  quiz: {},
  quizCompleted: false,
  rulesSeen: false,
  guest: false,
};

let cache: FlowState = EMPTY;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

function read(): FlowState {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  // Re-parse only when the stored string actually changed — useSyncExternalStore
  // compares snapshots by identity and would loop on a fresh object each call.
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as FlowState) } : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

function write(next: FlowState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  cacheRaw = null; // force re-read on next snapshot
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useFlowState(): FlowState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function setQuizAnswer<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
  const s = read();
  write({ ...s, quiz: { ...s.quiz, [key]: value } });
}

export function completeQuiz() {
  write({ ...read(), quizCompleted: true });
}

export function markRulesSeen() {
  write({ ...read(), rulesSeen: true });
}

export function continueAsGuest() {
  write({ ...read(), guest: true });
}

export function resetFlow() {
  write(EMPTY);
}

/** Non-hook read, for event handlers and route guards. */
export function readFlowState(): FlowState {
  return read();
}
