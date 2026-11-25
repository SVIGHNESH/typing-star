// Shared by the classic browser scripts and the room server.
const typingTests = (() => {
  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  const wordLists = {
    easy: ["about","after","again","air","also","always","answer","because","before","being","between","book","call","change","city","close","come","could","day","different","do","each","early","end","enough","even","every","family","find","first","form","friend","give","good","great","group","hand","high","home","house","idea","important","keep","know","large","last","life","light","little","long","look","make","may","most","move","need","never","new","next","night","number","often","once","open","other","own","people","place","play","point","right","same","say","school","small","something","start","still","story","take","than","thing","think","time","use","water","way","well","where","which","work","world","year","young"],
    medium: ["ability","accurate","advance","balance","challenge","clarity","common","complex","develop","discover","energy","example","exercise","experience","focus","future","habit","imagine","improve","knowledge","language","memory","motion","observe","pattern","practice","progress","question","rhythm","simple","steady","success","system","train","unique","value","vision","window","across","almost","complete","provide","remain","return","should","through","under","various"],
    hard: ["adventure","algorithm","architecture","assumption","atmosphere","beautiful","characteristic","consequence","consistency","coordinate","discipline","efficient","extraordinary","framework","fundamental","hypothesis","implementation","independent","intelligence","intersection","legitimate","measurement","observation","performance","perspective","phenomenon","possibility","precision","proportion","recognize","repetition","resolution","responsibility","significant","sufficient","transformation","uncertain","unexpected","variation","vocabulary","workflow"]
  };

  function generateWords(count, difficulty) {
    const words = wordLists[difficulty];
    const output = [];
    for (let i = 0; i < count; i++) output.push(randomItem(words));
    return output.join(" ");
  }

  const punctuationDrills = [
    "Ready? Yes! Calm, steady, and clear.",
    "Type; pause: breathe, then begin again.",
    "It's a well-known fact: practice, patience, and focus matter.",
    `She said, "Type slowly." Then she smiled.`,
    "Add 5, 10, and 15; then check the total (20).",
    "Wait - did you see that? (Yes!)",
    "Keep going: accuracy first, speed second.",
    `He asked, "Are we done?" and waited.`,
    "Use commas, periods, and question marks correctly.",
    "Don't rush; slow down, stay calm, and finish.",
    "First, read the line; then type it well!",
    "Is it clear? Good - now try it again."
  ];

  function generatePunctuation(count = 10) {
    const output = [];
    for (let i = 0; i < count; i++) output.push(randomItem(punctuationDrills));
    return output.join(" ");
  }

  const numberDrills = [
    "Call 98765 43210; ask for room 12.",
    "Order 25 units: 10 boxes and 15 packs.",
    "At 09:15, 120 people entered gate 4.",
    "Pay 250; get 50 back, total 200.",
    "Dates: 1/1/2026, 15/8/2025, and 31/12/2026.",
    "Add 5, 10, and 15; the answer is 30.",
    "Rate: 80%, 90%, or 100%? Choose one.",
    "Phone 12345 67890; time is 18:20.",
    "Numbers 1, 2, 3; pairs 12, 34, 56; total 100.",
    "Code 2026-11-25; price 499; quantity 2.",
    "Count 10, 20, 30; then stop at 40!",
    "Invoice 1042: 3 items at 75 = 225."
  ];

  function generateNumbers(count = 10) {
    const output = [];
    for (let i = 0; i < count; i++) output.push(randomItem(numberDrills));
    return output.join(" ");
  }

  const englishPapers = typeof module !== "undefined" ? require("./assets/english-skill-passages") : englishSkillPassages;
  const hindiPapers = typeof module !== "undefined" ? require("./assets/hindi-skill-passages") : hindiSkillPassages;

  function selectSkillPaper(language, previousPaper) {
    const papers = language === "hindi" ? hindiPapers : englishPapers;
    return randomItem(papers.filter(paper => paper !== previousPaper));
  }
  function parseDurationInput(raw) {
    const text = raw.trim().toLowerCase().replace(/\s+/g, "");
    if (!text) return NaN;
    if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
    const units = { h: 3600, m: 60, s: 1 };
    const pattern = /(\d+(?:\.\d+)?)(h|m|s)/g;
    let total = 0;
    let consumed = "";
    let match;
    while ((match = pattern.exec(text))) {
      total += Number(match[1]) * units[match[2]];
      consumed += match[0];
    }
    return consumed === text ? total : NaN;
  }

  function formatDurationLabel(totalSeconds) {
    const s = Math.round(totalSeconds);
    if (s >= 3600) {
      const hours = Math.floor(s / 3600);
      const minutes = Math.round((s % 3600) / 60);
      return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (s >= 60) {
      const minutes = Math.floor(s / 60);
      const seconds = s % 60;
      return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${s}s`;
  }

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (minutes) return `${minutes}:${String(seconds).padStart(2, "0")}`;
    return String(seconds);
  }

  function passage({ mode, difficulty, customPassage, language }, continuation = false) {
    switch (mode) {
      case "paper": return "";
      case "skill": return selectSkillPaper(language).text;
      case "custom": return customPassage || "Practice accuracy by typing a custom passage. Paste your paper above, then select Use paper.";
      case "punctuation": return generatePunctuation(continuation ? 4 : 10);
      case "numbers": return generateNumbers(continuation ? 4 : 10);
      case "quote": return randomItem([
        "It is not that we have a short time to live, but that we waste much of it.",
        "The secret of getting ahead is getting started. The secret of getting started is breaking your complex tasks into small manageable tasks.",
        "Success is the sum of small efforts, repeated day in and day out."
      ]);
      default: return generateWords(continuation ? 50 : mode === "words" ? 180 : 70, difficulty);
    }
  }

  function wrongWords(value, passage) {
    const typed = value.trim().split(/\s+/).filter(Boolean);
    const words = passage.trim().split(/\s+/);
    const completed = /\s$/.test(value) ? typed.length : Math.max(0, typed.length - 1);
    return typed.slice(0, completed).filter((word, i) => word !== words[i]).length;
  }

  return { passage, selectSkillPaper, parseDurationInput, formatDurationLabel, formatClock, wrongWords };
})();
if (typeof module !== "undefined") module.exports = typingTests;
