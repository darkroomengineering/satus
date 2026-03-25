import cn from "clsx";
import { splitText as animeSplitText } from "animejs";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import s from "./split-text.module.css";

// @refresh reset

interface SplitResult {
  chars: HTMLElement[];
  words: HTMLElement[];
  lines: HTMLElement[];
  revert: () => void;
}

interface SplitTextProps {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  willAppear?: boolean;
  type?: "lines" | "words" | "chars";
  mask?: boolean;
}

export interface SplitTextRef {
  getNode: () => HTMLElement | null;
  getSplitText: () => SplitResult | null;
  splittedText: SplitResult | null;
}

export function SplitText({
  ref,
  children,
  className,
  as: Tag = "span",
  willAppear = false,
  type = "words",
  mask = true,
}: SplitTextProps & {
  ref?: React.RefObject<SplitTextRef | null> | ((node: SplitTextRef | null) => void);
}) {
  const splitRef = useRef<HTMLDivElement>(null);
  const splittedRef = useRef<SplitResult | null>(null);
  const [splittedText, setSplittedText] = useState<SplitResult | null>(null);

  useEffect(() => {
    function findDeepestElement(element: HTMLElement | null): HTMLElement | null {
      if (!element) return null;

      if (element.children.length !== element.childNodes.length) {
        return element;
      }

      if (element.children.length === 1) {
        return findDeepestElement(element.children[0] as HTMLElement);
      }

      return element as HTMLElement;
    }

    splittedRef.current?.revert();

    const target = findDeepestElement(splitRef.current);
    if (!target) return;

    const splitOptions: Record<string, boolean | { wrap: string }> = {};
    if (type === "chars" || type === "words") {
      splitOptions.words = mask ? { wrap: "clip" } : true;
    }
    if (type === "chars") {
      splitOptions.chars = true;
    }
    if (type === "lines") {
      splitOptions.lines = true;
    }

    const result = animeSplitText(target, splitOptions) as unknown as SplitResult;
    splittedRef.current = result;
    setSplittedText(result);

    return () => {
      result.revert();
    };
  }, [type, mask]);

  useImperativeHandle(
    ref,
    () => ({
      getSplitText: () => splittedRef.current,
      getNode: () => splitRef.current,
      splittedText,
    }),
    [splittedText],
  );

  return (
    <Tag
      className={cn(s.splitText, className)}
      ref={splitRef}
      style={{
        opacity: willAppear ? 0 : 1,
      }}
    >
      {children}
    </Tag>
  );
}
