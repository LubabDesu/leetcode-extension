from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class TaskContext(BaseModel):
    source: Literal["leetcode"]
    title: str = ""
    difficulty: Optional[str] = None
    constraints: Optional[str] = None
    examples: Optional[str] = None

class WorkState(BaseModel):
    language: str
    code_snapshot: str = Field(default="", max_length=20000)
    code_diff: Optional[str] = None
    elapsed_sec: Optional[int] = None

class Signals(BaseModel):
    run_errors: Optional[List[str]] = None
    complexity_guess: Optional[str] = None
    pattern_guess: Optional[str] = None

class AnalyzeRequest(BaseModel):
    task_context: TaskContext
    work_state: WorkState
    signals: Optional[Signals] = None

class AnalyzeResponse(BaseModel):
    status: Literal["error", "on_track", "mild_risk", "medium_risk", "high_risk"]
    hint: str
    next_step: Optional[str] = ""
    watch_out: Optional[List[str]] = []
    try_tests: Optional[List[str]] = []
    confidence: float 
    intervention_after_sec: int = 30
