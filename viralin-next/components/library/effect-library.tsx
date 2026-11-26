"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Captions,
  ChevronRight,
  CreditCard,
  LoaderCircle,
  Moon,
  MousePointerClick,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  ToggleLeft,
  Type,
  WavesHorizontal,
  Hand,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EffectCard } from "./effect-card";
import { EffectDialog } from "./effect-dialog";
import { ALL_EFFECTS, CATEGORIES } from "@/lib/effects";
import type { CssEffect } from "@/lib/effects/types";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/nadzirmuhamad5/viralin";

/* Ikon brand GitHub sudah dihapus dari lucide-react ≥1.0 — pakai SVG octicon. */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  captions: Captions,
  buttons: MousePointerClick,
  loaders: LoaderCircle,
  text: Type,
  backgrounds: WavesHorizontal,
  hover: Hand,
  cards: CreditCard,
  forms: ToggleLeft,
};

export function EffectLibrary() {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CssEffect | null>(null);

  const onSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) setCategory("all");
  };

  const counts = useMemo(
    () =>
      ALL_EFFECTS.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + 1;
        return acc;
      }, {}),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_EFFECTS.filter((e) => {
      // search runs globally across every category
      if (q) {
        const hay = `${e.name} ${e.group ?? ""} ${e.description} ${e.tags.join(" ")} ${e.category}`.toLowerCase();
        return hay.includes(q);
      }
      return category === "all" || e.category === category;
    });
  }, [category, query]);

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => filtered.some((e) => e.category === c.id)),
    [filtered]
  );

  return (
    <div className="lab-root flex min-h-screen flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href="/" title="Kembali ke Viralin" className="flex items-center gap-2.5" aria-label="Viralin CSS Lab — kembali ke beranda Viralin">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400 font-display text-xl text-zinc-950 shadow-[0_6px_18px_-6px_rgba(251,191,36,0.7)]">
              V
            </span>
            <span className="font-display text-lg leading-none tracking-wide">
              VIRALIN
              <span className="ml-1.5 text-amber-500">CSS LAB</span>
            </span>
          </a>

          <div className="relative ml-auto hidden w-full max-w-xs sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari efek… (karaoke, neon, glitch)"
              className="h-9 rounded-full bg-muted/60 pl-9 text-sm"
              aria-label="Cari efek CSS"
            />
          </div>

          <ThemeToggle />
          <Button asChild variant="outline" size="icon" className="size-9 rounded-full" aria-label="Repo GitHub viralin">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <GithubIcon className="size-4" />
            </a>
          </Button>
        </div>
        {/* mobile search */}
        <div className="border-t px-4 py-2 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari efek…"
              className="h-9 rounded-full bg-muted/60 pl-9 text-sm"
              aria-label="Cari efek CSS"
            />
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 left-1/4 size-72 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute -bottom-28 right-1/5 size-80 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(251,191,36,0.07)_1px,transparent_1.4px)] [background-size:22px_22px]" />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <Badge className="mb-4 gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-zinc-950 hover:bg-amber-400">
            <Sparkles className="size-3.5" /> Ported dari repo nadzirmuhamad5/viralin
          </Badge>
          <h1 className="font-display max-w-3xl text-4xl leading-[1.05] tracking-wide sm:text-6xl">
            CSS EFFECT
            <span className="text-amber-500"> LIBRARY</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Kumpulan efek CSS lengkap dengan <strong className="text-foreground">demo online yang jalan langsung</strong> dan{" "}
            <strong className="text-foreground">kode CSS siap salin</strong> — termasuk{" "}
            <strong className="text-amber-500">30 preset caption karaoke Viralin</strong> (klipers.pro-style) yang di-port
            dari ASS word-level ke CSS murni. Tanpa JavaScript, tanpa dependency.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5 text-[13px]">
            <StatChip>{ALL_EFFECTS.length} efek</StatChip>
            <StatChip>{CATEGORIES.length} kategori</StatChip>
            <StatChip>100% CSS</StatChip>
            <StatChip>0 dependency</StatChip>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300"
              onClick={() => document.getElementById("effects")?.scrollIntoView({ behavior: "smooth" })}
            >
              Jelajahi efek <ChevronRight className="size-4" />
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full font-semibold">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GithubIcon className="size-4" /> Repo aslinya
              </a>
            </Button>
          </div>

          <p className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
            <span className="font-bold text-foreground">Cara pakai:</span>
            <span>1. Pilih efek</span>
            <ChevronRight className="size-3.5" />
            <span>2. Copy CSS-nya</span>
            <ChevronRight className="size-3.5" />
            <span>3. Paste ke project-mu. Selesai.</span>
          </p>
        </div>
      </section>

      {/* ── Mobile category chips ──────────────────────────── */}
      <div className="border-b lg:hidden">
        <div className="scrollbar-thin flex gap-2 overflow-x-auto px-4 py-3">
          <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label={`Semua (${ALL_EFFECTS.length})`} />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
              label={`${c.name} (${counts[c.id] ?? 0})`}
              accent={c.accent}
            />
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + grid ───────────────────────────── */}
      <main id="effects" className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:py-10">
        <aside className="hidden w-56 shrink-0 lg:block" aria-label="Kategori efek">
          <nav className="sticky top-24 space-y-1">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <SlidersHorizontal className="size-3.5" /> Kategori
            </p>
            <SidebarItem active={category === "all"} onClick={() => setCategory("all")} label="Semua efek" count={ALL_EFFECTS.length} />
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.id] ?? Sparkles;
              return (
                <SidebarItem
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                  label={c.name}
                  count={counts[c.id] ?? 0}
                  icon={<Icon className="size-4" />}
                />
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-12">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <p className="font-display text-2xl tracking-wide">TIDAK ADA HASIL</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Coba kata kunci lain — mis. <em>karaoke</em>, <em>neon</em>, <em>glass</em>, atau <em>loader</em>.
              </p>
            </div>
          ) : null}

          {visibleCategories.map((c) => {
            const items = filtered.filter((e) => e.category === c.id);
            const Icon = CATEGORY_ICONS[c.id] ?? Sparkles;
            return (
              <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                <div className="mb-5 flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${c.accent}1f`, color: c.accent }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 id={`cat-${c.id}`} className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
                      {c.name}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        {items.length}
                      </span>
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{c.tagline}</p>
                  </div>
                </div>
                <div className={cn("grid gap-5", c.id === "captions" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3")}>
                  {items.map((e) => (
                    <EffectCard key={e.id} effect={e} onOpen={setSelected} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* ── Footer (sticky bottom) ─────────────────────────── */}
      <footer className="mt-auto border-t bg-muted/40 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-[13px] text-muted-foreground sm:flex-row sm:px-6">
          <p>
            <span className="font-display tracking-wide text-foreground">VIRALIN CSS LAB</span> — ported dari{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-semibold text-amber-500 underline-offset-2 hover:underline">
              nadzirmuhamad5/viralin
            </a>
            , 30 preset caption ASS → CSS murni.
          </p>
          <p className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" /> Semua demo berjalan otomatis tanpa JavaScript.
          </p>
        </div>
      </footer>

      <EffectDialog effect={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

/* ── small pieces ─────────────────────────────────────────── */

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-card px-3 py-1 font-semibold text-foreground/90 shadow-sm">{children}</span>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active ? "border-amber-400 bg-amber-400 text-zinc-950" : "bg-card text-muted-foreground hover:text-foreground"
      )}
      style={!active && accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
    >
      {label}
    </button>
  );
}

function SidebarItem({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors",
        active ? "bg-amber-400/15 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon ? <span className={active ? "text-amber-500" : "text-muted-foreground/70"}>{icon}</span> : null}
      <span className="flex-1 truncate">{label}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold">{count}</span>
    </button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // hydration-safe "mounted" flag without setState-in-effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-9 rounded-full"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ganti tema terang/gelap"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
