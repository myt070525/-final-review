"""
Java 代码在线运行服务
优先 JDoodle API（需配置 API Key），默认使用 Wandbox API（免费无需 Key）。
"""

import re
import httpx
from config import JDOODLE_CLIENT_ID, JDOODLE_CLIENT_SECRET

JDOODLE_URL = "https://api.jdoodle.com/v1/execute"
WANDBOX_URL = "https://wandbox.org/api/compile.json"


async def run_java_jdoodle(code: str, stdin: str = "") -> dict:
    """通过 JDoodle API 运行 Java 代码"""
    if not JDOODLE_CLIENT_ID or not JDOODLE_CLIENT_SECRET:
        raise RuntimeError("JDoodle API 未配置")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            JDOODLE_URL,
            json={
                "clientId": JDOODLE_CLIENT_ID,
                "clientSecret": JDOODLE_CLIENT_SECRET,
                "script": code,
                "language": "java",
                "versionIndex": "4",  # JDK 21
                "stdin": stdin,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "output": data.get("output", ""),
            "error": data.get("error", ""),
            "status_code": data.get("statusCode", 200),
            "time_ms": float(data.get("cpuTime", 0)) * 1000 if data.get("cpuTime") else None,
            "memory_kb": int(data.get("memory", 0)) if data.get("memory") else None,
        }


async def run_java_wandbox(code: str, stdin: str = "") -> dict:
    """通过 Wandbox API 运行 Java 代码（免费，无需 API Key）

    Wandbox 用 prog.java 作为文件名，所以 class 必须是 prog 或非 public。
    这里自动移除 public 修饰符以兼容。
    """
    # Wandbox 要求文件名 prog.java，所以类名必须是 prog 或非 public
    # 自动移除顶级 public class 的 public 修饰符
    code_fixed = re.sub(r'\bpublic\s+class\s+', 'class ', code, count=1)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            WANDBOX_URL,
            json={
                "compiler": "openjdk-jdk-21+35",
                "code": code_fixed,
                "stdin": stdin,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        # Wandbox 返回格式
        output = ""
        error = ""
        if data.get("program_output"):
            output = data["program_output"]
        if data.get("compiler_error"):
            error = data["compiler_error"]
        if data.get("program_error"):
            error = (error + "\n" + data["program_error"]).strip()

        return {
            "output": output,
            "error": error,
            "status_code": 200 if data.get("status") == "0" and not error else 400,
            "time_ms": None,
            "memory_kb": None,
        }


async def run_java(code: str, stdin: str = "") -> dict:
    """运行 Java 代码，优先 JDoodle，默认使用 Wandbox（免费）"""
    # 优先尝试 JDoodle（如果有配置）
    if JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET:
        try:
            return await run_java_jdoodle(code, stdin)
        except Exception:
            pass  # 回退到 Wandbox

    # 默认使用 Wandbox（免费，无需 API Key）
    return await run_java_wandbox(code, stdin)
