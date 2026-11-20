export default function KontakPage() {
  return (
    <section className="wrap sec">
      <h1 className="sec-h">Kontak</h1>
      <p className="sec-sub">
        Demo ini berjalan tanpa backend dukungan — tapi kalau menemukan bug atau ingin tanya alur
        teknisnya, ini titik kontaknya.
      </p>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="fields">
          <label className="fld">
            <span>Email</span>
            <input type="text" readOnly value="demo@viralin.local (placeholder — sandbox)" />
          </label>
          <label className="fld">
            <span>Repo kode</span>
            <input type="text" readOnly value="github.com — lihat README untuk link repo demo" />
          </label>
          <p className="mdesc">
            Panduan cepat kena bot-check YouTube: pasang ekstensi browser &quot;Get cookies.txt
            LOCALLY&quot; → buka youtube.com dalam keadaan login → Export → paste isi file di form
            tool (bagian Cookies) → jalankan lagi. Kalau masih diblokir (IP data center), server
            perlu proxy residential: <code>VL_PROXY=http://user:pass@host:port</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
