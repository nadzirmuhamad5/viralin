/* Tes mesin remix: scene detect + plan windows + remixClip dgn sticker. */
import { detectScenes, planWindows, remixClip } from "../lib/tools/ugc-affiliate";

const log = (l: string) => console.log(l);
const src = "/home/z/my-project/data/fb89aee0/ref.mp4";
const sticker = "/home/z/my-project/data/fb89aee0/avatar.png";

const scenes = await detectScenes(src, log);
console.log("scenes:", JSON.stringify(scenes));

const segDurs = [4.2, 3.8, 5.0, 3.5];
const windows = planWindows(scenes, segDurs);
console.log("windows:", JSON.stringify(windows));

for (let i = 0; i < windows.length; i++) {
  await remixClip({
    ref: src,
    s: windows[i].s,
    e: windows[i].e,
    dur: segDurs[i],
    out: `/tmp/remix-seg-${i + 1}.mp4`,
    sticker: i % 2 === 1 ? sticker : undefined,
  });
  console.log(`seg ${i + 1} ok`);
}

// concat cepat untuk sanity check
import { execSync } from "child_process";
execSync(
  `ffmpeg -y -v error ` +
    windows.map((_, i) => `-i /tmp/remix-seg-${i + 1}.mp4`).join(" ") +
    ` -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1[v]" -map "[v]" /tmp/remix-all.mp4`
);
const d = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/remix-all.mp4`).toString().trim();
const res = execSync(`ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate -of csv=p=0 /tmp/remix-all.mp4`).toString().trim();
console.log("hasil akhir:", d, "s ·", res);
