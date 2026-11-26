import type { Metadata } from "next";
import { ThemeProvider } from "@/components/library/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { EffectLibrary } from "@/components/library/effect-library";

export const metadata: Metadata = {
  title: "Viralin CSS Lab — CSS Effect Library dengan Demo Online & Kode CSS",
  description:
    "Kumpulan efek CSS lengkap dengan demo online dan kode siap salin: 30 preset caption karaoke Viralin (klipers.pro-style) ported ke CSS murni, plus buttons, loaders, text effects, backgrounds, hover 3D, cards, dan form controls.",
};

/** Halaman CSS Lab — UI penuh miliknya sendiri (AppShell disembunyikan untuk /lab). */
export default function LabPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <EffectLibrary />
      <Toaster />
    </ThemeProvider>
  );
}
