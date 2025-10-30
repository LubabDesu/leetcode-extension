const BACKEND_URL = "http://localhost:8787";

document.getElementById("refresh").addEventListener("click", fetchProblem);
document.addEventListener("DOMContentLoaded", fetchProblem);
document.addEventListener("DOMContentLoaded", () => {
    fetchProblem();
    const analyzeBtn = document.getElementById("analyze");
    if (analyzeBtn) analyzeBtn.addEventListener("click", analyzeNow);
});

async function scrapeProblemInPage(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: () => {
            // --- TITLE ---
            let title =
                document.querySelector('div[data-cy="question-title"]')
                    ?.innerText ||
                document.querySelector("div.text-title-large")?.innerText ||
                document.querySelector("h1")?.innerText ||
                "";
            title = title.trim().replace(/^#?\d+\.\s*/, "");

            // --- DESCRIPTION ---
            let description = "";
            const descCandidates = [
                document.querySelector('[data-key="description-content"]'),
                document.querySelector(".elfjS"),
                document.querySelector(".question-content__JfgR"),
                document.querySelector(".content__u3I1"),
                document.querySelector("div[class*='question-content']"),
            ];
            for (const el of descCandidates) {
                if (el?.innerText && el.innerText.length > description.length) {
                    description = el.innerText.trim();
                }
            }

            // --- CODE (try Monaco first, then fallbacks) ---
            function getMonacoValue() {
                try {
                    if (window.monaco?.editor?.getEditors) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors?.length) return editors[0].getValue() || "";
                    }
                } catch (e) {}
                return "";
            }

            let code = getMonacoValue();
            if (!code) {
                // Fallback 1: hidden Monaco textarea
                const textAreas = document.querySelectorAll("textarea");
                for (const ta of textAreas) {
                    if (ta.closest(".monaco-editor") && ta.value) {
                        code = ta.value;
                        break;
                    }
                }
            }
            if (!code) {
                // Fallback 2: visible lines (last resort)
                const lines = document.querySelectorAll(".view-lines .view-line");
                if (lines?.length) {
                    code = Array.from(lines)
                        .map((l) => l.textContent || "")
                        .join("\n");
                }
            }

            // --- DETECT LANGUAGE ---
            let language = "";
            const langSelector =
                document.querySelector('div[data-cy="lang-select"]') ||
                document.querySelector(".ant-select-selection-item") ||
                document.querySelector(".select-language") ||
                document.querySelector(".language-selector");
            if (langSelector) language = langSelector.innerText.trim().toLowerCase();

            return { title, description, code, language };
        },
    });

    return result || { title: "", description: "", code: "", language: "" };
}

async function fetchProblem() {
    const titleEl = document.getElementById("title");
    const descEl = document.getElementById("description");
    const codeEl = document.getElementById("code");

    titleEl.textContent = "Fetching...";
    descEl.textContent = "";
    codeEl.textContent = "";

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });
    if (!tab?.url?.includes("leetcode.com/problems/")) {
        titleEl.textContent = "❌ Not on a LeetCode problem page.";
        return;
    }

    const { title, description, code } = await scrapeProblemInPage(tab.id);

    if (title) {
        titleEl.textContent = title;
        descEl.textContent =
            (description || "").slice(0, 200) +
            (description?.length > 200 ? "..." : "");
        codeEl.textContent =
            (code || "").slice(0, 400) +
            (code?.length > 400 ? "\n... (truncated)" : "");
    } else {
        titleEl.textContent = "⚠️ Could not find problem info.";
    }
}

async function analyzeNow() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });
    if (!tab) {
        setStatus("No active tab.");
        return;
    }

    const problemData = await scrapeProblemInPage(tab.id);
    console.log("📦 problemData:", problemData);

    if (!problemData?.title) {
        setStatus("⚠️ Could not find problem data. Try refreshing.");
        return;
    }
    if (!problemData?.code?.trim()) {
        setStatus("⚠️ No code detected. Click into the editor or open the code tab.");
        return;
    }

    const payload = {
        task_context: {
            source: "leetcode",
            title: problemData.title || "",
            constraints: extractConstraints(problemData.description || ""),
            examples: "",
        },
        work_state: {
            language: problemData.language || "python", // ← now dynamic
            code_snapshot: problemData.code || "",
            code_diff: "",
            elapsed_sec: 0,
        },
        signals: {},
    };

    try {
        setStatus("Waiting for model's response…");
        await nextFrame();

        const url = `${BACKEND_URL}/analyze`;
        console.log("[popup] POST", url, payload);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        console.log("[popup] response status:", res.status);

        if (!res.ok) {
            const txt = await res.text();
            setStatus(`Server error: ${res.status} ${txt.slice(0, 140)}`);
            return;
        }

        const data = await res.json();
        console.log("[popup] response JSON:", data);

        renderResult(data);
        setStatus("Done ✅");
    } catch (e) {
        console.error("[popup] fetch failed:", e);
        setStatus("Failed to call backend. Is it running?");
    }
}

function renderResult(r) {
    const el = document.getElementById("result");
    if (!r) {
        el.textContent = "No result.";
        return;
    }
    el.innerHTML = `
        <div><strong>Status:</strong> ${esc(r.status || "")}</div>
        <div><strong>Hint:</strong> ${esc(r.hint || "")}</div>
        <div><strong>Next step:</strong> ${esc(r.next_step || "")}</div>
        ${
            r.watch_out?.length
                ? `<div><strong>Watch out:</strong><ul>${r.watch_out
                      .map((x) => `<li>${esc(x)}</li>`)
                      .join("")}</ul></div>`
                : ""
        }
        ${
            r.try_tests?.length
                ? `<div><strong>Try tests:</strong><ul>${r.try_tests
                      .map((x) => `<li><code>${esc(x)}</code></li>`)
                      .join("")}</ul></div>`
                : ""
        }
        <div style="opacity:.7;margin-top:6px"><small>confidence: ${
            r.confidence ?? "?"
        }, next check in ~${r.intervention_after_sec ?? 30}s</small></div>
    `;
}

// Helper functions
function extractConstraints(desc) {
    if (!desc) return "";
    const m = desc.match(/Constraints?[\s\S]{0,800}/i);
    return m ? m[0].trim() : "";
}

function setStatus(s) {
    const el = document.getElementById("status");
    if (el) el.textContent = s;
}

function nextFrame() {
    return new Promise((res) => requestAnimationFrame(() => res()));
}

function esc(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
