(() => {
  console.log("🧠 Feedback listener initialized...");

  const observer = new MutationObserver(() => {
    const resultPanel = document.querySelector('[data-cy="result-status"]');
    if (!resultPanel) return;

    const resultText = resultPanel.innerText?.toLowerCase();
    if (
      resultText.includes("wrong answer") ||
      resultText.includes("runtime error") ||
      resultText.includes("time limit") ||
      resultText.includes("compile error")
    ) {
      const title = document.querySelector('div[data-cy="question-title"]')?.innerText?.trim();
      const codeLines = document.querySelectorAll(".view-lines .view-line");
      const code = Array.from(codeLines).map(line => line.textContent).join("\n");

      const failureData = {
        title,
        code,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      chrome.storage.local.set({ latestFailure: failureData }, () => {
        console.log("✅ Stored failure data in chrome.storage");
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

