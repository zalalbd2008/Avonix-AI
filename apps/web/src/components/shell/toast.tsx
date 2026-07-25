"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * The prototype's toast: navy pill, bottom centre, teal dot, gone after 2.6s.
 *
 * In the prototype every action was a toast, because nothing was real. Here it
 * is for things that genuinely happen but leave the page looking unchanged —
 * a copied link, a rotated key. Anything that changes the data should change
 * the screen instead; a toast is not a substitute for the result.
 */
const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(""), 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={say}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-[26px] left-1/2 z-60 flex -translate-x-1/2 items-center gap-2.5 rounded-[9px] bg-navy px-[18px] py-[11px] text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(11,30,58,.35)]"
        >
          <span className="size-2 shrink-0 rounded-full bg-ok" />
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
