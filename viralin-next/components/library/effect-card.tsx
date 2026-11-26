"use client";

import { CodeXml } from "lucide-react";
import type { CssEffect } from "@/lib/effects/types";
import { cn } from "@/lib/utils";

/**
 * Renders an effect's demo inside a fixed stage.
 * The stage provides the dark backdrop; the effect css is injected via <style>.
 */
export function EffectStage({
  effect,
  className,
  frame,
}: {
  effect: CssEffect;
  className?: string;
  frame?: boolean;
}) {
  return (
    <div
      className={cn("fx-stage relative", className)}
      data-effect={effect.id}
      aria-label={`Demo efek ${effect.name}`}
    >
      <style dangerouslySetInnerHTML={{ __html: effect.css }} />
      {frame ? (
        <div className="cap-phone pointer-events-none absolute inset-0 m-auto aspect-[9/16] h-full max-w-full overflow-hidden rounded-[26px] border border-zinc-700/80 shadow-2xl">
          <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: effect.demoHtml }} />
          <div className="absolute left-1/2 top-2.5 h-4 w-20 -translate-x-1/2 rounded-full bg-black/80" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: effect.demoHtml }} />
      )}
    </div>
  );
}

export function EffectCard({ effect, onOpen }: { effect: CssEffect; onOpen: (e: CssEffect) => void }) {
  const open = () => onOpen(effect);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_40px_-18px_rgba(251,191,36,0.25)]">
      {/*
        Pembungkus demo memakai div role="button" (bukan <button>) karena demo HTML
        beberapa efek — khususnya kategori Buttons — memang berisi elemen <button>.
        <button> di dalam <button> adalah nesting invalid yang memicu hydration error.
      */}
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className="relative block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-amber-400"
        aria-label={`Buka kode efek ${effect.name}`}
      >
        <EffectStage effect={effect} className="h-[210px] w-full rounded-none" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950">
            <CodeXml className="size-3.5" /> Lihat kode CSS
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-bold tracking-tight">{effect.name}</h3>
          {effect.group ? (
            <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
              {effect.group}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{effect.description}</p>
      </div>
    </article>
  );
}
