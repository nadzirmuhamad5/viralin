#!/usr/bin/env node
// Server statis kecil dengan dukungan HTTP Range — dipakai E2E klip-ai
// (python http.server tidak mendukung Range → ffmpeg/yt-dlp dapat file parsial).
import { createServer } from "http";
import { createReadStream, statSync } from "fs";
import { join, normalize } from "path";

const ROOT = process.argv[2] || "/tmp/split-test";
const PORT = Number(process.argv[3] || 8081);

createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\.\./g, "");
  const file = join(ROOT, normalize(rel).replace(/^([/\\])+/, ""));
  let st;
  try {
    st = statSync(file);
    if (!st.isFile()) throw new Error("bukan file");
  } catch {
    res.writeHead(404).end("not found");
    return;
  }
  const range = (req.headers.range || "").match(/bytes=(\d*)-(\d*)/);
  const type = file.endsWith(".mp4") ? "video/mp4" : file.endsWith(".wav") ? "audio/wav" : "application/octet-stream";
  if (!range) {
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes" });
    createReadStream(file).pipe(res);
    return;
  }
  let lo = range[1] === "" ? 0 : Number(range[1]);
  let hi = range[2] === "" ? st.size - 1 : Math.min(Number(range[2]), st.size - 1);
  if (isNaN(lo) || lo > hi || lo >= st.size) {
    res.writeHead(416, { "Content-Range": `bytes */${st.size}` }).end();
    return;
  }
  res.writeHead(206, {
    "Content-Type": type, "Content-Length": hi - lo + 1,
    "Content-Range": `bytes ${lo}-${hi}/${st.size}`, "Accept-Ranges": "bytes",
  });
  createReadStream(file, { start: lo, end: hi }).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`range server :${PORT} → ${ROOT}`));
