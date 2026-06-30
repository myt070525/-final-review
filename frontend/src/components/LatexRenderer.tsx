import { useMemo } from "react";
import katex from "katex";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderFormula(formula: string, displayMode: boolean): string {
  try {
    // Also convert Unicode math inside the formula (in case it wasn't caught by the outer pass)
    const clean = convertUnicodeMath(formula.trim());
    return katex.renderToString(clean, { displayMode, throwOnError: false, strict: false });
  } catch {
    return `<code>${escapeHtml(formula)}</code>`;
  }
}

function convertUnicodeMath(text: string): string {
  const charMap: [RegExp, string][] = [
    // === Integrals ===
    [/∫/g, "\\int "], [/∬/g, "\\iint "], [/∭/g, "\\iiint "], [/∮/g, "\\oint "],
    // === Greek (standard) ===
    [/π/g, "\\pi"], [/θ/g, "\\theta"], [/α/g, "\\alpha"], [/β/g, "\\beta"],
    [/γ/g, "\\gamma"], [/σ/g, "\\sigma"], [/ω/g, "\\omega"],
    [/λ/g, "\\lambda"], [/μ/g, "\\mu"], [/Δ/g, "\\Delta"], [/Σ/g, "\\Sigma"], [/Ω/g, "\\Omega"],
    [/ε/g, "\\varepsilon"], [/φ/g, "\\phi"], [/ψ/g, "\\psi"], [/η/g, "\\eta"],
    [/ρ/g, "\\rho"], [/τ/g, "\\tau"], [/ξ/g, "\\xi"], [/ζ/g, "\\zeta"],
    // === Mathematical Italic (AI often uses these) ===
    [/\u{1D70B}/gu, "\\pi"],       // 𝜋 MATHEMATICAL ITALIC SMALL PI
    [/\u{1D703}/gu, "\\theta"],    // 𝜃 MATHEMATICAL ITALIC SMALL THETA
    [/\u{1D6FC}/gu, "\\alpha"],    // 𝛼 MATHEMATICAL ITALIC SMALL ALPHA
    [/\u{1D6FD}/gu, "\\beta"],     // 𝛽 MATHEMATICAL ITALIC SMALL BETA
    [/\u{1D6FE}/gu, "\\gamma"],    // 𝛾 MATHEMATICAL ITALIC SMALL GAMMA
    [/\u{1D70E}/gu, "\\sigma"],    // 𝜎 MATHEMATICAL ITALIC SMALL SIGMA
    [/\u{1D714}/gu, "\\omega"],    // 𝜔 MATHEMATICAL ITALIC SMALL OMEGA
    [/\u{1D706}/gu, "\\lambda"],   // 𝜆 MATHEMATICAL ITALIC SMALL LAMBDA
    [/\u{1D707}/gu, "\\mu"],       // 𝜇 MATHEMATICAL ITALIC SMALL MU
    [/\u{1D719}/gu, "\\phi"],      // 𝜙 MATHEMATICAL ITALIC SMALL PHI
    [/\u{1D700}/gu, "\\epsilon"],  // 𝜀 MATHEMATICAL ITALIC SMALL EPSILON
    // === Operators & Relations ===
    [/∑/g, "\\sum "], [/∏/g, "\\prod "], [/∞/g, "\\infty"],
    [/∂/g, "\\partial "], [/∇/g, "\\nabla "],
    [/√/g, "\\sqrt{}"], [/∛/g, "\\sqrt[3]{}"],
    [/≤/g, "\\leq"], [/≥/g, "\\geq"], [/≠/g, "\\neq"], [/≈/g, "\\approx"],
    [/≡/g, "\\equiv"], [/∼/g, "\\sim"], [/∝/g, "\\propto"],
    [/⊂/g, "\\subset"], [/⊃/g, "\\supset"], [/⊆/g, "\\subseteq"], [/⊇/g, "\\supseteq"],
    [/∈/g, "\\in"], [/∉/g, "\\notin"], [/∪/g, "\\cup"], [/∩/g, "\\cap"],
    [/∧/g, "\\land"], [/∨/g, "\\lor"], [/¬/g, "\\neg"],
    [/∀/g, "\\forall"], [/∃/g, "\\exists"], [/∄/g, "\\nexists"],
    [/∅/g, "\\emptyset"], [/∖/g, "\\setminus"],
    // === Arrows ===
    [/×/g, "\\times"], [/·/g, "\\cdot"], [/→/g, "\\to "], [/⇒/g, "\\implies "],
    [/⟹/g, "\\implies "], [/⟶/g, "\\longrightarrow "],
    [/⇐/g, "\\impliedby "], [/⇔/g, "\\iff "], [/⟺/g, "\\iff "],
    [/←/g, "\\leftarrow "], [/↑/g, "\\uparrow "], [/↓/g, "\\downarrow "],
    [/↦/g, "\\mapsto "],
    // === Superscripts & Subscripts (Unicode) ===
    [/⁰/g, "^{0}"], [/¹/g, "^{1}"], [/²/g, "^{2}"], [/³/g, "^{3}"],
    [/⁴/g, "^{4}"], [/⁵/g, "^{5}"], [/⁶/g, "^{6}"], [/⁷/g, "^{7}"],
    [/⁸/g, "^{8}"], [/⁹/g, "^{9}"], [/⁺/g, "^{+}"], [/⁻/g, "^{-}"],
    [/⁼/g, "^{=}"],
    [/₀/g, "_{0}"], [/₁/g, "_{1}"], [/₂/g, "_{2}"], [/₃/g, "_{3}"],
    [/₄/g, "_{4}"], [/₅/g, "_{5}"], [/₆/g, "_{6}"], [/₇/g, "_{7}"],
    [/₈/g, "_{8}"], [/₉/g, "_{9}"], [/₊/g, "_{+}"], [/₋/g, "_{-}"],
    [/₌/g, "_{=}"],
    // === Fractions ===
    [/½/g, "\\frac{1}{2}"], [/⅓/g, "\\frac{1}{3}"], [/⅔/g, "\\frac{2}{3}"],
    [/¼/g, "\\frac{1}{4}"], [/¾/g, "\\frac{3}{4}"],
    // === Dots & Misc ===
    [/…/g, "\\dots"], [/⋯/g, "\\cdots"], [/⋮/g, "\\vdots"], [/⋱/g, "\\ddots"],
    [/∘/g, "\\circ"], [/⊕/g, "\\oplus"], [/⊗/g, "\\otimes"],
    [/⊥/g, "\\perp"], [/∥/g, "\\parallel"], [/∠/g, "\\angle"],
    [/⟨/g, "\\langle"], [/⟩/g, "\\rangle"],
    [/⌊/g, "\\lfloor"], [/⌋/g, "\\rfloor"], [/⌈/g, "\\lceil"], [/⌉/g, "\\rceil"],
  ];
  let result = text;
  for (const [re, latex] of charMap) {
    result = result.replace(re, latex);
  }
  return result;
}

export function renderTextWithLatex(text: string): string {
  if (!text) return "";

  let workText = convertUnicodeMath(text);
  const placeholders: string[] = [];
  let pid = 0;

  function stash(html: string): string {
    placeholders.push(html);
    return `\x00P${pid++}\x00`;
  }

  // Phase 0: Normalize bare math commands (lim, sin, cos, ln, etc.) that are missing backslashes
  // Only when they appear in a math context (followed by subscript, arguments, or operators)
  workText = workText.replace(/\b(lim)(?=\s*[_^])/g, "\\$1");
  workText = workText.replace(/\b(sin|cos|tan|ln|log|exp|csc|sec|cot)(?=\s*[_^(\\[0-9a-zA-Z])/g, "\\$1");
  // lim at end of expression (before =, +, -, etc.)
  workText = workText.replace(/\b(lim)(?=\s*[=+\-×→\[\]])/g, "\\$1");

  // Phase 1: Protect user-delimited math — replace with placeholders
  // $$...$$ block math
  workText = workText.replace(/\$\$([\s\S]*?)\$\$/g, (_, f) => stash(renderFormula(f, true)));
  // \[...\] block math
  workText = workText.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => stash(renderFormula(f, true)));
  // $...$ inline math
  workText = workText.replace(/\$([^$]+?)\$/g, (_, f) => stash(renderFormula(f, false)));
  // \(...\) inline math
  workText = workText.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => stash(renderFormula(f, false)));

  // Phase 2: Auto-detect math patterns in remaining text (no $ left, all stashed)
  const patterns: [RegExp, (m: string, ...groups: string[]) => string][] = [
    // LaTeX commands with limits: \int_{0}^{1}, \sum_{i=1}^{n}, \lim_{x\to\infty}
    [
      /(\\int|\\iint|\\iiint|\\oint|\\sum|\\prod|\\lim)\s*(?:_\{[^}]*\})?\s*(?:\^\{[^}]*\})?/g,
      (m) => `$${m}$`,
    ],
    // Other LaTeX commands (including \sin, \cos, \ln, etc.)
    [
      /(\\frac\{[^}]*\}\{[^}]*\}|\\sqrt\[[^\]]*\]\{[^}]*\}|\\sqrt\{[^}]*\}|\\sin|\\cos|\\tan|\\ln|\\log|\\exp|\\lim|\\infty|\\partial|\\nabla|\\times|\\cdot|\\leq|\\geq|\\neq|\\approx|\\to|\\implies|\\iff|\\alpha|\\beta|\\gamma|\\theta|\\pi|\\sigma|\\omega|\\lambda|\\mu|\\Delta|\\Sigma|\\Omega)/g,
      (m) => `$${m}$`,
    ],
    // Variable with braced sub/superscript: x^{2n+1}, a_{ij}, f(x,y)
    [
      /([a-zA-Z0-9])([_^]\{(?:\\.|[^{}])*\})/g,
      (_, prefix, limits) => `$${prefix}${limits}$`,
    ],
    // Simple sub/superscript: x^2, a_i, e^x
    [
      /([a-zA-Z0-9])([_^][a-zA-Z0-9](?![a-zA-Z0-9]))/g,
      (m) => `$${m}$`,
    ],
  ];

  for (const [re, wrapper] of patterns) {
    workText = workText.replace(re, (...args) => {
      return wrapper(args[0], ...args.slice(1));
    });
    // Immediately process any new $...$ blocks to prevent nesting in next pattern
    workText = workText.replace(/\$\$([\s\S]*?)\$\$/g, (_, f) => stash(renderFormula(f, true)));
    workText = workText.replace(/\$([^$]+?)\$/g, (_, f) => stash(renderFormula(f, false)));
  }

  // Phase 4: Clean up — escape remaining HTML in plain text
  workText = escapeHtml(workText);

  // Light Markdown: **bold**
  workText = workText.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Phase 5: Restore all placeholders
  for (let i = pid - 1; i >= 0; i--) {
    workText = workText.replace(`\x00P${i}\x00`, placeholders[i]);
  }

  return workText;
}

export default function LatexRenderer({ text, className = "" }: { text: string; className?: string }) {
  const html = useMemo(() => renderTextWithLatex(text), [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
