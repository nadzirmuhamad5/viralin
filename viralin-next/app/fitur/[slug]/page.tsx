import Link from "next/link";
import { notFound } from "next/navigation";
import { TOOL_BY_ID } from "@/lib/tools";
import ToolRunner from "@/components/ToolRunner";
import ToolHistory from "@/components/ToolHistory";

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = TOOL_BY_ID[slug];
  if (!t) notFound();
  return (
    <section className="wrap sec">
      <p className="linkmore" style={{ marginTop: 0 }}>
        <Link href="/fitur">← Semua fitur</Link>
      </p>
      <h1 className="sec-h">
        <span className="tic" style={{ fontSize: "1.6em", marginRight: 8 }}>
          {t.icon}
        </span>
        {t.name}
        {t.badge && (
          <span className={`badge ${t.badge === "PRO" ? "pro" : "new"}`} style={{ verticalAlign: "middle" }}>
            {t.badge}
          </span>
        )}
      </h1>
      <p className="sec-sub">{t.desc}</p>
      {t.live ? (
        <ToolRunner tool={t} />
      ) : (
        <div className="panel">
          <p className="mdesc">
            🔒 Tool ini butuh infrastruktur berbayar/credential platform (model CV ber-GPU, training
            suara, atau OAuth YouTube/TikTok/IG) — demi jujur, tidak dipalsukan di demo gratis ini.
          </p>
        </div>
      )}
      <ToolHistory toolId={t.id} />
    </section>
  );
}
