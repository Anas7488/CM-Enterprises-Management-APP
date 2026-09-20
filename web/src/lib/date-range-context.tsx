"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// ─── Default: last 60 days ─────────────────────────────────────────────────
const toISO = (d: Date) => d.toISOString().split("T")[0];

function getDefaults() {
  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 60);
  return { start: toISO(prior), end: toISO(today) };
}

// ─── Context types ─────────────────────────────────────────────────────────
interface DateRangeContextValue {
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  resetRange: () => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const defaults = getDefaults();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const resetRange = () => {
    const d = getDefaults();
    setStartDate(d.start);
    setEndDate(d.end);
  };

  return (
    <DateRangeContext.Provider value={{ startDate, endDate, setStartDate, setEndDate, resetRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within <DateRangeProvider>");
  return ctx;
}

// ─── Generic filter helper (use in any page) ──────────────────────────────
export function filterByRange<T extends { date: string }>(
  data: T[],
  start: string,
  end: string
): T[] {
  if (!start && !end) return data;
  const s = start ? new Date(start) : new Date("1970-01-01");
  const e = end ? new Date(end) : new Date("2099-12-31");
  return data.filter((item) => {
    const d = new Date(item.date);
    return d >= s && d <= e;
  });
}
