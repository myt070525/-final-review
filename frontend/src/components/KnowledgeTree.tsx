import { useState } from "react";
import { ChevronRight, ChevronDown, Search, BookOpen } from "lucide-react";

interface TreeNode {
  id: number;
  title: string;
  key_terms: string[];
  difficulty: string;
  children: TreeNode[];
}

interface ChapterGroup {
  chapter_id: number;
  chapter_name: string;
  nodes: TreeNode[];
}

interface Props {
  tree: ChapterGroup[];
  activeNodeId: number | null;
  onSelectNode: (nodeId: number) => void;
}

export default function KnowledgeTree({ tree, activeNodeId, onSelectNode }: Props) {
  const [search, setSearch] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
    new Set(tree.map((c) => c.chapter_id))
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const toggleChapter = (chId: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.has(chId) ? next.delete(chId) : next.add(chId);
      return next;
    });
  };

  const toggleNode = (nid: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(nid) ? next.delete(nid) : next.add(nid);
      return next;
    });
  };

  // 搜索过滤
  const filterBySearch = (nodes: TreeNode[]): TreeNode[] => {
    if (!search.trim()) return nodes;
    const q = search.toLowerCase();
    return nodes
      .map((n) => ({
        ...n,
        children: filterBySearch(n.children),
      }))
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.key_terms.some((t) => t.toLowerCase().includes(q)) ||
          n.children.length > 0
      );
  };

  const filteredTree = search.trim()
    ? tree
        .map((ch) => ({
          ...ch,
          nodes: filterBySearch(ch.nodes),
        }))
        .filter((ch) => ch.nodes.length > 0)
    : tree;

  const renderNode = (node: TreeNode, depth: number = 1) => {
    const isActive = activeNodeId === node.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    const diffColor =
      node.difficulty === "easy"
        ? "var(--success)"
        : node.difficulty === "hard"
        ? "var(--error)"
        : "var(--accent)";

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            onSelectNode(node.id);
            if (hasChildren) toggleNode(node.id);
          }}
          className="w-full text-left flex items-center gap-1.5 py-1.5 px-2 rounded-md transition-colors text-sm"
          style={{
            paddingLeft: `${depth * 12 + 4}px`,
            color: isActive ? "var(--accent)" : "var(--text-secondary)",
            background: isActive ? "var(--accent-muted)" : "transparent",
            fontWeight: isActive ? 600 : 400,
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: diffColor }}
          />
          <span className="truncate">{node.title}</span>
        </button>
        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <nav className="h-full flex flex-col" style={{ color: "var(--text-secondary)" }}>
      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          className="input-base w-full"
          style={{ paddingLeft: "2.25rem", fontSize: "0.8125rem" }}
          placeholder="搜索知识点..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 树形列表 */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-6 h-6 mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {search.trim() ? "未找到匹配的知识点" : "暂无知识点"}
            </p>
          </div>
        ) : (
          filteredTree.map((ch) => {
            const isChExpanded = expandedChapters.has(ch.chapter_id);
            return (
              <div key={ch.chapter_id}>
                <button
                  onClick={() => toggleChapter(ch.chapter_id)}
                  className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                  style={{
                    color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {isChExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  )}
                  {ch.chapter_name}
                  <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                    {ch.nodes.length}
                  </span>
                </button>
                {isChExpanded && (
                  <div className="ml-1 border-l" style={{ borderColor: "var(--border)" }}>
                    {ch.nodes.map((node) => renderNode(node, 1))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </nav>
  );
}
