import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getLearningPath, generateGateQuiz } from "../services/api";
import { useToast } from "../components/Toast";
import { ArrowLeft, Lock, Unlock, CheckCircle, Play, BookOpen, Loader2 } from "lucide-react";

interface ChapterStatus {
  chapter_id: number;
  chapter_name: string;
  status: "locked" | "unlocked" | "completed";
  quiz_passed: boolean;
  score: number;
  knowledge_count: number;
  question_count: number;
  completed_at: string | null;
}

export default function JavaLearningPath() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const navigate = useNavigate();
  const [path, setPath] = useState<ChapterStatus[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState<number | null>(null);

  useEffect(() => {
    getLearningPath(Number(id))
      .then((data) => {
        setPath(data.path);
        setSubjectName(data.subject_name);
      })
      .catch((e: any) => toast.error(e.message || "加载学习路径失败"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const handleStartGateQuiz = async (chapterId: number) => {
    setStartingQuiz(chapterId);
    try {
      const data = await generateGateQuiz(Number(id), chapterId);
      navigate(`/quiz/${data.session_id}`, {
        state: {
          questions: data.questions,
          gateMode: true,
          subjectId: Number(id),
          chapterId,
          chapterName: data.chapter_name,
        },
      });
    } catch (e: any) {
      toast.error(e.message || "生成闯关测验失败");
      setStartingQuiz(null);
    }
  };

  const completedCount = path.filter((c) => c.status === "completed").length;
  const progressPct = path.length > 0 ? Math.round((completedCount / path.length) * 100) : 0;

  return (
    <div>
      <Link
        to={`/subject/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-6"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="w-3 h-3" /> /subject
      </Link>

      <div className="mb-8">
        <p className="section-overline mb-2">Learning Path</p>
        <h1 className="text-display" style={{ color: "var(--text)" }}>
          {subjectName} 学习路径
        </h1>
        <p className="text-caption mt-2">
          逐章闯关，通过测验解锁下一章。每题至少5道题，正确率 ≥ 60% 即通过。
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        </div>
      ) : (
        <>
          {/* 总进度条 */}
          <div className="card mb-10" style={{ padding: "var(--s-6)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-overline">总体进度</p>
              <span className="stat-number text-2xl" style={{ color: "var(--accent)" }}>
                {completedCount}/{path.length}
              </span>
            </div>
            <div className="progress-track mb-1">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%`, transition: "width var(--slow) var(--ease)" }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {progressPct}% 完成
            </p>
          </div>

          {/* 关卡时间线 */}
          <div className="space-y-4">
            {path.map((ch, i) => {
              const isLocked = ch.status === "locked";
              const isCompleted = ch.status === "completed";
              const isUnlocked = ch.status === "unlocked";
              const isStarting = startingQuiz === ch.chapter_id;

              return (
                <div
                  key={ch.chapter_id}
                  className="card flex items-center gap-5"
                  style={{
                    padding: "var(--s-5) var(--s-6)",
                    opacity: isLocked ? 0.5 : 1,
                    borderLeft: `3px solid ${
                      isCompleted
                        ? "var(--success)"
                        : isUnlocked
                        ? "var(--accent)"
                        : "var(--border)"
                    }`,
                  }}
                >
                  {/* 状态图标 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isCompleted
                        ? "var(--success-muted)"
                        : isUnlocked
                        ? "var(--accent-muted)"
                        : "var(--bg-raised)",
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" style={{ color: "var(--success)" }} />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <Unlock className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    )}
                  </div>

                  {/* 章节信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className="mono-label"
                        style={{ color: "var(--text-muted)" }}
                      >
                        第{i + 1}关
                      </span>
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {ch.chapter_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {ch.knowledge_count} 知识点
                      </span>
                      <span>{ch.question_count} 道题目</span>
                      {isCompleted && ch.score > 0 && (
                        <span style={{ color: "var(--success)" }}>
                          得分: {ch.score}%
                        </span>
                      )}
                      {isCompleted && ch.completed_at && (
                        <span>
                          {new Date(ch.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {isUnlocked && (
                    <button
                      onClick={() => handleStartGateQuiz(ch.chapter_id)}
                      disabled={isStarting || ch.question_count < 5}
                      className="btn-primary shrink-0"
                      style={{ padding: "6px 16px", fontSize: "0.8125rem" }}
                    >
                      {isStarting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      开始闯关
                    </button>
                  )}
                  {isLocked && (
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      完成上一章后解锁
                    </span>
                  )}
                  {isCompleted && (
                    <button
                      onClick={() => handleStartGateQuiz(ch.chapter_id)}
                      disabled={isStarting || ch.question_count < 5}
                      className="btn-ghost shrink-0"
                      style={{ padding: "6px 16px", fontSize: "0.8125rem" }}
                    >
                      重新挑战
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {path.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32">
              <BookOpen className="w-10 h-10 mb-4" style={{ color: "var(--text-muted)" }} />
              <p className="text-headline" style={{ color: "var(--text-secondary)" }}>
                暂无章节数据
              </p>
              <p className="text-caption">请先添加章节</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
