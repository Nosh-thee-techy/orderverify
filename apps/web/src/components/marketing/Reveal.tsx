/**
 * apps/web/src/components/marketing/Reveal.tsx
 * Scroll-triggered entrance for landing sections. Respects reduced motion
 * and stays visible if JavaScript never runs the observer (eager / already on screen).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type RevealVariant = "up" | "left" | "right" | "scale" | "fade";

/**
 * Fade and slide a block in when it enters the viewport.
 *
 * @param props.children - Section content
 * @param props.variant - Direction of the entrance
 * @param props.delay - Extra wait in milliseconds after it becomes visible
 * @param props.eager - Play on first paint (hero / nav), skip the observer
 * @param props.className - Extra classes on the wrapper
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  eager = false,
  className,
}: {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  eager?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || eager) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <div
      ref={ref}
      className={cn("marketing-reveal", visible && "is-visible", className)}
      data-variant={variant}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
