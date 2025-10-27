import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Point explicitly to backend/.env (adjust if your .env is elsewhere)
HERE = Path(__file__).parent
ENV_PATH = HERE / ".env"          # if your .env is in backend/

# --- ADD THESE DEBUG LINES ---
print("="*30)
print(f"[DEBUG] config.py path: {__file__}")
print(f"[DEBUG] Attempting to load .env from: {ENV_PATH}")
print(f"[DEBUG] Does .env file exist? {ENV_PATH.is_file()}")
# --- END DEBUG LINES ---
# Load .env BEFORE reading any variables
load_dotenv(dotenv_path=ENV_PATH, override=True)

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "claude-3-5-sonnet-2025-06-06")
PORT = int(os.getenv("PORT", 8787))

# OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
if not OPENROUTER_API_KEY:
    raise RuntimeError("Missing OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "tngtech/deepseek-r1t-chimera:free")
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_REFERER = os.getenv("OPENROUTER_REFERER", "")
OPENROUTER_TITLE   = os.getenv("OPENROUTER_TITLE", "LeetCode Ambient Agent")


print(
    "[config] env_path=", ENV_PATH,
    "| key_present_in_process=", bool(OPENROUTER_API_KEY),
    "| process_preview=", (OPENROUTER_API_KEY[:6] + "…") if OPENROUTER_API_KEY else "<empty>",
    "| cwd=", os.getcwd(),
)