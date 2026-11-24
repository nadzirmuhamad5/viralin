#!/usr/bin/env python3
"""Proxy CONNECT+HTTP lokal utk menguji plumbing VL_PROXY end-to-end.

Pakai: python3 scripts/local-proxy.py [port]   (default 8899)
Bukti jalur: VL_PROXY=http://127.0.0.1:<port> + yt-dlp → error berubah dari
"proxy refused" menjadi "bot-check" = trafik lolos lewat proxy sampai YouTube.
"""
import asyncio
import sys

LISTEN = int(sys.argv[1]) if len(sys.argv) > 1 else 8899


async def pipe(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
    try:
        while True:
            data = await r.read(65536)
            if not data:
                break
            w.write(data)
            await w.drain()
    except Exception:
        pass
    finally:
        try:
            w.close()
        except Exception:
            pass


async def handle(cr: asyncio.StreamReader, cw: asyncio.StreamWriter) -> None:
    head = b""
    while b"\r\n\r\n" not in head:
        chunk = await cr.read(1024)
        if not chunk:
            return
        head += chunk
        if len(head) > 65536:
            return
    line = head.split(b"\r\n")[0].decode(errors="replace")
    try:
        if line.startswith("CONNECT"):
            host, _, port = line.split()[1].partition(":")
            print(f"[local-proxy] CONNECT → {host}", flush=True)
            rr, rw = await asyncio.open_connection(host, int(port or 443))
            cw.write(b"HTTP/1.1 200 Connection established\r\n\r\n")
            await cw.drain()
            leftover = head.split(b"\r\n\r\n", 1)[1]
            if leftover:
                rw.write(leftover)
                await rw.drain()
            await asyncio.gather(pipe(cr, rw), pipe(rr, cw))
        else:  # HTTP polos — forward ke Host pada header
            host = ""
            for hl in head.split(b"\r\n"):
                if hl.lower().startswith(b"host:"):
                    host = hl.split(b":", 1)[1].strip().decode()
                    break
            if not host:
                cw.write(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                await cw.drain()
                return
            rr, rw = await asyncio.open_connection(host, 80)
            rw.write(head)
            await rw.drain()
            await asyncio.gather(pipe(cr, rw), pipe(rr, cw))
    except Exception:
        try:
            cw.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
            await cw.drain()
        except Exception:
            pass


async def main() -> None:
    srv = await asyncio.start_server(handle, "127.0.0.1", LISTEN)
    print(f"[local-proxy] CONNECT proxy siap di 127.0.0.1:{LISTEN}", flush=True)
    async with srv:
        await srv.serve_forever()


asyncio.run(main())
