import json
import re
from openai import OpenAI
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, AI_MODEL

client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)


def _repair_truncated_json(content: str) -> str:
    """Try to salvage truncated JSON by finding the last complete object or array."""
    content = content.strip()
    if content.startswith("```"):
        parts = content.split("```")
        content = parts[1] if len(parts) > 1 else content
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    # Forward scan: track nesting, find end of last complete structure
    array_depth = 0
    obj_depth = 0
    in_string = False
    escape_next = False
    last_good_end = -1
    is_object_root = False  # top-level is an object like {"questions": ...}

    if content.startswith("{"):
        is_object_root = True

    for i, ch in enumerate(content):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\":
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '[':
            array_depth += 1
        elif ch == ']':
            array_depth -= 1
        elif ch == '{':
            obj_depth += 1
        elif ch == '}':
            obj_depth -= 1
            # Complete top-level object (for {"questions": [...], "answers": [...]} format)
            if is_object_root and obj_depth == 0:
                last_good_end = i
            # Complete top-level object inside array (for [{...}, {...}] format)
            elif array_depth == 1 and obj_depth == 0:
                last_good_end = i

    if last_good_end > 0:
        content = content[:last_good_end + 1]
        if not is_object_root:
            content += "\n]"
        return content
    return content


def _try_parse(text: str):
    """Try json.loads with strict=True then strict=False (allows control chars).
    Returns parsed JSON (list or dict)."""
    last_exc = None
    for strict in (True, False):
        try:
            return json.loads(text, strict=strict)
        except json.JSONDecodeError as e:
            last_exc = e
            continue
    raise last_exc


def _parse_json_safe(content: str):
    """Parse model output with multiple fallback strategies.
    Returns parsed JSON (list or dict) on success, or raises with the last JSONDecodeError.
    """
    content = content.strip()
    last_err = None

    # Strategy 1: clean JSON
    try:
        return _try_parse(content)
    except json.JSONDecodeError as e:
        last_err = e

    # Strategy 2: extract from markdown fences
    if content.startswith("```"):
        parts = content.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:]
            if part.startswith("["):
                try:
                    return _try_parse(part)
                except json.JSONDecodeError as e:
                    last_err = e
                    continue

    # Strategy 3: repair truncated JSON
    repaired = _repair_truncated_json(content)
    try:
        return _try_parse(repaired)
    except json.JSONDecodeError as e:
        last_err = e

    # Strategy 4: find the outermost [...] block
    match = re.search(r"\[[\s\S]*\]", content)
    if match:
        try:
            return _try_parse(match.group())
        except json.JSONDecodeError as e:
            last_err = e
        repaired2 = _repair_truncated_json(match.group())
        try:
            return _try_parse(repaired2)
        except json.JSONDecodeError as e:
            last_err = e

    raise last_err or ValueError(f"无法解析模型输出为 JSON。原始输出前 500 字符:\n{content[:500]}")


EXTRACT_SYSTEM = """你是一个题目提取器。请将试卷文本解析为以下 JSON 格式：
{
  "questions": [
    {"stem": "题干", "type": "choice|multi_choice|fill|essay|judge", "options": ["A. xx", "B. xx"] 或 null, "answer": "A", "chapter": "第一章 xxx", "tags": ["知识点"]}
  ],
  "answers": [
    {"title": "参考答案 - 选择题", "content": "1-5: ABCDD\\n6-10: CBADA", "question_numbers": [1,2,3,4,5,6,7,8,9,10]}
  ]
}

规则：
- choice=单选题，multi_choice=多选题（答案如"ABD"表示多个正确选项）
- chapter 字段从文本中的章节/单元标题提取（如"第一章 导论"、"第二单元 xxx"），若无法判断则为空字符串""
- 同一章节的题目 chapter 保持一致
- 如果文本中包含"参考答案"、"试题答案"、"答案"、"答案与解析"等答案章节，提取为 answers 数组
- answers 中每条包含 title（标题）、content（答案原文，保持格式）、question_numbers（覆盖的题号列表）
- 如果文本没有单独的答案章节，answers 设为空数组 []
- 只输出 JSON，不要任何其他文字
- 字符串内的双引号必须用 \\" 转义，换行用 \\n
- 如果文本没有标注正确答案，根据常识推断
- 数学公式必须用 $...$ 包裹（行内公式）或 $$...$$ 包裹（独立公式），例如：$\\lim_{x \\to \\infty} f(x)$、$\\frac{a}{b}$、$\\sin x$、$\\ln z$、$\\int_0^1 x dx$。原文本中的公式无论如何都应统一加上 $ 包裹"""


def _call_with_retry(messages: list[dict], temperature: float, max_tokens: int):
    """Call the model, parse JSON, retry once with error context if needed.
    Returns parsed JSON (list or dict)."""
    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    content = response.choices[0].message.content.strip()

    try:
        return _parse_json_safe(content)
    except (json.JSONDecodeError, ValueError) as first_error:
        pass

    # Retry: send the raw output + error back to the model
    retry_messages = messages + [
        {"role": "assistant", "content": content},
        {"role": "user", "content": f"你的 JSON 有语法错误：{first_error}\n\n请修复后重新输出完整的 JSON 数组。确保所有字符串都正确闭合，双引号正确转义。"},
    ]
    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=retry_messages,
        temperature=0.0,
        max_tokens=max_tokens,
    )
    content2 = response.choices[0].message.content.strip()

    try:
        return _parse_json_safe(content2)
    except (json.JSONDecodeError, ValueError):
        raise ValueError(
            f"模型连续两次输出非法 JSON。\n\n"
            f"第一次错误: {first_error}\n"
            f"第一次输出末 800 字符:\n{content[-800:]}\n\n"
            f"第二次输出末 800 字符:\n{content2[-800:]}"
        )


def extract_questions_from_text(text: str) -> dict:
    """从文本中提取题目和答案条目。
    返回 {"questions": [...], "answers": [...]}"""
    truncated = text[:12000]
    messages = [
        {"role": "system", "content": EXTRACT_SYSTEM},
        {"role": "user", "content": f"试卷文本：\n{truncated}"},
    ]
    result = _call_with_retry(messages, temperature=0.1, max_tokens=16384)
    # 兼容旧格式：如果返回的是纯数组，包装为 {"questions": ..., "answers": []}
    if isinstance(result, list):
        return {"questions": result, "answers": []}
    return {
        "questions": result.get("questions", []),
        "answers": result.get("answers", []),
    }


# 文科类学科关键词 — 这些学科的解析应简洁，聚焦答案本身
_LIBERAL_ARTS_KEYWORDS = [
    "马克思主义", "政治", "哲学", "历史", "语文", "英语", "文学",
    "法学", "社会学", "心理学", "教育学", "经济学", "管理学",
    "思想道德", "毛概", "近代史", "思修", "马原", "史纲",
]

def _is_liberal_arts(subject_name: str) -> bool:
    """判断是否为文科类学科"""
    if not subject_name:
        return False
    return any(kw in subject_name for kw in _LIBERAL_ARTS_KEYWORDS)


def generate_explanation(
    stem: str,
    options: list[str] | None,
    answer: str,
    question_type: str,
    subject_name: str = "",
) -> str:
    options_text = "\n".join(options) if options else "无"
    is_liberal = _is_liberal_arts(subject_name)

    math_rules = """【数学公式必须严格遵守以下规则】
1. 所有数学公式、符号、表达式必须用 $...$（行内）或 $$...$$（独立行）包裹
2. 必须使用 LaTeX 命令，严禁使用 Unicode 数学符号（如 𝜋 𝜃 ∫ ∬ ∭ ∮ ∂ ∇ √ ∛ ∞ ≤ ≥ ≠ ≈ × · → ⇒ ⟹ 等）
   正确：$\pi$ $\theta$ $\int$ $\iint$ $\partial$ $\sqrt{x}$ $\infty$ $\leq$ $\times$ $\cdot$ $\to$ $\implies$
   错误：π θ ∫ ∬ ∂ √x ∞ ≤ × · → ⟹
3. 上下标必须用 _ 和 ^：$x^2$ $a_i$ $r^3$，不要用 Unicode ² ³ ₁ 等
4. 分数用 $\frac{分子}{分母}$，不要用 Unicode ½ 等"""

    if is_liberal:
        prompt = f"""请为下面这道{question_type}题生成简洁解析。只需说明正确答案是什么、为什么对，不必逐一分析错误选项。控制在2-3句话以内。

用纯 Markdown 格式输出（严禁使用 HTML 标签如 <p> <strong> <h3> <ul> <li> <ol> <table> <tr> <td> <div> <span> 等），结构如下：
**答案**：<正确答案>
**解析**：<简要说明>

{math_rules}

题目：{stem}

选项：{options_text}

正确答案：{answer}"""
        max_tokens = 1024
    else:
        prompt = f"""请为下面这道{question_type}题生成解析。用纯 Markdown 格式输出（严禁使用 HTML 标签如 <p> <strong> <h3> <ul> <li> <ol> <table> <tr> <td> <div> <span> 等），结构如下：

### 正确答案
（正确答案及分析，包含推导过程）

### 选项分析
{("- A：...\n- B：...\n- C：...\n- D：...（逐个分析每个选项的对错原因）") if options else "（本题无选项，可省略此节）"}

### 知识点总结
（列出本题涉及的知识点，用无序列表）

{math_rules}

题目：{stem}

选项：{options_text}

正确答案：{answer}"""
        max_tokens = 4096

    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=max_tokens,
    )

    return response.choices[0].message.content.strip()


def generate_similar_questions(
    stem: str,
    options: list[str] | None,
    answer: str,
    explanation: str,
    question_type: str,
    count: int = 2,
) -> list[dict]:
    options_text = "\n".join(options) if options else "无"

    prompt = f"""请根据以下原题，生成 {count} 道同类型、同知识点的题目。要求：
- 题型相同
- 知识点相同，但具体表述不同
- 每道题必须包含完整的题干、选项（如果是选择题）、正确答案
- 输出格式必须为 JSON 数组，每个元素包含字段: stem, type, options (数组或null), answer, tags (数组)

原始题目：
题型：{question_type}
题干：{stem}
选项：{options_text}
答案：{answer}
解析：{explanation or "无"}

请生成 {count} 道同类题目，JSON 输出："""

    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=8192,
    )

    content = response.choices[0].message.content.strip()
    return _parse_json_safe(content)
