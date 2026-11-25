const typingTests = (() => {
  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  const englishPapers = typeof module !== "undefined" ? require("./assets/english-skill-passages") : englishSkillPassages;
  const hindiPaper = {
    text: "लोक सेवक का कार्य जनता की सेवा करना है। प्रशासन में ईमानदारी, स्पष्टता और समय की पाबंदी आवश्यक है। हर नागरिक को समान सम्मान मिलना चाहिए और सरकारी कार्य में जवाबदेही होनी चाहिए।",
  };

  function selectSkillPaper(language, previousPaper) {
    if (language === "hindi") return hindiPaper;
    return randomItem(englishPapers.filter(paper => paper !== previousPaper));
  }
  return { selectSkillPaper };
})();
if (typeof module !== "undefined") module.exports = typingTests;
