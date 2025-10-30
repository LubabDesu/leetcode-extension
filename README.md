# LeetCode Helper — Intelligent Live Coding Feedback (In Progress)

A Chrome extension that provides **real-time guidance** while solving LeetCode problems. 
It captures the current problem and code from the Monaco editor, sends them to a backend
analysis service, and displays structured hints directly in the UI — all without switching pages.

> Goal: Help users catch incorrect approaches early and learn faster through continuous feedback.

---

## ✨ Current Features

✅ Detects current LeetCode problem and extracts title + metadata  
✅ Reads code live from Monaco editor using DOM + Chrome APIs  
✅ Sends code + task context to backend for analysis  
✅ Displays structured guidance and next steps in an overlay  
✅ Supports local development via FastAPI backend

---

## 🧠 Analysis Service (Backend)

Implemented using **FastAPI** with a typed REST endpoint:

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """
    Runs heuristic checks first.
    If more guidance is needed, calls an LLM to generate structured feedback.
    """

Backend workflow:
	1.	Convert user code + problem into compact structured prompt
	2.	Call LLM through OpenRouter (DeepSeek / Claude)
	3.	Extract JSON format safely
	4.	Return guidance including:
	•	hint
	•	next_step
	•	try_tests (edge cases)
	•	watch_out (common pitfalls)
	•	confidence score

### Run Locally :
uvicorn backend.main:app --reload --port 8787

## 🧩 Chrome Extension (Frontend)

Built with **Javascript**. It:

- Injects content scripts to access Monaco editor state
- Captures code snapshots on demand
- Communicates via background script → FastAPI REST API
- Renders guidance through a lightweight UI overlay

---

## 🚧 Roadmap

Planned capabilities:
- **Agentic coaching**: automatically trigger analysis every N keystrokes
- **Trajectory risk detection**: warn early if solution path looks incorrect
- Personalized complexity & efficiency feedback  
- Progress tracking over practice sessions  

---

## 🛠 Tech Stack

| Component | Technology |
|----------|------------|
| Frontend | TypeScript, Chrome Extension APIs |
| Backend  | FastAPI, Pydantic |
| AI       | OpenRouter APIs (DeepSeek / Claude models) |
| Logging  | Structured FastAPI logs |
| Integration | Monaco Editor hooks |
