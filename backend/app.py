from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
# from anthropic import Anthropic, APIError, RateLimitError, OverloadedError
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions


from schema import AnalyzeRequest, AnalyzeResponse
from prompts import SYSTEM_PROMPT, user_payload_to_prompt
from config import CLAUDE_API_KEY, MODEL_NAME, OPENROUTER_MODEL
from utils import extract_json
from openrouter_client import chat_completion

import logging 
import json



# client = Anthropic(api_key=CLAUDE_API_KEY)
# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
log = logging.getLogger("ambient-backend")

app = FastAPI(title="Ambient Agent Backend", version="0.1.0")

# CORS (hackathon-friendly: open wide; tighten later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True, "model": MODEL_NAME}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """
    Rule-first: run cheap heuristics. If they return guidance, skip LLM call.
    Otherwise, call Claude with compact, structured context and return JSON.
    """
    # Build the user prompt 
    user_prompt = user_payload_to_prompt(
        {
        "task_context": req.task_context.dict(),
        "work_state": req.work_state.dict(),
        "signals": req.signals.dict() if req.signals else {}
        }
    )
    # # Send user prompt to Claude 
    # try : 
    #     message = client.messages.create(
    #         model=MODEL_NAME,
    #         system=SYSTEM_PROMPT,
    #         max_tokens=200,
    #         temperature=0.15,
    #         messages=[{
    #             "role":"user",
    #             "content": user_prompt
    #         }]
    #     )
    #     # Extract Claude's repsonse i geuss
    #     text = message.content[0].text if message.content else "{}"
    #     json_text = extract_json(text)
    #     obj = json.loads(json_text)
    #     return AnalyzeResponse(
    #         status=obj.get("status", "mild_risk"),
    #         hint=obj.get("hint", "Analyzer returned incomplete data."),
    #         next_step=obj.get("next_step", "Consider a smaller sub-step."),
    #         watch_out=obj.get("watch_out", []),
    #         try_tests=obj.get("try_tests", []),
    #         confidence=float(obj.get("confidence", 0.5)),
    #         intervention_after_sec=int(obj.get("intervention_after_sec", 30)),
    #     )

    # # Possible errors 
    # except RateLimitError:
    #     return AnalyzeResponse(
    #         status="error", hint="Rate limited—cooling off briefly.",
    #         next_step="Wait ~10–20s and try again.", watch_out=[], try_tests=[],
    #         confidence=0.5, intervention_after_sec=45
    #     )
    # except OverloadedError:
    #     return AnalyzeResponse(
    #         status="error", hint="Service is busy right now.",
    #         next_step="Retry soon. We’ll back off on our side.", watch_out=[], try_tests=[],
    #         confidence=0.5, intervention_after_sec=45
    #     )
    # except (APIError, ValidationError, Exception):
    #     return AnalyzeResponse(
    #         status="error", hint="Analyzer error; try again soon.",
    #         next_step="Review constraints and add a tiny test.",
    #         watch_out=["Edge cases","Time complexity"], try_tests=[],
    #         confidence=0.5, intervention_after_sec=45
    #     )

    # OpenRouter code ; 
    try:
        obj = await chat_completion(user_prompt, SYSTEM_PROMPT, max_tokens=300, temperature=0.2)
        log.info("OBJ FROM chat_completion:\n%s", json.dumps(obj, indent=2, ensure_ascii=False))
        obj = json.loads(extract_json(obj))
        # Map to schema with sensible defaults
        return AnalyzeResponse(
            status=obj.get("status", "mild_risk"),
            hint=obj.get("hint", "Analyzer returned incomplete data."),
            next_step=obj.get("next_step", "Consider a smaller sub-step."),
            watch_out=obj.get("watch_out", []),
            try_tests=obj.get("try_tests", []),
            confidence=obj.get("confidence", 0.5),
            intervention_after_sec=int(obj.get("intervention_after_sec", 30)),
        )
    except Exception as e:
        log.exception("OpenRouter analyze error")
        print(e)
        return AnalyzeResponse(
            status="mild_risk",
            hint="Analyzer error; try again soon.",
            next_step="Review constraints and add a tiny test.",
            watch_out=["Edge cases", "Time complexity"],
            try_tests=[],
            confidence=0.5,
            intervention_after_sec=45,
        )