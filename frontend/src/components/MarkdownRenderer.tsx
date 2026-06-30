import { useMemo } from "react";
import { renderTextWithLatex } from "./LatexRenderer";

/**
 * Convert known HTML tags from AI output back to Markdown.
 * The AI sometimes returns HTML despite being told not to.
 * This function strips HTML and converts to Markdown equivalents.
 */
function htmlToMarkdown(html: string): string {
  let s = html;

  // Convert common HTML tags to Markdown
  s = s.replace(/<h3>/gi, "\n### ");
  s = s.replace(/<\/h3>/gi, "\n");
  s = s.replace(/<h2>/gi, "\n## ");
  s = s.replace(/<\/h2>/gi, "\n");
  s = s.replace(/<h1>/gi, "\n# ");
  s = s.replace(/<\/h1>/gi, "\n");
  s = s.replace(/<strong>/gi, "**");
  s = s.replace(/<\/strong>/gi, "**");
  s = s.replace(/<b>/gi, "**");
  s = s.replace(/<\/b>/gi, "**");
  s = s.replace(/<em>/gi, "*");
  s = s.replace(/<\/em>/gi, "*");
  s = s.replace(/<p>/gi, "\n\n");
  s = s.replace(/<\/p>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<ul>/gi, "");
  s = s.replace(/<\/ul>/gi, "");
  s = s.replace(/<ol>/gi, "");
  s = s.replace(/<\/ol>/gi, "");
  s = s.replace(/<li>/gi, "- ");
  s = s.replace(/<\/li>/gi, "");
  s = s.replace(/<code>/gi, "`");
  s = s.replace(/<\/code>/gi, "`");
  s = s.replace(/<pre>/gi, "\n```\n");
  s = s.replace(/<\/pre>/gi, "\n```\n");
  s = s.replace(/<blockquote>/gi, "\n> ");
  s = s.replace(/<\/blockquote>/gi, "\n");
  s = s.replace(/<table[^>]*>/gi, "");
  s = s.replace(/<\/table>/gi, "");
  s = s.replace(/<tr[^>]*>/gi, "");
  s = s.replace(/<\/tr>/gi, "\n");
  s = s.replace(/<td[^>]*>/gi, "| ");
  s = s.replace(/<\/td>/gi, " ");
  s = s.replace(/<th[^>]*>/gi, "| **");
  s = s.replace(/<\/th>/gi, "** ");
  s = s.replace(/<div[^>]*>/gi, "");
  s = s.replace(/<\/div>/gi, "");
  s = s.replace(/<span[^>]*>/gi, "");
  s = s.replace(/<\/span>/gi, "");
  s = s.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Strip any remaining unrecognized tags
  s = s.replace(/<[^>]+>/g, "");

  // Clean up extra whitespace
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.trim();

  return s;
}

/**
 * Lightweight Markdown → HTML renderer.
 * Supports: h1-h3, lists, inline code, code blocks, bold, KaTeX.
 */
export default function MarkdownRenderer({ text }: { text: string }) {
  const html = useMemo(() => {
    if (!text) return "";
    let s = text;

    // Detect if content is HTML (AI sometimes returns HTML instead of Markdown)
    const isHtml = /<\/?(?:p|h[1-6]|ul|ol|li|table|tr|td|th|div|strong|em|br|hr|blockquote|pre|code|span)[^>]*>/i.test(s);

    // Convert HTML to Markdown first, then process uniformly
    if (isHtml) {
      s = htmlToMarkdown(s);
    }

    // Protect LaTeX blocks from Markdown processing
    const latexBlocks: string[] = [];
    s = s.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$]+\$|\\\([^)]+\\\))/g, (m) => {
      latexBlocks.push(m);
      return `\x00LATEX${latexBlocks.length - 1}\x00`;
    });

    // Escape HTML entities in plain text
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Code blocks ``` ... ```
    const codeBlocks: string[] = [];
    s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      codeBlocks.push(`<pre><code class="language-${lang || 'java'}">${code.trim()}</code></pre>`);
      return `\x00CODE${codeBlocks.length - 1}\x00`;
    });

    // Inline code `...`
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold **...**
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Headings (h3 → h1)
    s = s.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    s = s.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    s = s.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    s = s.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Unordered lists
    s = s.replace(/^[\*\-] (.+)$/gm, "<li>$1</li>");
    s = s.replace(/(<li>[\s\S]*?<\/li>)/g, (m: string) => {
      if (!m.includes("\n<li>")) return `<ul>${m}</ul>`;
      return `<ul>${m.replace(/\n/g, "")}</ul>`;
    });

    // Paragraphs: double newlines
    s = s.replace(/\n\n+/g, "</p><p>");
    s = "<p>" + s + "</p>";

    // Clean up empty paragraphs and nested issues
    s = s.replace(/<p>\s*<\/p>/g, "");
    s = s.replace(/<p>(\s*<h[1-4]>)/g, "$1");
    s = s.replace(/(<\/h[1-4]>\s*)<\/p>/g, "$1");
    s = s.replace(/<p>(\s*<ul>)/g, "$1");
    s = s.replace(/(<\/ul>\s*)<\/p>/g, "$1");
    s = s.replace(/<p>(\s*<pre>)/g, "$1");
    s = s.replace(/(<\/pre>\s*)<\/p>/g, "$1");

    // Restore code blocks
    s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[+i] || "");

    // Restore LaTeX markers
    s = s.replace(/\x00LATEX(\d+)\x00/g, (_, i) => latexBlocks[+i] || "");

    // Render LaTeX to KaTeX HTML
    s = renderTextWithLatex(s);

    return s;
  }, [text]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        lineHeight: 1.8,
        color: "var(--text-secondary)",
      }}
    />
  );
}
