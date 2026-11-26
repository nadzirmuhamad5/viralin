"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CopyButton, CodeBlock } from "./code-block";
import { EffectStage } from "./effect-card";
import type { CssEffect } from "@/lib/effects/types";

function usageNote(effect: CssEffect): string {
  if (effect.category === "captions") {
    return "Tempel CSS-nya, lalu letakkan .cap-stage di atas foto/video apa pun (posisi relative). Ganti background .cap-stage dengan footage-mu. Semua font di-import otomatis dari Google Fonts.";
  }
  return "Salin CSS-nya, tempel di stylesheet-mu, lalu pakai HTML demo sebagai markup. Kelas sudah unik per efek sehingga aman digabung dengan efek lain.";
}

export function EffectDialog({ effect, open, onOpenChange }: { effect: CssEffect | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<"css" | "html">("css");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-0 sm:max-w-3xl">
        {effect ? (
          <div className="grid gap-0 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Live demo */}
            <div className="relative flex items-center justify-center border-b bg-zinc-950 p-6 md:border-b-0 md:border-r">
              <EffectStage
                effect={effect}
                frame={effect.tall}
                className={effect.tall ? "h-[430px] w-full max-w-[290px]" : "h-[300px] w-full rounded-xl border border-zinc-800"}
              />
            </div>

            {/* Code */}
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight">
                  {effect.name}
                  {effect.group ? (
                    <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                      {effect.group}
                    </Badge>
                  ) : null}
                </DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed">{effect.description}</DialogDescription>
              </DialogHeader>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "css" | "html")} className="gap-3">
                <div className="flex items-center justify-between gap-2">
                  <TabsList className="h-8">
                    <TabsTrigger value="css" className="h-6 px-3 text-xs font-semibold">CSS</TabsTrigger>
                    <TabsTrigger value="html" className="h-6 px-3 text-xs font-semibold">HTML</TabsTrigger>
                  </TabsList>
                  <CopyButton text={tab === "css" ? effect.css : effect.demoHtml} label={tab.toUpperCase()} />
                </div>
                <TabsContent value="css" className="mt-0">
                  <CodeBlock code={effect.css} language="css" maxHeight="340px" />
                </TabsContent>
                <TabsContent value="html" className="mt-0">
                  <CodeBlock code={effect.demoHtml} language="html" maxHeight="340px" />
                </TabsContent>
              </Tabs>

              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">Cara pakai: </span>
                {usageNote(effect)}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {effect.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full text-[10.5px] font-medium">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
