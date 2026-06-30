import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWrongKnowledgeStats } from "../services/api";
import { useToast } from "../components/Toast";
import { ArrowLeft, AlertTriangle, TrendingDown } from "lucide-react";

interface WeaknessItem { node_id: number; title: string; chapter_id: number; wrong_count: number; }

export default function WeaknessDiagnosis() {
  const toast = useToast();
  const [items, setItems] = useState<WeaknessItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWrongKnowledgeStats()
      .then((d) => setItems(d.items))
      .catch((e: any) => toast.error(e.message || "加载失败"))
      .finally(() => setLoading(false));
  }, [toast]);

  const maxCount = items.length > 0 ? Math.max(...items.map((x) => x.wrong_count)) : 1;

  return (
    <div>
      <Link to="/wrong-questions" className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-6" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft className="w-3 h-3" /> /wrong-questions
      </Link>

      <div className="mb-8">
        <p className="section-overline mb-2">Diagnosis</p>
        <h1 className="text-display" style={{ color: "var(--text)" }}>弱项诊断</h1>
        <p className="text-caption mt-2">按知识点聚合错题次数，定位薄弱环节</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "var(--s-5) var(--s-6)" }}>
              <div className="skeleton" style={{ height: "1.25rem", width: "50%", marginBottom: "var(--s-2)" }} />
              <div className="skeleton" style={{ height: "0.75rem", width: "30%" }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <TrendingDown className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>暂无诊断数据</p>
          <p className="text-caption">先做练习，系统会自动将错题关联到知识点</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const barW = Math.max(5, Math.round((item.wrong_count / maxCount) * 100));
            const severity =
              item.wrong_count >= 5 ? "var(--error)" : item.wrong_count >= 3 ? "var(--accent)" : "var(--warning, #fbbf24)";
            return (
              <div key={item.node_id} className="card" style={{ padding: "var(--s-5) var(--s-6)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: severity }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {item.title}
                    </span>
                  </div>
                  <span className="stat-number text-xl" style={{ color: severity }}>
                    {item.wrong_count}<span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>次</span>
                  </span>
                </div>
                <div className="progress-track" style={{ height: "6px" }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${barW}%`, background: severity, transition: "width var(--slow) var(--ease)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
