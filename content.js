// (() => {
//   try {
//     // Problem title
//     const title = document.querySelector('div[data-cy="question-title"]')?.innerText?.trim();

//     // Problem description
//     const description = document.querySelector('.content__u3I1.question-content__JfgR')?.innerText?.trim();

//     // Code editor (LeetCode uses Monaco editor)
//     const editor = document.querySelector('.view-line');
//     let code = '';
//     if (editor) {
//       const lines = document.querySelectorAll('.view-lines .view-line');
//       code = Array.from(lines).map(line => line.textContent).join('\n');
//     }

//     // Prepare object
//     const problemData = {
//       title,
//       url: window.location.href,
//       description,
//       code,
//       timestamp: new Date().toISOString()
//     };

//     // Log it or store it
//     console.log("🧩 Scraped LeetCode Data:", problemData);

//     // Save to localStorage (can be replaced with download or API)
//     const existing = JSON.parse(localStorage.getItem("leetcodeScrapes") || "[]");
//     existing.push(problemData);
//     localStorage.setItem("leetcodeScrapes", JSON.stringify(existing));

//   } catch (err) {
//     console.error("Scraper failed:", err);
//   }
// })();

(() => {
  try {
    // Problem title
    const title = document.querySelector('div[data-cy="question-title"]')?.innerText?.trim();

    // Problem description
    const description = document.querySelector('.content__u3I1.question-content__JfgR')?.innerText?.trim();

    // Code editor (LeetCode uses Monaco editor)
    const editor = document.querySelector('.view-line');
    let code = '';
    if (editor) {
      const lines = document.querySelectorAll('.view-lines .view-line');
      code = Array.from(lines).map(line => line.textContent).join('\n');
    }

    // Prepare object
    const problemData = {
      title,
      url: window.location.href,
      description,
      code,
      timestamp: new Date().toISOString()
    };

    // Log it or store it
    console.log("🧩 Scraped LeetCode Data:", problemData);

    // Save to localStorage (can be replaced with download or API)
    const existing = JSON.parse(localStorage.getItem("leetcodeScrapes") || "[]");
    existing.push(problemData);
    localStorage.setItem("leetcodeScrapes", JSON.stringify(existing));

  } catch (err) {
    console.error("Scraper failed:", err);
  }
})();

