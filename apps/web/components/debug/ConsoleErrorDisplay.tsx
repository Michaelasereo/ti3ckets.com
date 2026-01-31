'use client';

import { useEffect, useState } from 'react';

type LogEntry = {
  type: 'error' | 'warn' | 'unhandled';
  message: string;
  stack?: string;
  time: string;
};

export default function ConsoleErrorDisplay() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const onError = (event: ErrorEvent) => {
      setEntries((prev) => [
        ...prev.slice(-19),
        {
          type: 'error',
          message: event.message || String(event.error),
          stack: event.error?.stack,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const message =
        event.reason?.message ?? event.reason?.toString?.() ?? String(event.reason);
      const stack = event.reason?.stack;
      setEntries((prev) => [
        ...prev.slice(-19),
        {
          type: 'unhandled',
          message: `Unhandled rejection: ${message}`,
          stack,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    };

    const origConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      setEntries((prev) => [
        ...prev.slice(-19),
        {
          type: 'error',
          message: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
          time: new Date().toLocaleTimeString(),
        },
      ]);
      origConsoleError.apply(console, args);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
      console.error = origConsoleError;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] max-w-md rounded-lg border border-red-300 bg-red-50 shadow-lg"
      aria-label="Console errors"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-red-800"
      >
        <span>
          Console errors ({entries.length})
        </span>
        <span className="text-lg">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="max-h-60 overflow-y-auto border-t border-red-200 px-3 py-2 text-xs">
          {entries.length === 0 ? (
            <li className="py-2 text-red-600">No errors yet.</li>
          ) : null}
          {entries.map((e, i) => (
            <li key={`${e.time}-${i}`} className="mb-2 border-b border-red-100 pb-2 last:border-0">
              <span className="font-medium text-red-700">[{e.time}] {e.type}</span>
              <pre className="mt-1 whitespace-pre-wrap break-all text-red-900">
                {e.message}
              </pre>
              {e.stack && (
                <pre className="mt-1 whitespace-pre-wrap break-all text-red-600 text-[10px]">
                  {e.stack}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
