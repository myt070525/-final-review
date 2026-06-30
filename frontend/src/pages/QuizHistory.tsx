import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getQuizHistory } from "../services/api";
import { useToast } from "../components/Toast";
import { ChevronRight, Clock, TrendingUp, Award, Target, BarChart3 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";

interface HistoryItem { id: number; date: string; subject_id: number; subject_name: string; total_questions: number; correct_count: number; accuracy: number; time_seconds: number; }

export default function QuizHistory() {
  const toast = useToast();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizHistory({ page: "1", page_size: "50" })
      .then((d) => setItems(d.items))
      .catch((e: any) => toast.error(e.message || "加载历史失败"))
      .finally(() => setLoading(false));
  }, [toast]);

  // 统计数据
  const stats = useMemo(() => {
    if (items.length === 0) return null;
    const total = items.length;
    const avgAcc = items.reduce((s, x) => s + x.accuracy, 0) / total;
    const bestAcc = Math.max(...items.map((x) => x.accuracy));
    const totalTime = items.reduce((s, x) => s + x.time_seconds, 0);
    const totalQ = items.reduce((s, x) => s + x.total_questions, 0);
    return { total, avgAcc, bestAcc, totalTime, totalQ };
  }, [items]);

  // 趋势数据：按时间正序（旧→新），只取最近 20 次
  const trendData = useMemo(() => {
    return items.slice(0, 20).reverse().map((it, i) => ({
      idx: i + 1,
      accuracy: it.accuracy,
      date: new Date(it.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
    }));
  }, [items]);

  // 题量分布（按区间）
  const rangeData = useMemo(() => {
    const buckets = [
      { name: "0-59%", range: [0, 59], count: 0, color: "#f87171" },
      { name: "60-79%", range: [60, 79], count: 0, color: "#fbbf24" },
      { name: "80-89%", range: [80, 89], count: 0, color: "#818cf8" },
      { name: "90-100%", range: [90, 100], count: 0, color: "#34d399" },
    ];
    for (const it of items) {
      for (const b of buckets) {
        if (it.accuracy >= b.range[0] && it.accuracy <= b.range[1]) { b.count++; break; }
      }
    }
    return buckets;
  }, [items]);

  const fmtTime = (s: number) => s >= 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s}秒`;

  return (
    <div>
      <div className="mb-10">
        <p className="section-overline mb-2">Records</p>
        <h1 className="text-display" style={{ color: "var(--text)" }}>练习历史</h1>
        {!loading && items.length > 0 && <p className="text-caption mt-3">{items.length} 次练习记录</p>}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "var(--s-5) var(--s-6)", animation: `fade-up var(--slow) var(--ease) ${i * 0.04}s both` }}>
              <div className="skeleton" style={{ height: "1.25rem", width: "40%", marginBottom: "var(--s-2)" }} />
              <div className="skeleton" style={{ height: "0.75rem", width: "25%" }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <Clock className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>暂无记录</p>
          <p className="text-caption">去学科中开始练习吧</p>
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          {stats && (
            <div className="grid mb-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--s-3)" }}>
              <div className="card" style={{ padding: "var(--s-5)" }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--text-muted)" }}>
                  <Target className="w-3.5 h-3.5" /><span className="section-overline">平均正确率</span>
                </div>
                <div className="stat-number text-3xl" style={{ color: stats.avgAcc >= 80 ? "var(--success)" : stats.avgAcc >= 60 ? "var(--accent)" : "var(--error)" }}>
                  {stats.avgAcc.toFixed(1)}<span className="text-base">%</span>
                </div>
              </div>
              <div className="card" style={{ padding: "var(--s-5)" }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--text-muted)" }}>
                  <Award className="w-3.5 h-3.5" /><span className="section-overline">最佳成绩</span>
                </div>
                <div className="stat-number text-3xl" style={{ color: "var(--success)" }}>
                  {stats.bestAcc}<span className="text-base">%</span>
                </div>
              </div>
              <div className="card" style={{ padding: "var(--s-5)" }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--text-muted)" }}>
                  <TrendingUp className="w-3.5 h-3.5" /><span className="section-overline">练习次数</span>
                </div>
                <div className="stat-number text-3xl" style={{ color: "var(--text)" }}>
                  {stats.total}<span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>次</span>
                </div>
              </div>
              <div className="card" style={{ padding: "var(--s-5)" }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--text-muted)" }}>
                  <Clock className="w-3.5 h-3.5" /><span className="section-overline">累计练习</span>
                </div>
                <div className="stat-number text-3xl" style={{ color: "var(--accent)" }}>
                  {stats.totalQ}<span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>题</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>用时 {fmtTime(stats.totalTime)}</p>
              </div>
            </div>
          )}

          {/* 趋势图 */}
          {trendData.length >= 2 && (
            <div className="card mb-8" style={{ padding: "var(--s-6)" }}>
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <p className="section-overline" style={{ color: "var(--accent)" }}>正确率趋势 · 最近 {trendData.length} 次</p>
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="idx" tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border)" />
                    <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", fontSize: 12 }}
                      labelStyle={{ color: "var(--text-muted)" }}
                      itemStyle={{ color: "var(--text)" }}
                      labelFormatter={(l) => `第 ${l} 次`}
                      formatter={(v: any) => [`${v}%`, "正确率"]}
                    />
                    <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="3 3" strokeOpacity={0.4} />
                    <ReferenceLine y={80} stroke="#34d399" strokeDasharray="3 3" strokeOpacity={0.4} />
                    <Line type="monotone" dataKey="accuracy" stroke="var(--accent)" strokeWidth={2} dot={{ fill: "var(--accent)", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 2, background: "#fbbf24", display: "inline-block" }} />及格线 60%
                </span>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 2, background: "#34d399", display: "inline-block" }} />优秀线 80%
                </span>
              </div>
            </div>
          )}

          {/* 成绩分布柱状图 */}
          {rangeData.some((b) => b.count > 0) && (
            <div className="card mb-8" style={{ padding: "var(--s-6)" }}>
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <p className="section-overline" style={{ color: "var(--accent)" }}>成绩分布</p>
              </div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={rangeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border)" />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border)" />
                    <Tooltip
                      cursor={{ fill: "var(--bg-hover)" }}
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", fontSize: 12 }}
                      labelStyle={{ color: "var(--text-muted)" }}
                      itemStyle={{ color: "var(--text)" }}
                      formatter={(v: any) => [`${v} 次`, "练习数"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {rangeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 历史记录列表 */}
          <div className="mb-4">
            <p className="section-overline mb-1">All Records</p>
            <h2 className="text-headline" style={{ color: "var(--text)" }}>全部记录</h2>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <Link key={item.id} to={`/quiz/${item.id}/result`} className="card-interactive no-underline flex items-center justify-between"
                style={{ padding: "var(--s-5) var(--s-6)", animation: `fade-up var(--slow) var(--ease) ${i * 0.04}s both` }}>
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="tag tag-accent">{item.subject_name}</span>
                    <span className="mono-label" style={{ color: "var(--text-muted)" }}>{new Date(item.date).toLocaleString()}</span>
                    <span className="stat-number text-2xl" style={{ color: item.accuracy >= 80 ? "var(--success)" : item.accuracy >= 60 ? "var(--accent)" : "var(--error)" }}>{item.accuracy}%</span>
                  </div>
                  <div className="flex items-center gap-5 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{item.correct_count}/{item.total_questions} 正确</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{fmtTime(item.time_seconds)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
