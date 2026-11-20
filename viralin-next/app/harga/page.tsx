import { HARGA, FAQ_HARGA } from "@/lib/site";

export default function HargaPage() {
  return (
    <section className="wrap sec">
      <h1 className="sec-h">Harga &amp; Tier</h1>
      <p className="sec-sub">
        Angka &amp; tier di-capture langsung dari klipers.pro (18 Nov 2026) sebagai perbandingan.
        Demo ini gratis, tanpa login, tanpa pembayaran — semua tier dibuka penuh.
      </p>
      <div className="plans">
        {HARGA.map((p) => (
          <div className={`plan${p.hot ? " hot" : ""}`} key={p.nama}>
            {p.hot && <span className="hot-tag">PALING LARIS</span>}
            <h3>{p.nama}</h3>
            <span className="tag">{p.tag}</span>
            <span className="price-old">{p.old}</span>
            <span className="price">
              {p.now}
              <span className="per">{p.per}</span>
            </span>
            <span className="save">{p.save}</span>
            <ul>
              {p.fitur.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="paynote">
        <span className="paychip">💳 QRIS</span>
        <span className="paychip">🏦 Transfer</span>
        <span className="paychip">📱 e-Wallet</span>
        <span>· di produk asli, pembayaran pakai QRIS — demo ini tidak memungutkan apa pun.</span>
      </div>
      <section className="sec">
        <h2 className="sec-h">Pertanyaan soal harga</h2>
        {FAQ_HARGA.map(([q, a]) => (
          <details className="faq" key={q}>
            <summary>{q}</summary>
            <div className="ans">{a}</div>
          </details>
        ))}
      </section>
    </section>
  );
}
