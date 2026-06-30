import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getKnowledgeTree, getKnowledgeNode } from "../services/api";
import { useToast } from "../components/Toast";
import KnowledgeTree from "../components/KnowledgeTree";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { ArrowLeft, BookOpen, Tag, Layers, Loader2 } from "lucide-react";

interface TreeNode {
  id: number;
  title: string;
  content: string;
  key_terms: string[];
  difficulty: string;
  children: TreeNode[];
}

interface ChapterGroup {
  chapter_id: number;
  chapter_name: string;
  nodes: TreeNode[];
}

interface NodeDetail {
  id: number;
  title: string;
  content: string;
  key_terms: string[];
  difficulty: string;
  source: string;
  chapter_id: number;
  parent_id: number | null;
  related_questions: { id: number; stem: string; type: string }[];
}

export default function JavaReview() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [tree, setTree] = useState<ChapterGroup[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [activeNode, setActiveNode] = useState<NodeDetail | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingNode, setLoadingNode] = useState(false);
  const [mobileShowTree, setMobileShowTree] = useState(true);

  // 加载知识树
  useEffect(() => {
    getKnowledgeTree(Number(id))
      .then((data) => {
        setTree(data.tree);
        setSubjectName(data.subject_name);
        // 自动选中第一个叶子节点
        const firstLeaf = findFirstLeaf(data.tree);
        if (firstLeaf) {
          handleSelectNode(firstLeaf.id);
        }
      })
      .catch((e: any) => toast.error(e.message || "加载知识树失败"))
      .finally(() => setLoadingTree(false));
  }, [id]);

  // 查找第一个叶子节点（无子节点）
  const findFirstLeaf = (groups: ChapterGroup[]): TreeNode | null => {
    for (const ch of groups) {
      for (const node of ch.nodes) {
        const leaf = getFirstLeaf(node);
        if (leaf) return leaf;
      }
    }
    return null;
  };
  const getFirstLeaf = (node: TreeNode): TreeNode | null => {
    if (node.children.length === 0) return node;
    for (const child of node.children) {
      const leaf = getFirstLeaf(child);
      if (leaf) return leaf;
    }
    return null;
  };

  const handleSelectNode = async (nodeId: number) => {
    setMobileShowTree(false);
    setLoadingNode(true);
    try {
      const data = await getKnowledgeNode(nodeId);
      setActiveNode(data);
    } catch (e: any) {
      toast.error(e.message || "加载知识点失败");
    } finally {
      setLoadingNode(false);
    }
  };

  const diffColor =
    activeNode?.difficulty === "easy"
      ? "var(--success)"
      : activeNode?.difficulty === "hard"
      ? "var(--error)"
      : "var(--accent)";

  const diffLabel =
    activeNode?.difficulty === "easy"
      ? "基础"
      : activeNode?.difficulty === "hard"
      ? "进阶"
      : "重点";

  return (
    <div>
      {/* 顶部导航 */}
      <Link
        to={`/subject/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-6"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="w-3 h-3" /> /subject
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-overline mb-2">Knowledge Base</p>
          <h1 className="text-display" style={{ color: "var(--text)" }}>
            {subjectName} 知识复习
          </h1>
        </div>
        {/* 移动端切换按钮 */}
        <button
          className="btn-ghost md-hidden"
          onClick={() => setMobileShowTree(!mobileShowTree)}
        >
          {mobileShowTree ? "查看内容" : "知识点列表"}
        </button>
      </div>

      {loadingTree ? (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <BookOpen className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>
            暂无知识点
          </p>
          <p className="text-caption">
            请通过"导入资料"上传 Java PPT，让 AI 提取结构化知识点
          </p>
        </div>
      ) : (
        <div className="flex gap-6" style={{ minHeight: "60vh" }}>
          {/* 左侧知识树 */}
          <div
            className="shrink-0"
            style={{
              width: "280px",
              display: mobileShowTree ? "block" : "none",
            }}
          >
            <div
              className="card sticky"
              style={{
                top: "var(--s-16)",
                padding: "var(--s-5)",
                maxHeight: "calc(100vh - 120px)",
                overflow: "hidden",
              }}
            >
              <KnowledgeTree
                tree={tree}
                activeNodeId={activeNode?.id ?? null}
                onSelectNode={handleSelectNode}
              />
            </div>
          </div>

          {/* 右侧正文 */}
          <div
            className="flex-1 min-w-0"
            style={{ display: !mobileShowTree ? "block" : "block" }}
          >
            {loadingNode ? (
              <div className="flex items-center justify-center py-24">
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: "var(--accent)" }}
                />
              </div>
            ) : activeNode ? (
              <div className="card" style={{ padding: "var(--s-8)" }}>
                {/* 标题 */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <h2 className="text-headline" style={{ color: "var(--text)" }}>
                    {activeNode.title}
                  </h2>
                  <span
                    className="tag"
                    style={{
                      background: `${diffColor}18`,
                      color: diffColor,
                      borderColor: `${diffColor}30`,
                    }}
                  >
                    {diffLabel}
                  </span>
                  {activeNode.source && (
                    <span className="tag" style={{
                      background: activeNode.source.includes("考试重点") ? "rgba(239,68,68,0.12)" : "var(--bg-raised)",
                      color: activeNode.source.includes("考试重点") ? "#f87171" : "var(--text-muted)",
                      borderColor: activeNode.source.includes("考试重点") ? "rgba(239,68,68,0.25)" : "var(--border)",
                    }}>
                      {activeNode.source.includes("考试重点") ? "🎯 " : "📎 "}
                      {activeNode.source}
                    </span>
                  )}
                </div>

                {/* 关键术语 */}
                {activeNode.key_terms.length > 0 && (
                  <div className="flex items-start gap-2 mb-6 flex-wrap">
                    <Tag
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    />
                    {activeNode.key_terms.map((t) => (
                      <span key={t} className="tag tag-accent">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Markdown 正文 */}
                <div className="mb-8">
                  <MarkdownRenderer text={activeNode.content} />
                </div>

                {/* 关联题目 */}
                {activeNode.related_questions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <p className="section-overline">相关题目</p>
                    </div>
                    <div className="space-y-2">
                      {activeNode.related_questions.map((q) => (
                        <Link
                          key={q.id}
                          to={`/subject/${id}/questions`}
                          className="block px-4 py-3 rounded-lg text-sm no-underline transition-colors"
                          style={{
                            background: "var(--bg-raised)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span className="tag tag-muted mr-2">{q.type}</span>
                          {q.stem}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32">
                <BookOpen
                  className="w-10 h-10 mb-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <p className="text-headline" style={{ color: "var(--text-secondary)" }}>
                  选择一个知识点开始复习
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
