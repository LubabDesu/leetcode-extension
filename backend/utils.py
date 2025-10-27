import re
import json
from typing import Union
def truncate_text(s: str, limit: int) -> str:
    if not s:
        return s
    if len(s) <= limit:
        return s
    return s[:limit] + "\n/* …truncated… */"

def extract_json(s: Union[str, dict]) -> str:
    """
    Extracts the first top-level JSON object from a model response.
    Fallback-friendly for cases where the model adds prose.
    """
    if not s:
        return "{}"
    # Find the last closing brace to capture the largest JSON block
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return "{}"
    candidate = s[start:end+1]

    # Heuristic: strip trailing markdown fences if any
    candidate = re.sub(r"```(?:json)?", "", candidate)
    return candidate
