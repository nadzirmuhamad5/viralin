import { STACK } from "@/lib/site";

export default function TentangPage() {
  return (
    <section className="wrap sec">
      <h1 className="sec-h">Tentang Viralin (Demo)</h1>
      <p className="sec-sub">
        Viralin adalah demo edukasi yang meniru alur produk klipers.pro memakai stack 100% gratis —
        semuanya dieksekusi sungguhan di server ini, bukan mockup. Kode sumber lengkap ada di repo.
      </p>
      <div className="panel" style={{ marginTop: 0 }}>
        <table className="stacktbl">
          <thead>
            <tr>
              <th>Bagian</th>
              <th>Teknologi</th>
              <th>Peran</th>
            </tr>
          </thead>
          <tbody>
            {STACK.map(([bagian, tech, peran]) => (
              <tr key={bagian}>
                <td>{bagian}</td>
                <td>
                  <code>{tech}</code>
                </td>
                <td className="dim">{peran}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="grouph">Catatan jujur</h2>
      <p className="mdesc">
        YouTube/TikTok sering memblokir IP data center (bot-check, PO token, rate limit). Dari
        server ini, URL file .mp4 langsung paling andal; untuk YouTube, gunakan cookies.txt (paste
        di form) dan — bila masih diblokir — proxy residential via <code>VL_PROXY</code>. 3 tool
        (Split Cam, Clone Suara, Auto Upload) butuh infrastruktur berbayar dan sengaja tidak
        dipalsukan.
      </p>
    </section>
  );
}
