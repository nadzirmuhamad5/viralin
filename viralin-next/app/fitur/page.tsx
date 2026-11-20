import Link from "next/link";
import { TOOLS } from "@/lib/tools";

const GROUPS = ["Kliping AI", "Editor & Komposisi", "AI Generatif", "SEO & Analitik", "Distribusi"] as const;

export default function FiturPage() {
  return (
    <section className="wrap sec">
      <h1 className="sec-h">Semua Fitur (20 tool)</h1>
      <p className="sec-sub">
        17 tool benar-benar jalan di server ini (stack gratis) — 3 ditandai PRO butuh infra
        berbayar dan tidak dipalsukan. Klik kartu untuk buka halaman tool-nya.
      </p>
      {GROUPS.map((g) => (
        <div key={g}>
          <h2 className="grouph">{g}</h2>
          <div className="toolgrid">
            {TOOLS.filter((t) => t.group === g).map((t) => (
              <Link className="tcard" key={t.id} href={`/fitur/${t.id}`}>
                <span className="tline">
                  <span className="tic">{t.icon}</span>
                  <b>{t.name}</b>
                  {t.badge && (
                    <span className={`badge ${t.badge === "PRO" ? "pro" : "new"}`}>{t.badge}</span>
                  )}
                </span>
                <span className="tdesc">{t.desc}</span>
                {!t.live && <span className="tdesc dim">🔒 belum aktif di demo</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
