"use client";

import { Player } from "@remotion/player";
import { MotionStudio } from "@/remotion/MotionStudio";
import {
  motionDefaultProps,
  motionDurationFrames,
  type MotionStudioProps,
} from "@/lib/motion";

/** Live preview Motion Studio di browser — <Player> Remotion dengan props
 *  dari form (judul/bullets/CTA/warna/durasi). Narasi & gambar AI tidak
 *  ikut (itu diisi server saat render) — preview memakai gradien + ikon. */
export default function MotionPreview({ values }: { values: Record<string, string> }) {
  const d = motionDefaultProps();
  const props: MotionStudioProps = {
    ...d,
    judul: values.judul?.trim() || d.judul,
    bullets: values.bullets?.trim() || d.bullets,
    cta: values.cta?.trim() || d.cta,
    warna: (values.warna as MotionStudioProps["warna"]) || d.warna,
    sfx: values.sfx !== "tidak",
    hookdur: values.hookdur || d.hookdur,
    bulletdur: values.bulletdur || d.bulletdur,
    ctadur: values.ctadur || d.ctadur,
  };
  const frames = Math.max(motionDurationFrames(props), 30);
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <p className="mdesc" style={{ marginTop: 0 }}>
        👀 Preview live — berubah mengikuti isi form di atas.
      </p>
      <Player
        component={MotionStudio}
        inputProps={props}
        durationInFrames={frames}
        fps={30}
        compositionWidth={540}
        compositionHeight={960}
        style={{ width: "100%", maxWidth: 300, aspectRatio: "9 / 16", margin: "0 auto", display: "block" }}
        controls
        loop
        acknowledgeRemotionLicense
      />
    </div>
  );
}
