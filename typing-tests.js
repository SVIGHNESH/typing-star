const typingTests = (() => {
  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  const englishPapers = typeof module !== "undefined" ? require("./assets/english-skill-passages") : englishSkillPassages;
  const hindiPapers = typeof module !== "undefined" ? require("./assets/hindi-skill-passages") : hindiSkillPassages;

  function selectSkillPaper(language, previousPaper) {
    const papers = language === "hindi" ? hindiPapers : englishPapers;
    return randomItem(papers.filter(paper => paper !== previousPaper));
  }
  return { selectSkillPaper };
})();
if (typeof module !== "undefined") module.exports = typingTests;
