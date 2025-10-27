# Just a quick heuristics check to limit the amount we use the Claude agent, especially for simple problems
from typing import Optional
from schema import AnalyzeRequest, AnalyzeResponse

def _resp(status, hint, next_step="", watch_out=None, try_tests=None, confidence=0.6, wait=30) -> AnalyzeResponse:
    """Convenience helper to format responses consistently."""
    return AnalyzeResponse(
        status=status,
        hint=hint,
        next_step=next_step,
        watch_out=watch_out or [],
        try_tests=try_tests or [],
        confidence=confidence,
        intervention_after_sec=wait,
    )

def quick_rules(req: AnalyzeRequest) -> Optional[AnalyzeResponse]:
    """
    Heuristic checks that can quickly detect likely issues.
    Return an AnalyzeResponse if a rule matches, else None.
    """
    title = (req.task_context.title or "").lower()
    constraints = (req.task_context.constraints or "").lower()
    code = req.work_state.code_snapshot or ""

    # Case 1 : Two sum, but not using hashmaps / dictionaries
    if "two sum" in title and ("dict" not in code and "map" not in code):
        return _resp(
            "mild_risk",
            "Consider a linear-time approach using a memory of complements.",
            "Sketch a one-pass plan checking if complement was seen before.",
            ["Duplicates", "Negative targets"],
            ["[2,7,11,15], target=9", "[3,3], target=6"],
            0.7,
            25,
        )
    # Basic syntax error like not returning in the function
    if "return" not in code and "in place" not in constraints:
        return _resp(
            "high_risk",
            "Your function doesn’t return a result.",
            "Add a return statement that outputs the final value.",
            ["Missing output"],
            [],
            0.8,
            20,
        )
    
    
    