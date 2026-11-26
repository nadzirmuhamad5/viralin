"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Copy-to-clipboard with toast feedback. */
export function useCopy() {
  const { toast } = useToast();
  return useCallback(
    async (text: string, label = "CSS") => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: `${label} tersalin`, description: "Tempel langsung ke project-mu." });
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast({ title: `${label} tersalin` });
      }
    },
    [toast]
  );
}

type CodeBlockProps = {
  code: string;
  language: "css" | "html";
  className?: string;
  maxHeight?: string;
};

/** Lightweight line-based highlighter for the CSS/HTML snippets. */
export function CodeBlock({ code, language, className, maxHeight = "420px" }: CodeBlockProps) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div
      className={cn(
        "code-scroll overflow-auto rounded-xl border border-zinc-800 bg-[#0c0c0f] font-mono text-[12.5px] leading-[1.7]",
        className
      )}
      style={{ maxHeight }}
    >
      <pre className="p-4">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="grid grid-cols-[2.4rem_1fr]">
              <span className="select-none pr-3 text-right text-zinc-600">{i + 1}</span>
              <span className={cn("whitespace-pre-wrap break-words", lineClass(line, language))}>{line || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function lineClass(line: string, language: "css" | "html"): string {
  if (language === "html") {
    const t = line.trim();
    if (t.startsWith("<!--")) return "text-emerald-500/80";
    if (t.startsWith("<")) return "text-amber-300";
    return "text-zinc-300";
  }
  const t = line.trim();
  if (t.startsWith("/*") || t.startsWith("*")) return "text-emerald-500/80";
  if (t.startsWith("@")) return "text-fuchsia-400";
  if (t.endsWith("{")) return "text-amber-300";
  if (t === "}" || t === "},") return "text-zinc-500";
  return "text-zinc-300";
}

/** Small copy button used beside code panels. */
export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCopy();
  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={async () => {
        await copy(text, label ?? "CSS");
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      {copied ? "Tersalin" : `Copy ${label ?? "CSS"}`}
    </Button>
  );
}
