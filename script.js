(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const store = {
    get: (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value))
  };

  const passages = {
    easy: [
      "Small steps each day build strong habits. Take your time, keep a steady rhythm, and let your hands learn the pattern.",
      "A good desk, a clear screen, and a calm mind make it easier to practice. Aim for accuracy before speed.",
      "The yellow sun rises over the quiet town while birds move from branch to branch and begin a new day."
    ],
    medium: [
      "Precision grows from repetition, not from rushing. Relax your shoulders, watch the screen, and return gently to the home row whenever the pattern becomes uncertain.",
      "Modern work depends on clear communication, and fast, accurate typing gives ideas more room to travel. Practice consistently instead of waiting for motivation.",
      "At the edge of the library, a narrow staircase curved toward the reading room, where maps and field journals rested beside a brass compass."
    ],
    hard: [
      "Although discipline is often mistaken for intensity, the most resilient systems rely on quiet consistency: deliberate practice, immediate feedback, and patient revision.",
      "The engineer questioned the efficient-but-fragile algorithm; one unusual input could fracture the entire workflow, exposing assumptions hidden beneath a polished interface.",
      "Beyond the observation deck, spectral clouds crossed the thermometer-blue sky while scientific instruments measured pressure, temperature, and every plausible variation."
    ]
  };
  const wordLists = {
    easy: ["about","after","again","air","also","always","answer","because","before","being","between","book","call","change","city","close","come","could","day","different","do","each","early","end","enough","even","every","family","find","first","form","friend","give","good","great","group","hand","high","home","house","idea","important","keep","know","large","last","life","light","little","long","look","make","may","most","move","need","never","new","next","night","number","often","once","open","other","own","people","place","play","point","right","same","say","school","small","something","start","still","story","take","than","thing","think","time","use","water","way","well","where","which","work","world","year","young"],
    medium: ["ability","accurate","advance","balance","challenge","clarity","common","complex","develop","discover","energy","example","exercise","experience","focus","future","habit","imagine","improve","knowledge","language","memory","motion","observe","pattern","practice","progress","question","rhythm","simple","steady","success","system","train","unique","value","vision","window","across","almost","complete","provide","remain","return","should","through","under","various"],
    hard: ["adventure","algorithm","architecture","assumption","atmosphere","beautiful","characteristic","consequence","consistency","coordinate","discipline","efficient","extraordinary","framework","fundamental","hypothesis","implementation","independent","intelligence","intersection","legitimate","measurement","observation","performance","perspective","phenomenon","possibility","precision","proportion","recognize","repetition","resolution","responsibility","significant","sufficient","transformation","uncertain","unexpected","variation","vocabulary","workflow"]
  };

  function generateWords(count = 160) {
    const words = wordLists[state.difficulty];
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

  const state = {
    mode: "time", duration: 30, difficulty: "easy", passage: "", typed: "",
    running: false, ended: false, timer: null, startedAt: 0, elapsed: 0, saved: false,
    wrongWords: 0, customPassage: store.get("keystack-custom-paper", "")
  };

  let muted = store.get("keystack-muted", false);
  let audioContext = null;
  const theme = store.get("keystack-theme", "light");
  document.body.classList.toggle("light", theme === "light");
  function setIconButton(id, icon, label) {
    const button = $(id);
    button.querySelector("use").setAttribute("href", "#i-" + icon);
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function renderPreferences() {
    const light = document.body.classList.contains("light");
    setIconButton("#themeButton", light ? "moon" : "sun", light ? "Use dark theme" : "Use light theme");
    setIconButton("#soundButton", muted ? "mute" : "sound", muted ? "Enable sounds" : "Mute sounds");
    document.querySelector('meta[name="theme-color"]').content = light ? "#f6f7f9" : "#131824";
  }
  renderPreferences();

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function playTone(ok = true) {
    if (muted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.frequency.value = ok ? 560 : 170;
      gain.gain.setValueAtTime(.025, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .045);
      osc.connect(gain).connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + .05);
    } catch {}
  }

  function getDuration() {
    if (state.mode === "time" || state.mode === "custom") return state.duration;
    if (state.mode === "words") return 60;
    if (state.mode === "punctuation") return 60;
    if (state.mode === "numbers") return 60;
    return 90;
  }

  function newPassage(focusInput = true) {
    if (state.mode === "custom") {
      state.passage = state.customPassage || "Practice accuracy by typing a custom passage. Paste your paper above, then select Use paper.";
    } else if (state.mode === "punctuation") {
      state.passage = generatePunctuation();
    } else if (state.mode === "numbers") {
      state.passage = generateNumbers();
    } else if (state.mode === "quote") {
      state.passage = randomItem([
        "It is not that we have a short time to live, but that we waste much of it.",
        "The secret of getting ahead is getting started. The secret of getting started is breaking your complex tasks into small manageable tasks.",
        "Success is the sum of small efforts, repeated day in and day out."
      ]);
    } else {
      state.passage = state.mode === "words" ? generateWords(180) : generateWords(70);
    }
    resetRun(focusInput);
  }

  function resetRun(focusInput = true) {
    state.typed = "";
    state.running = false;
    state.ended = false;
    clearInterval(state.timer);
    state.elapsed = 0;
    state.saved = false;
    $("#testStatus").textContent = "Ready";
    $("#testStatus").classList.remove("active");
    $("#typingInput").value = "";
    $("#resultPanel").hidden = true;
    renderTime(getDuration());
    $("#wpmValue").textContent = "0";
    $("#accuracyValue").textContent = "100";
    state.wrongWords = 0;
    $("#wrongWordsValue").textContent = "0";
    $("#resultHeading").textContent = "Session complete";
    $("#typedCount").textContent = "0";
    $("#totalCount").textContent = state.passage.length;
    renderPassage();
    $$(".test-controls button[data-mode], .test-controls button[data-duration], .test-controls button[data-difficulty]").forEach(button => {
      button.setAttribute("aria-pressed", button.classList.contains("selected"));
    });
    if (focusInput && window.matchMedia("(pointer: fine)").matches) $("#typingInput").focus({ preventScroll: true });
  }

  function renderPassage() {
    const chars = [...state.passage].map((char, i) => {
      let cls = "";
      if (i < state.typed.length) cls = state.typed[i] === char ? "correct" : "incorrect";
      else if (i === state.typed.length) cls = "current";
      return `<span class="${cls}">${escapeHtml(char)}</span>`;
    }).join("");
    $("#passage").innerHTML = chars;
    const current = $("#passage .current");
    if (current) {
      const top = current.offsetTop;
      const target = top - $("#passage").clientHeight / 3;
      $("#passage").scrollTo({ top: Math.max(0, target), behavior: "instant" });
    }
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
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

  function renderTime(seconds) {
    const clock = formatClock(seconds);
    $("#timeValue").textContent = clock;
    $("#timeValue").classList.toggle("long-clock", clock.length > 5);
    $("#timeUnit").hidden = Math.ceil(seconds) >= 60;
  }

  function startTest() {
    if (state.running || state.ended) return;
    state.running = true;
    $("#testStatus").textContent = "Typing";
    $("#testStatus").classList.add("active");
    state.startedAt = Date.now();
    state.timer = setInterval(tick, 100);
  }

  function tick() {
    state.elapsed = (Date.now() - state.startedAt) / 1000;
    const limit = getDuration();
    let remaining;
    if (state.mode === "time") {
      remaining = Math.max(0, limit - state.elapsed);
      renderTime(remaining);
      if (remaining <= 0) {
        state.elapsed = limit;
        finishTest();
      }
    } else {
      remaining = Math.max(0, limit - state.elapsed);
      renderTime(remaining);
      if (remaining <= 0) finishTest();
    }
  }

  function metrics() {
    const elapsed = Math.max(state.elapsed || (state.running ? (Date.now() - state.startedAt) / 1000 : 0), 1);
    const chars = state.typed.length;
    const correct = [...state.typed].filter((c, i) => c === state.passage[i]).length;
    const wpm = Math.round((correct / 5) / (elapsed / 60));
    const accuracy = chars ? Math.round(correct / chars * 100) : 100;
    return { wpm: Math.max(0, wpm), accuracy, correct, chars };
  }

  function updateLive() {
    const m = metrics();
    $("#wpmValue").textContent = m.wpm;
    $("#accuracyValue").textContent = m.accuracy;
  }

  const MAX_WRONG_WORDS = 10;

  function updateWrongWords(value) {
    const typedWords = value.trim().split(/\s+/).filter(Boolean);
    const passageWords = state.passage.trim().split(/\s+/).filter(Boolean);
    const completed = /\s$/.test(value) ? typedWords.length : Math.max(0, typedWords.length - 1);
    let wrong = 0;
    for (let i = 0; i < completed; i++) {
      if ((typedWords[i] || "") !== (passageWords[i] || "")) wrong++;
    }
    state.wrongWords = wrong;
    $("#wrongWordsValue").textContent = wrong;
  }

  $("#typingInput").addEventListener("input", (e) => {
    if (state.ended) return;
    if (!state.running) startTest();
    const value = e.target.value;
    state.typed = value.slice(0, state.passage.length);
    e.target.value = state.typed;
    const last = state.typed.at(-1);
    const idx = state.typed.length - 1;
    playTone(last === state.passage[idx]);
    $("#typedCount").textContent = state.typed.length;
    renderPassage();
    updateLive();
    updateWrongWords(state.typed);
    if (state.wrongWords >= MAX_WRONG_WORDS) {
      finishTest("wrong-words");
      return;
    }
    if (state.mode !== "custom" && state.mode !== "quote" && state.typed.length > state.passage.length - 160) {
      const extra = state.mode === "punctuation" ? generatePunctuation(4)
        : state.mode === "numbers" ? generateNumbers(4)
        : generateWords(50);
      state.passage += " " + extra;
      $("#totalCount").textContent = state.passage.length;
    }
    if (state.typed.length >= state.passage.length) finishTest();
  });

  function finishTest(reason) {
    if (state.ended || state.saved) return;
    state.ended = true;
    $("#testStatus").textContent = "Finished";
    $("#testStatus").classList.remove("active");
    state.running = false;
    clearInterval(state.timer);
    $("#resultHeading").textContent = reason === "wrong-words" ? "Session ended · 10 wrong words" : "Session complete";
    if (!state.elapsed && state.startedAt) state.elapsed = (Date.now() - state.startedAt) / 1000;
    if (state.elapsed === 0) state.elapsed = 1;
    const m = metrics();
    const errors = m.chars - m.correct;
    $("#resultWpm").textContent = m.wpm;
    $("#resultAccuracy").textContent = `${m.accuracy}%`;
    $("#resultCharacters").textContent = `${m.correct}/${m.chars}`;
    $("#resultErrors").textContent = errors;
    const totalSeconds = Math.max(1, Math.round(state.elapsed));
    const timeText = totalSeconds >= 3600
      ? `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`
      : totalSeconds >= 60
        ? `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
        : `${totalSeconds}s`;
    $("#resultTime").textContent = timeText;
    $("#resultGrade").textContent = m.accuracy >= 98 && m.wpm >= 60 ? "S" : m.accuracy >= 95 ? "A" : m.accuracy >= 85 ? "B" : "C";
    $("#resultPanel").hidden = false;

    const results = store.get("keystack-results", []);
    const duration = getDuration();
    const run = {
      wpm: m.wpm, accuracy: m.accuracy, chars: m.chars, errors,
      mode: state.mode, duration, difficulty: state.difficulty,
      elapsed: totalSeconds,
      date: new Date().toISOString()
    };
    results.unshift(run);
    const savedResults = results.slice(0, 30);
    store.set("keystack-results", savedResults);
    state.saved = true;
    const pb = Math.max(store.get("keystack-pb", 0), m.wpm);
    store.set("keystack-pb", pb);
    renderPersonalBest();
    renderHistory();
    setHistoryOpen(true);
    showToast(reason === "wrong-words" ? "Session ended: 10 wrong words" : `Result saved · ${m.wpm} WPM`);
    $("#typingInput").blur();
    $("#resultPanel").scrollIntoView({ behavior: "smooth", block: "center" });
    playTone(reason !== "wrong-words");
  }

  $("#typingArea").addEventListener("click", () => $("#typingInput").focus());
  $("#restartButton").addEventListener("click", () => resetRun());
  $("#newTextButton").addEventListener("click", () => newPassage());
  $("#resultRetry").addEventListener("click", () => resetRun());
  $("#resultNew").addEventListener("click", () => newPassage());

  document.addEventListener("keydown", (e) => {
    if (!$("#testView").classList.contains("active")) return;
    if (e.key === "Tab" && !e.shiftKey && e.target === $("#typingInput") && state.running) {
      e.preventDefault();
      resetRun();
    } else if (e.key === "Escape") {
      resetRun();
    } else if (e.target === document.body && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      $("#typingInput").focus({ preventScroll: true });
    }
  });


  $("#modeControls").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    $$("#modeControls button").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    state.mode = button.dataset.mode;
    const fixedDuration = state.mode !== "time" && state.mode !== "custom";
    $$("#durationControls button").forEach(option => {
      option.disabled = fixedDuration;
      option.classList.toggle("selected", Number(option.dataset.duration) === getDuration());
    });
    $(".duration-details").hidden = fixedDuration;
    $("#customDuration").disabled = state.mode !== "time" && state.mode !== "custom";
    $("#applyDuration").disabled = state.mode !== "time" && state.mode !== "custom";
    $("#customPaperPanel").hidden = state.mode !== "custom";
    newPassage();
  });
  $("#durationControls").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    $$("#durationControls button").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    state.duration = Number(button.dataset.duration);
    $("#customDuration").value = "";
    newPassage();
  });
  $("#applyDuration").addEventListener("click", () => {
    const parsed = parseDurationInput($("#customDuration").value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("Use a format like 45s, 4m, or 2h");
      return;
    }
    state.duration = Math.min(Math.round(parsed), 86400);
    $$("#durationControls button").forEach(b => b.classList.remove("selected"));
    newPassage();
    showToast(`Duration set to ${formatDurationLabel(state.duration)}`);
  });
  $("#customDuration").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#applyDuration").click();
  });
  $("#applyPaper").addEventListener("click", () => {
    const paper = $("#customPaper").value.trim();
    if (paper.length < 10) {
      showToast("Enter at least 10 characters");
      return;
    }
    state.customPassage = paper;
    store.set("keystack-custom-paper", paper);
    newPassage();
    showToast("Custom paper loaded");
  });
  $("#difficultyControls").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    $$("#difficultyControls button").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    state.difficulty = button.dataset.difficulty;
    newPassage();
  });

  function renderPersonalBest() {
    const pb = store.get("keystack-pb", 0);
    $("#pbValue").textContent = pb ? `${pb} WPM` : "—";
  }
  function renderHistory() {
    const results = store.get("keystack-results", []);
    $("#clearHistory").hidden = !results.length;
    $("#historyList").innerHTML = results.length ? results.slice(0, 8).map(r => {
      const date = new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const elapsed = Number(r.elapsed ?? r.duration ?? 0);
      const timeText = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
      return `<div class="history-item"><span>${date} · ${r.mode}</span><strong>${r.wpm} WPM</strong><span>${r.accuracy}% acc</span><span>${r.errors} errors</span><span>${timeText}</span><span>${r.difficulty}</span></div>`;
    }).join("") : `<p class="empty-history"><svg class="icon" aria-hidden="true"><use href="#i-history"/></svg>Finish a test to see your results here.</p>`;
  }
  function setHistoryOpen(open) {
    $("#historyPanel").classList.toggle("open", open);
    $("#historyToggle").setAttribute("aria-expanded", open);
    $("#historyToggle").textContent = open ? "Hide history" : "View history";
  }
  $("#historyToggle").addEventListener("click", () => {
    setHistoryOpen(!$("#historyPanel").classList.contains("open"));
  });
  $("#clearHistory").addEventListener("click", () => {
    store.set("keystack-results", []);
    renderHistory();
  });

  $("#themeButton").addEventListener("click", () => {
    document.body.classList.toggle("light");
    const light = document.body.classList.contains("light");
    store.set("keystack-theme", light ? "light" : "dark");
    renderPreferences();
  });
  $("#soundButton").addEventListener("click", () => {
    muted = !muted;
    store.set("keystack-muted", muted);
    renderPreferences();
    showToast(muted ? "Sound muted" : "Sound on");
  });

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
  }

  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    $$(".tab").forEach(t => t.setAttribute("aria-current", t === tab ? "page" : "false"));
    $$(".view").forEach(v => v.classList.remove("active"));
    $(`#${tab.dataset.view}View`).classList.add("active");
    document.body.dataset.view = tab.dataset.view;
    if (tab.dataset.view !== "learn") {
      stopGame();
    } else if (lessons[selectedLesson] && lessons[selectedLesson].kind === "game") {
      renderLesson();
    }
    if (tab.dataset.view !== "games") {
      stopArcade();
    } else {
      showGameGrid();
    }
  }));
  $("#brandButton").addEventListener("click", () => {
    $('.tab[data-view="test"]').click();
  });

  const skillPapers = {
    english: "Public administration exists to serve people with fairness, speed, and accountability. Good officials communicate clearly, protect public resources, and make decisions with care. A disciplined office gives every citizen equal respect and provides reliable information at the right time.",
    hindi: "लोक सेवक का कार्य जनता की सेवा करना है। प्रशासन में ईमानदारी, स्पष्टता और समय की पाबंदी आवश्यक है। हर नागरिक को समान सम्मान मिलना चाहिए और सरकारी कार्य में जवाबदेही होनी चाहिए।",
  };
  let skillLanguage = "english";

  function renderSkillPaper(text, typedChars) {
    $("#skillPassage").innerHTML = [...text].map((char, i) => {
      if (i >= typedChars.length) return i === typedChars.length ? `<span class="current">${escapeHtml(char)}</span>` : escapeHtml(char);
      return typedChars[i] === char
        ? `<span class="correct">${escapeHtml(char)}</span>`
        : `<span class="incorrect">${escapeHtml(char)}</span>`;
    }).join("");
    const current = $("#skillPassage .current");
    if (current) {
      const target = current.offsetTop - $("#skillPassage").clientHeight / 3;
      $("#skillPassage").scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }
  }

  function setupTimedTest(view, { onTick, reset, finish, onInput }) {
    const editor = view.querySelector("[data-editor]");
    const start = view.querySelector("[data-start]");
    const clock = view.querySelector("[data-time]");
    const status = view.querySelector("[data-status]");
    const countdown = view.querySelector("[data-countdown]");
    const controls = view.querySelectorAll(".candidate-strip input, .language-switch button, #clearPaperText");
    const duration = 600;
    let startedAt = 0;
    let acceptedText = "";
    let timer;

    function setLocked(locked) {
      view.querySelector(".skill-shell").classList.toggle("locked", locked);
      controls.forEach(control => control.disabled = locked);
      start.disabled = locked;
    }

    function showReady() {
      clock.textContent = "10:00";
      status.textContent = "Ready";
      start.textContent = "Start Test";
      reset?.();
    }

    function update() {
      const elapsed = Math.min(duration, (Date.now() - startedAt) / 1000);
      const remaining = Math.ceil(duration - elapsed);
      clock.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
      const complete = onTick?.(editor.value, elapsed);
      if (remaining && !complete) return;

      clearInterval(timer);
      startedAt = 0;
      editor.readOnly = true;
      setLocked(false);
      status.textContent = "Complete";
      start.textContent = "Try again";
      finish(elapsed);
    }

    function startTest() {
      if (start.disabled) return;
      showReady();
      setLocked(true);
      status.textContent = "Get ready";
      countdown.hidden = false;
      const beginsAt = Date.now() + 5000;
      countdown.querySelector("span").textContent = "5";
      timer = setInterval(() => {
        if (!startedAt) {
          const seconds = Math.ceil((beginsAt - Date.now()) / 1000);
          if (seconds > 0) {
            countdown.querySelector("span").textContent = seconds;
            return;
          }
          countdown.hidden = true;
          startedAt = beginsAt;
          acceptedText = "";
          editor.value = "";
          onInput?.("");
          editor.readOnly = false;
          status.textContent = "In progress";
          if (view.classList.contains("active")) editor.focus();
        }
        update();
      }, 250);
    }

    function expired() {
      return startedAt && Date.now() >= startedAt + duration * 1000;
    }
    function enforceDeadline(event) {
      if (expired()) {
        event.preventDefault();
        update();
      }
    }
    editor.addEventListener("keydown", enforceDeadline, true);
    editor.addEventListener("beforeinput", enforceDeadline, true);
    editor.addEventListener("input", event => {
      if (!startedAt || expired()) {
        editor.value = acceptedText;
        if (startedAt) update();
        return;
      }
      acceptedText = editor.value;
      onInput?.(acceptedText, event);
      update();
    });
    start.addEventListener("click", startTest);
    return { showReady, startTest };
  }

  const skillTest = setupTimedTest($("#skillView"), {
    onTick(value, elapsed) {
      const typed = [...value];
      const text = [...skillPapers[skillLanguage]];
      const correct = typed.filter((char, i) => char === text[i]).length;
      $("#skillAccuracy").textContent = typed.length ? `${Math.round(correct / typed.length * 100)}%` : "100%";
      $("#skillErrors").textContent = typed.length - correct;
      $("#skillWpm").textContent = Math.round(correct / 5 * 60 / Math.max(1, elapsed));
      return typed.length >= text.length;
    },
    onInput(value) {
      renderSkillPaper(skillPapers[skillLanguage], [...value]);
    },
    reset() {
      $("#skillInput").value = "";
      $("#skillWpm").textContent = "0";
      $("#skillResult").textContent = "Waiting";
      $("#skillResult").className = "";
      $("#skillResultPanel").hidden = true;
      $("#skillAccuracy").textContent = "100%";
      $("#skillErrors").textContent = "0";
      renderSkillPaper(skillPapers[skillLanguage], []);
    },
    finish(elapsed) {
      const wpm = Number($("#skillWpm").textContent);
      const result = wpm >= 35 ? "PASS" : "FAIL";
      $("#skillResult").textContent = result;
      $("#skillResult").className = result.toLowerCase();
      $("#skillResultPanel").hidden = false;
      $("#skillResultPanel").className = `skill-result-panel ${result.toLowerCase()}`;
      $("#skillResultStatus").textContent = result;
      $("#skillResultWpm").textContent = wpm;
      $("#skillResultAccuracy").textContent = $("#skillAccuracy").textContent;
      $("#skillResultErrors").textContent = $("#skillErrors").textContent;
      $("#skillResultTime").textContent = formatClock(Math.ceil(elapsed));
    }
  });
  $("#skillResultRetry").addEventListener("click", skillTest.startTest);
  $("#skillPassage").addEventListener("click", () => $("#skillInput").focus());
  $("#skillLanguage").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    $$("#skillLanguage button").forEach(b => b.classList.toggle("active", b === button));
    skillLanguage = button.dataset.language;
    $("#skillLanguageValue").textContent = button.textContent;
    $("#skillPaperLabel").textContent = `${button.textContent} typing passage`;
    skillTest.showReady();
  });
  skillTest.showReady();

  const paperDraftKey = "keystack-skill-custom";
  const paperInput = $("#paperInput");
  paperInput.value = store.get(paperDraftKey, "");
  if (paperInput.value) $("#paperView [data-start]").textContent = "Start new test";
  const paperReview = createPaperReview(paperInput);
  const paperTest = setupTimedTest($("#paperView"), {
    reset: paperReview.reset,
    onInput(value, event) {
      paperReview.record(value, event);
      store.set(paperDraftKey, value);
    },
    finish: paperReview.finish
  });
  $("#clearPaperText").addEventListener("click", () => {
    paperInput.value = "";
    store.set(paperDraftKey, "");
    paperTest.showReady();
  });

  const curriculum = [
    {
      stage: "Foundation",
      instruction: "Keep your fingers anchored on the home row and return after every reach.",
      drills: [
        { title: "Home row anchors", keys: "asdf jkl;", text: "asdf jkl; asdf jkl; ff jj dd kk ss ll aa ;;" },
        { title: "Left hand home", keys: "asdf", text: "asdf asdf dad fad lad sad fall flask" },
        { title: "Right hand home", keys: "jkl;", text: "jkl; jkl; ask all lads; a lass; a dad" },
        { title: "Index fingers", keys: "fj gh", text: "fj jf fj jf fg jh gh fj jh gf" },
        { title: "Middle fingers", keys: "dk", text: "dk dk kd dk dk kd dd kk d k" },
        { title: "Ring fingers", keys: "sl", text: "sl sl ls sl ls sl ss ll s l" },
        { title: "Pinky keys", keys: "a;", text: "a; ;a a; ;a aa ;; a ; a ;" },
        { title: "Home row words", keys: "asdf jkl;", text: "ask dad lad fall glad hall glass salad flask" },
        { title: "Home row review", keys: "asdf jkl;", text: "a lad asks dad; dad asks a lad; all fall" },
        { title: "Home row rhythm", keys: "asdf jkl;", text: "asdf jkl; asdf jkl; sad lad fall glad" },
        { title: "Home row accuracy", keys: "asdf jkl;", text: "half a glass; a glad dad; all lads ask" },
        { title: "Home row speed", keys: "asdf jkl;", text: "as a lad asks dad, dad has a flask; all fall" }
      ]
    },
    {
      stage: "Top row",
      instruction: "Reach up with one finger at a time and return to the home row.",
      drills: [
        { title: "Top row anchors", keys: "qwertyuiop", text: "qwer tyui op qwer tyui op q w e r t y u i o p" },
        { title: "Left top keys", keys: "qwer", text: "qwer qwer rewq wert q w e r" },
        { title: "Right top keys", keys: "uiop", text: "uiop uiop poiu yuiop u i o p" },
        { title: "Index reach", keys: "rt yu", text: "rt yu rt yu fr ju ft jy rt yu" },
        { title: "Middle reach", keys: "e i", text: "ded kik ded kik ed ik de ki" },
        { title: "Ring reach", keys: "w o", text: "sw lo sw lo ws ol sw lo" },
        { title: "Pinky reach", keys: "q p", text: "aq ;p aq ;p qa p; aq ;p" },
        { title: "Top row words", keys: "qwertyuiop", text: "quiet quite tree type write your power" },
        { title: "Top row drill", keys: "qwertyuiop", text: "we were quite quiet; you type your poetry" },
        { title: "Top row review", keys: "qwertyuiop", text: "your quiet tree; write a few words" },
        { title: "Top row accuracy", keys: "qwertyuiop", text: "try to type quieter every time" },
        { title: "Top row speed", keys: "qwertyuiop", text: "we quietly write poetry; your output is quiet" }
      ]
    },
    {
      stage: "Bottom row",
      instruction: "Reach down gently and keep your wrists relaxed.",
      drills: [
        { title: "Bottom row anchors", keys: "zxcv bnm,", text: "zxcv bnm, zx cv bn m, z x c v b n m ," },
        { title: "Left bottom keys", keys: "zxcv", text: "zxcv zxcv cxz vcz z x c v" },
        { title: "Right bottom keys", keys: "bnm,", text: "bnm, bnm, mnb ,mn b n m ," },
        { title: "Index reach", keys: "fv jn", text: "fv jn fv jn bf nj fv jn" },
        { title: "Middle reach", keys: "c ,", text: "cd c, dk k, cd c, dc ,c" },
        { title: "Ring reach", keys: "x .", text: "sx l. sx l. xs .l sx l." },
        { title: "Pinky reach", keys: "z /", text: "az ;/ az ;/ za /; az ;/" },
        { title: "Bottom row words", keys: "zxcv bnm,", text: "zinc cocoa vex zebra calm bomb name" },
        { title: "Bottom row drill", keys: "zxcv bnm,", text: "a calm zebra can vex a bomb" },
        { title: "Bottom row review", keys: "zxcv bnm,", text: "come back and name a calm zebra" },
        { title: "Bottom row accuracy", keys: "zxcv bnm,", text: "mix every bottom key with care" },
        { title: "Bottom row speed", keys: "zxcv bnm,", text: "zinc, cocoa, zebra, calm, bomb, name, vex" }
      ]
    },
    {
      stage: "Punctuation",
      instruction: "Keep your rhythm while reaching for marks and symbols.",
      drills: [
        { title: "Period and comma", keys: ".,", text: "calm. name, vex. zinc, cocoa. zebra, bomb." },
        { title: "Question mark", keys: "?", text: "Are you ready? Can we begin? Is it calm?" },
        { title: "Exclamation mark", keys: "!", text: "Hello! Ready! Let us begin! Great!" },
        { title: "Semicolon and colon", keys: ";:", text: "ready; set; go: calm: steady: begin:" },
        { title: "Apostrophe", keys: "'", text: "it's a calm day; we're ready; don't rush" },
        { title: "Hyphen", keys: "-", text: "well-being; calm-mind; read-only; day-to-day" },
        { title: "Quotation marks", keys: '"', text: `She said, "type slowly." Then, "breathe."` },
        { title: "Parentheses", keys: "()", text: "(calm) (steady) (ready) (begin) (focus)" },
        { title: "Slash and symbols", keys: "/", text: "and/or; read/write; a/b; yes/no; in/out" },
        { title: "Punctuation review", keys: ".,?!", text: "Ready? Yes! Calm, steady, and clear." },
        { title: "Punctuation rhythm", keys: ".,;:", text: "Type, breathe; type: repeat; rest, then begin." },
        { title: "Punctuation speed", keys: ".,?!;:", text: "Ready? Set! Go: type, rest; repeat! Done." }
      ]
    },
    {
      stage: "Capitals",
      instruction: "Use the opposite pinky for Shift and return it to the home row.",
      drills: [
        { title: "Shift and home keys", keys: "ASDF JKL;", text: "Aa Ss Dd Ff Jj Kk Ll ;: Aa Ss Dd Ff" },
        { title: "Capital names", text: "Amit, Bina, Chetan, Divya, Esha, Farah" },
        { title: "Sentence starts", text: "The calm day. We are ready. Type slowly." },
        { title: "Proper nouns", text: "Delhi, Mumbai, Chennai, Kolkata, Pune" },
        { title: "Acronyms", text: "WPM, CPU, HTML, CSS, PDF, URL" },
        { title: "Mixed capitals", text: "A quiet room. A steady hand. A clear mind." },
        { title: "Questions with capitals", text: "Are you ready? Yes, I am. Can we start? Yes." },
        { title: "Title case", text: "The Quiet Room; A Steady Hand; A Clear Mind" },
        { title: "Capital review", text: "Ravi and Meera type in Delhi every Monday." },
        { title: "Capital speed", text: "On Friday, Asha and I will visit Mumbai." }
      ]
    },
    {
      stage: "Common words",
      instruction: "Build muscle memory for the words you type most.",
      drills: [
        { title: "Everyday starters", text: "the and for with that this from have your about" },
        { title: "Short words", text: "a an to of in on at by is it be as we he" },
        { title: "Common verbs", text: "make take give find think know come look work" },
        { title: "Common nouns", text: "time year people way day thing man world life" },
        { title: "Common adjectives", text: "good new first last long great little own other" },
        { title: "Common adverbs", text: "not now then also just very well even still" },
        { title: "Connecting words", text: "and but because while when since though unless" },
        { title: "Word pairs", text: "each other; more than; such as; as well; of course" },
        { title: "Word triples", text: "one of the; part of the; in the end; at the same time" },
        { title: "Common words review", text: "the more you type, the better you get at every word" },
        { title: "Common words rhythm", text: "keep a steady pace and let each word flow" },
        { title: "Common words speed", text: "type the words you use most and build real speed" }
      ]
    },
    {
      stage: "Sentences",
      instruction: "Read ahead and type in calm, even phrases.",
      drills: [
        { title: "Short sentences", text: "The room is calm. My hands are steady. I can type." },
        { title: "Daily sentences", text: "I practice every day. Small steps bring real progress." },
        { title: "Focus sentences", text: "Keep your eyes on the screen and your hands relaxed." },
        { title: "Accuracy sentences", text: "Slow down for accuracy, then let the speed follow." },
        { title: "Rhythm sentences", text: "Type with a steady rhythm and breathe between lines." },
        { title: "Longer sentences", text: "A calm mind and a steady hand will always beat reckless speed." },
        { title: "Practice sentences", text: "Practice a little every day and the keys will feel natural." },
        { title: "Work sentences", text: "Write your notes, send your mail, and type with confidence." },
        { title: "Study sentences", text: "Read the whole line before you begin to type it." },
        { title: "Review sentences", text: "Mistakes are useful because they show you what to fix." },
        { title: "Sentence rhythm", text: "Breathe in, type a line, breathe out, and begin again." },
        { title: "Sentence speed", text: "The more calmly you type, the faster your hands will move." }
      ]
    },
    {
      stage: "Numbers",
      instruction: "Reach from the home row and look at the screen, not the keys.",
      drills: [
        { title: "Number row anchors", keys: "1234567890", text: "12345 67890 12345 67890 1 2 3 4 5" },
        { title: "Left number keys", keys: "12345", text: "12345 12345 54321 12345 1 2 3 4 5" },
        { title: "Right number keys", keys: "67890", text: "67890 67890 09876 67890 6 7 8 9 0" },
        { title: "Number pairs", text: "12 34 56 78 90 21 43 65 87 09" },
        { title: "Dates", text: "1/1/2026 15/8/2025 31/12/2026 25/11/2026" },
        { title: "Times", text: "09:15 10:30 12:45 15:00 18:20 21:05" },
        { title: "Amounts", text: "5 10 25 50 100 250 500 1000" },
        { title: "Phone style", text: "98765 43210 12345 67890" },
        { title: "Number sentences", text: "I typed 120 words in 2 minutes on day 5." },
        { title: "Number speed", text: "Add 5 and 10 to get 15, then 20, 40, 80, 160." }
      ]
    },
    {
      stage: "Speed drills",
      instruction: "Stay relaxed and let accuracy lead the way.",
      drills: [
        { title: "Speed: home row", text: "asdf jkl; sad lad fall glad ask dad all" },
        { title: "Speed: top row", text: "quiet tree type write your power output" },
        { title: "Speed: bottom row", text: "zinc cocoa zebra calm bomb name vex" },
        { title: "Speed: mixed keys", text: "type every word with a calm and steady hand" },
        { title: "Speed: common words", text: "the and for with that this from have your" },
        { title: "Speed: short bursts", text: "go now; type fast; stay calm; keep pace" },
        { title: "Speed: repeated words", text: "type type type calm calm calm steady steady" },
        { title: "Speed: rhythm", text: "tap tap tap, pause, tap tap tap, breathe, repeat" },
        { title: "Speed: accuracy first", text: "clean strokes beat fast strokes every single time" },
        { title: "Speed: endurance", text: "keep typing for a full minute without losing your rhythm" },
        { title: "Speed: sprint", text: "quick hands, quiet keys, steady eyes, calm mind" },
        { title: "Speed: final push", text: "one more line, one more breath, one more clean run" }
      ]
    },
    {
      stage: "Paragraphs",
      instruction: "Keep a steady pace across several sentences.",
      drills: [
        { title: "Paragraph: morning", text: "The morning is quiet and the room is calm. I sit down, place my hands on the home row, and begin to type. Each word feels a little easier than the last." },
        { title: "Paragraph: practice", text: "Practice does not have to be long. A few focused minutes each day will build speed and accuracy. The key is to stay relaxed and keep your eyes on the screen." },
        { title: "Paragraph: focus", text: "Good typing comes from small habits. Keep your back straight, your wrists light, and your fingers close to the keys. When you make a mistake, correct it and move on." },
        { title: "Paragraph: accuracy", text: "Accuracy matters more than speed at the start. Type each word completely and avoid rushing. As your hands learn the shape of the keys, speed will arrive on its own." },
        { title: "Paragraph: rhythm", text: "Think of typing as a rhythm rather than a race. Breathe slowly, keep an even pace, and let each line flow into the next. A calm hand is a fast hand." },
        { title: "Paragraph: work", text: "Most of the writing you do each day is ordinary: notes, messages, and short reports. Practicing those words now will make your daily work feel lighter." },
        { title: "Paragraph: study", text: "When you study, read the sentence before you type it. Your eyes should stay a step ahead of your fingers. This habit alone can improve both speed and accuracy." },
        { title: "Paragraph: patience", text: "Progress is rarely a straight line. Some days feel fast and others feel slow. Keep showing up, and the average will quietly move in your favour." },
        { title: "Paragraph: endurance", text: "A long passage tests more than your fingers. It tests your focus and your breathing. Settle into a comfortable pace and protect it from start to finish." },
        { title: "Paragraph: review", text: "Look back at your mistakes and name them. Is a certain finger slow? Is a punctuation mark awkward? Then practice that one small thing until it feels easy." },
        { title: "Paragraph: confidence", text: "Confidence comes from repetition. The more often you type a line, the less you have to think about it. Soon your hands will know the way without being told." },
        { title: "Paragraph: mastery", text: "Touch typing is a quiet skill that pays for itself many times over. Once your hands know the keys, your attention is free for the ideas themselves, and writing becomes much easier." }
      ]
    },
    {
      stage: "Mastery",
      instruction: "Combine every skill with calm, consistent practice.",
      drills: [
        { title: "Pangram: fox", text: "The quick brown fox jumps over the lazy dog." },
        { title: "Pangram: box", text: "Pack my box with five dozen liquor jugs." },
        { title: "Pangram: zebras", text: "How vexingly quick daft zebras jump!" },
        { title: "Pangram: sphinx", text: "Sphinx of black quartz, judge my vow." },
        { title: "Patience", text: "All good things come to those who practice with patience." },
        { title: "Calm focus", text: "A calm hand and a clear mind will carry you through any test." },
        { title: "Read first", text: "Type the sentence you see, not the one you expect to see." },
        { title: "Daily effort", text: "Small daily effort turns awkward keys into natural movement." },
        { title: "Instrument", text: "The keyboard is a tool, and practice turns it into an instrument." },
        { title: "Posture", text: "Keep your eyes forward, your shoulders soft, and your rhythm even." },
        { title: "Accuracy wins", text: "When speed and accuracy disagree, always let accuracy win." },
        { title: "Small victory", text: "Every clean word is a small victory worth repeating." },
        { title: "Protect the habit", text: "You have built the habit; now protect it with steady practice." },
        { title: "Quiet focus", text: "Touch typing is not about the hands alone but about quiet focus." }
      ]
    }
  ];
  const gamePlan = {
    "Foundation": {
      title: "Home row rain",
      mode: "falling",
      words: ["as", "dad", "lad", "sad", "fall", "glad", "ask", "all", "flask", "hall"],
      instruction: "Type each falling home-row word before it reaches the floor. Clear words to score.",
      duration: 40, lives: 3, speed: 24, spawn: 1700
    },
    "Top row": {
      title: "Top row drop",
      mode: "falling",
      words: ["quiet", "tree", "type", "write", "power", "your", "wire", "tower", "pretty", "output"],
      instruction: "Keep reaching up to the top row as the words fall faster.",
      duration: 40, lives: 3, speed: 30, spawn: 1550
    },
    "Bottom row": {
      title: "Bottom row bounce",
      mode: "falling",
      words: ["zinc", "cocoa", "zebra", "calm", "bomb", "name", "come", "back", "mix", "vex"],
      instruction: "Reach down for the bottom row without losing your home position.",
      duration: 40, lives: 3, speed: 34, spawn: 1450
    },
    "Punctuation": {
      title: "Punctuation sprint",
      mode: "sprint",
      words: ["Ready?", "Yes!", "calm,", "steady.", "begin;", "well-being", "(focus)", "and/or", "it's", "day."],
      instruction: "One word at a time. Type it exactly, including every mark.",
      duration: 30
    },
    "Capitals": {
      title: "Capital dash",
      mode: "sprint",
      words: ["Delhi", "Mumbai", "HTML", "WPM", "Monday", "Friday", "The", "A", "Chennai", "PDF"],
      instruction: "Use Shift with the opposite pinky for every capital letter.",
      duration: 30
    },
    "Common words": {
      title: "Common word rush",
      mode: "sprint",
      words: ["the", "and", "for", "with", "that", "this", "from", "have", "your", "about", "people", "time"],
      instruction: "Build reflex speed on the words you type most often.",
      duration: 32
    },
    "Sentences": {
      title: "Sentence shower",
      mode: "falling",
      words: ["calm", "room", "steady", "hands", "screen", "rhythm", "focus", "breathe", "line", "flow"],
      instruction: "Longer words fall now. Read ahead and keep a calm rhythm.",
      duration: 45, lives: 3, speed: 28, spawn: 1600
    },
    "Numbers": {
      title: "Number sprint",
      mode: "sprint",
      words: ["2026", "09:15", "1/1/2026", "100", "250", "98765", "15:00", "43210", "31/12/2026", "500"],
      instruction: "Reach the number row without looking down at the keys.",
      duration: 30
    },
    "Speed drills": {
      title: "Speed storm",
      mode: "falling",
      words: ["type", "fast", "calm", "steady", "burst", "sprint", "rhythm", "clean", "quick", "pace"],
      instruction: "Faster falls and faster words. Stay relaxed and let accuracy lead.",
      duration: 45, lives: 3, speed: 42, spawn: 1200
    },
    "Paragraphs": {
      title: "Endurance sprint",
      mode: "sprint",
      words: ["morning", "practice", "accuracy", "rhythm", "patience", "endurance", "review", "confidence", "steady", "progress"],
      instruction: "A steady burst of longer words. Keep your pace even from start to finish.",
      duration: 40
    },
    "Mastery": {
      title: "Mastery finale",
      mode: "falling",
      words: ["quick", "brown", "fox", "jumps", "lazy", "zebras", "quartz", "judge", "victory", "focus"],
      instruction: "The final challenge: fast words, tight spacing, no wasted motion.",
      duration: 50, lives: 3, speed: 46, spawn: 1100
    }
  };

  const lessons = curriculum.flatMap(group => {
    const items = group.drills.map(drill => ({
      kind: "lesson",
      title: drill.title,
      keys: drill.keys || "",
      text: drill.text,
      stage: group.stage,
      instruction: drill.instruction || group.instruction
    }));
    if (gamePlan[group.stage]) {
      items.push({
        kind: "game",
        stage: group.stage,
        ...gamePlan[group.stage]
      });
    }
    return items;
  });
  let selectedLesson = 0;
  let lessonTyped = "";
  let lessonStarted = 0;
  let lessonCompleted = store.get("keystack-course", []);

  function renderLessonList() {
    let lastStage = "";
    $("#lessonList").innerHTML = lessons.map((lesson, i) => {
      const isGame = lesson.kind === "game";
      const heading = lesson.stage !== lastStage
        ? `<div class="lesson-stage-label">${escapeHtml(lesson.stage)}</div>`
        : "";
      lastStage = lesson.stage;
      return `${heading}<button class="lesson-item ${isGame ? "game" : ""} ${i === selectedLesson ? "active" : ""} ${lessonCompleted.includes(i) ? "completed" : ""}" data-lesson="${i}" title="${escapeHtml(lesson.stage)} · ${escapeHtml(lesson.title)}">
        <span class="lesson-number">${isGame ? "★" : i + 1}</span><span class="lesson-name">${escapeHtml(lesson.title)}</span>
        <span class="lesson-state">${lessonCompleted.includes(i) ? "✓" : "›"}</span>
      </button>`;
    }).join("");
    const percent = Math.round(lessonCompleted.length / lessons.length * 100);
    $("#coursePercent").textContent = `${percent}%`;
    $("#courseProgressBar").style.width = `${percent}%`;
  }

  function renderLesson() {
    stopGame();
    const lesson = lessons[selectedLesson];
    const isGame = lesson.kind === "game";
    $("#lessonEyebrow").textContent = `${lesson.stage} · ${String(selectedLesson + 1).padStart(2, "0")}`;
    $("#lessonTitle").textContent = lesson.title;
    $("#lessonCard").hidden = isGame;
    $("#lessonFooter").hidden = isGame;
    $("#gamePanel").hidden = !isGame;
    $("#keyboardGuide").hidden = isGame;
    $("#fingerHint").hidden = isGame;
    if (isGame) {
      renderGameIntro(lesson);
    } else {
      $("#lessonInstruction").textContent = lesson.instruction;
      lessonTyped = "";
      lessonStarted = 0;
      $("#lessonInput").value = "";
      $("#lessonWpm").textContent = "0";
      $("#lessonAccuracy").textContent = "100%";
      $("#nextLesson").disabled = true;
      $("#nextLesson").textContent = selectedLesson === lessons.length - 1 ? "Complete course" : "Complete lesson";
      $("#fingerHintText").textContent = "Type a key to see which finger to use.";
      renderLessonText();
    }
    renderLessonList();
  }
  function renderLessonText() {
    const text = lessons[selectedLesson].text;
    $("#lessonPassage").innerHTML = [...text].map((ch, i) => {
      let cls = i < lessonTyped.length ? (lessonTyped[i] === ch ? "correct" : "incorrect") : (i === lessonTyped.length ? "current" : "");
      return `<span class="${cls}">${escapeHtml(ch)}</span>`;
    }).join("");
  }

  let game = null;

  function stopGame() {
    if (game && game.raf) cancelAnimationFrame(game.raf);
    game = null;
    $("#gameWords").innerHTML = "";
    $("#gamePrompt").hidden = true;
  }

  function renderGameIntro(lesson) {
    game = {
      item: lesson,
      running: false,
      finished: false,
      active: [],
      score: 0,
      timeLeft: lesson.duration,
      lives: lesson.lives || 3,
      word: null,
      raf: 0,
      lastTs: 0,
      spawnTimer: 0
    };
    $("#gameStartTitle").textContent = lesson.title;
    $("#gameStartText").textContent = lesson.instruction;
    $("#gameStartButton").textContent = "Start game";
    $("#gameStart").hidden = false;
    $("#gamePrompt").hidden = true;
    $("#gameWords").innerHTML = "";
    $("#gameInput").value = "";
    $("#gameInput").style.color = "";
    $("#gameInput").disabled = true;
    $("#gameScore").textContent = "0";
    $("#gameTime").textContent = lesson.duration;
    $("#gameLives").textContent = lesson.lives || 3;
    $("#gameLivesWrap").hidden = lesson.mode !== "falling";
    $("#gameMessage").textContent = lesson.mode === "falling"
      ? "Match each falling word exactly before it reaches the floor."
      : "Type the word exactly and it clears automatically.";
  }

  function startGame() {
    if (!game) return;
    if (game.raf) cancelAnimationFrame(game.raf);
    const item = game.item;
    game.running = true;
    game.finished = false;
    game.score = 0;
    game.timeLeft = item.duration;
    game.lives = item.lives || 3;
    game.active = [];
    game.word = null;
    game.lastTs = 0;
    game.spawnTimer = item.spawn || 1500;
    $("#gameWords").innerHTML = "";
    $("#gameStart").hidden = true;
    $("#gamePrompt").hidden = true;
    $("#gameScore").textContent = "0";
    $("#gameTime").textContent = item.duration;
    $("#gameLives").textContent = game.lives;
    $("#gameLivesWrap").hidden = item.mode !== "falling";
    $("#gameInput").value = "";
    $("#gameInput").style.color = "";
    $("#gameInput").disabled = false;
    $("#gameInput").focus();
    if (item.mode === "falling") spawnGameWord();
    else nextSprintWord();
    game.raf = requestAnimationFrame(gameTick);
  }

  function gameTick(ts) {
    if (!game || !game.running) return;
    if (!game.lastTs) game.lastTs = ts;
    const dt = Math.min((ts - game.lastTs) / 1000, 0.05);
    game.lastTs = ts;
    game.timeLeft = Math.max(0, game.timeLeft - dt);
    $("#gameTime").textContent = Math.ceil(game.timeLeft);
    if (game.timeLeft <= 0) {
      endGame("Time is up");
      return;
    }
    if (game.item.mode === "falling") {
      game.spawnTimer -= dt * 1000;
      if (game.spawnTimer <= 0) {
        spawnGameWord();
        game.spawnTimer = game.item.spawn;
      }
      const bottom = $("#gameStage").clientHeight - 10;
      for (let i = game.active.length - 1; i >= 0; i--) {
        const word = game.active[i];
        word.y += game.item.speed * dt;
        word.el.style.transform = `translateY(${word.y}px)`;
        if (word.y >= bottom) {
          word.el.remove();
          game.active.splice(i, 1);
          game.lives -= 1;
          $("#gameLives").textContent = Math.max(0, game.lives);
          $("#gameMessage").textContent = "A word slipped through. Stay calm and keep typing.";
          if (game.lives <= 0) {
            endGame("Out of lives");
            return;
          }
        } else if (word.y > bottom - 80) {
          word.el.classList.add("near");
        } else {
          word.el.classList.remove("near");
        }
      }
    }
    game.raf = requestAnimationFrame(gameTick);
  }

  function spawnGameWord() {
    if (!game) return;
    const pool = game.item.words;
    const activeTexts = game.active.map(w => w.text);
    const choices = pool.filter(w => !activeTexts.includes(w));
    const source = choices.length ? choices : pool;
    const text = source[Math.floor(Math.random() * source.length)];
    const el = document.createElement("span");
    el.className = "game-word";
    el.textContent = text;
    el.style.transform = "translateY(-40px)";
    $("#gameWords").appendChild(el);
    const maxLeft = Math.max(8, $("#gameStage").clientWidth - el.offsetWidth - 16);
    el.style.left = `${8 + Math.random() * maxLeft}px`;
    game.active.push({ text, el, y: -40 });
  }

  function nextSprintWord() {
    if (!game) return;
    const pool = game.item.words;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && text === game.word) text = pool[(pool.indexOf(text) + 1) % pool.length];
    game.word = text;
    const prompt = $("#gamePrompt");
    prompt.hidden = false;
    prompt.querySelector("span").textContent = text;
  }

  function clearGameWord(index, input) {
    const word = game && game.active[index];
    if (!word) return;
    word.el.classList.add("hit");
    const el = word.el;
    setTimeout(() => el.remove(), 240);
    game.active.splice(index, 1);
    game.score += 1;
    $("#gameScore").textContent = game.score;
    input.value = "";
    input.style.color = "";
  }

  function endGame(reason) {
    if (!game || !game.running) return;
    game.running = false;
    game.finished = true;
    cancelAnimationFrame(game.raf);
    $("#gameWords").innerHTML = "";
    game.active = [];
    $("#gamePrompt").hidden = true;
    $("#gameInput").disabled = true;
    $("#gameInput").blur();
    const isLast = selectedLesson === lessons.length - 1;
    if (!lessonCompleted.includes(selectedLesson)) {
      lessonCompleted.push(selectedLesson);
      store.set("keystack-course", lessonCompleted);
    }
    $("#gameStartTitle").textContent = reason;
    $("#gameStartText").textContent = `You scored ${game.score} ${game.score === 1 ? "word" : "words"}. ${isLast ? "You have finished the whole course." : "Continue when you are ready."}`;
    $("#gameStartButton").textContent = isLast ? "Finish course" : "Continue course";
    $("#gameStart").hidden = false;
    renderLessonList();
  }

  $("#lessonList").addEventListener("click", (e) => {
    const item = e.target.closest(".lesson-item");
    if (!item) return;
    selectedLesson = Number(item.dataset.lesson);
    renderLesson();
  });
  $("#lessonPassage").addEventListener("click", () => $("#lessonInput").focus());
  $("#lessonInput").addEventListener("keydown", (e) => {
    if (e.key.length === 1 || e.key === " ") showKeyGuide(e.key);
  });
  $("#lessonInput").addEventListener("input", (e) => {
    if (!lessonStarted) lessonStarted = Date.now();
    lessonTyped = e.target.value.slice(0, lessons[selectedLesson].text.length);
    e.target.value = lessonTyped;
    renderLessonText();
    const elapsed = Math.max((Date.now() - lessonStarted) / 60000, 1 / 60);
    const correct = [...lessonTyped].filter((c, i) => c === lessons[selectedLesson].text[i]).length;
    const wpm = lessonTyped.length ? Math.round(correct / 5 / elapsed) : 0;
    const accuracy = lessonTyped.length ? Math.round(correct / lessonTyped.length * 100) : 100;
    $("#lessonWpm").textContent = wpm;
    $("#lessonAccuracy").textContent = `${accuracy}%`;
    if (lessonTyped.length >= lessons[selectedLesson].text.length) $("#nextLesson").disabled = false;
  });
  $("#resetLesson").addEventListener("click", renderLesson);
  $("#nextLesson").addEventListener("click", () => {
    if (!lessonCompleted.includes(selectedLesson)) lessonCompleted.push(selectedLesson);
    store.set("keystack-course", lessonCompleted);
    if (selectedLesson < lessons.length - 1) selectedLesson++;
    renderLesson();
    showToast("Lesson progress saved");
  });

  $("#gameStartButton").addEventListener("click", () => {
    if (!game) return;
    if (game.finished) {
      if (selectedLesson < lessons.length - 1) {
        selectedLesson++;
        renderLesson();
      } else {
        renderLesson();
        showToast("Course complete — well done!");
      }
      return;
    }
    startGame();
  });
  $("#gameRestart").addEventListener("click", () => {
    if (game) startGame();
  });
  $("#gameInput").addEventListener("input", (e) => {
    if (!game || !game.running) return;
    const value = e.target.value;
    if (game.item.mode === "falling") {
      const match = game.active.findIndex(word => word.text === value);
      if (match >= 0) {
        clearGameWord(match, e.target);
      } else {
        const isPrefix = !value || game.active.some(word => word.text.startsWith(value));
        e.target.style.color = isPrefix ? "" : "var(--error)";
      }
    } else {
      const target = game.word || "";
      if (value === target) {
        game.score += 1;
        $("#gameScore").textContent = game.score;
        e.target.value = "";
        e.target.style.color = "";
        nextSprintWord();
      } else if (!target.startsWith(value)) {
        e.target.value = "";
        e.target.style.color = "";
        const prompt = $("#gamePrompt");
        prompt.classList.remove("shake");
        void prompt.offsetWidth;
        prompt.classList.add("shake");
      }
    }
  });

  let keyGuideTimer = 0;
  const keyboardRows = [
    {
      keys: ["q","w","e","r","t","y","u","i","o","p"],
      fingers: ["pinky","ring","middle","index","index","index","index","middle","ring","pinky"],
      hands: ["left","left","left","left","left","right","right","right","right","right"]
    },
    {
      keys: ["a","s","d","f","g","h","j","k","l",";"],
      fingers: ["pinky","ring","middle","index","index","index","index","middle","ring","pinky"],
      hands: ["left","left","left","left","left","right","right","right","right","right"]
    },
    {
      keys: ["z","x","c","v","b","n","m",",",".","/"],
      fingers: ["pinky","ring","middle","index","index","index","index","middle","ring","pinky"],
      hands: ["left","left","left","left","left","right","right","right","right","right"]
    }
  ];

  function buildKeyboard() {
    const rowsHtml = keyboardRows.map(row =>
      `<div class="key-row">${row.keys.map((key, i) => {
        const home = ["f","j"].includes(key);
        const finger = row.fingers[i];
        const hand = row.hands[i];
        return `<span class="key ${home ? "home" : ""} ${hand}" data-key="${escapeHtml(key)}" data-finger="${finger}" data-hand="${hand}" title="${hand} ${finger} finger">${escapeHtml(key)}</span>`;
      }).join("")}</div>`
    );
    rowsHtml.push(`<div class="key-row"><span class="key space" data-key="space" data-finger="thumb" data-hand="either" title="Either thumb">space</span></div>`);
    $("#keyboardGuide").innerHTML = rowsHtml.join("");
  }

  function showKeyGuide(rawKey) {
    if (!rawKey) return;
    const key = rawKey === " " ? "space" : rawKey.length === 1 ? rawKey.toLowerCase() : "";
    if (!key) return;
    const target = document.querySelector(`#keyboardGuide .key[data-key="${CSS.escape(key)}"]`);
    if (!target) return;
    $$("#keyboardGuide .key.guide-active").forEach(k => k.classList.remove("guide-active"));
    target.classList.add("guide-active");
    const finger = target.dataset.finger;
    const hand = target.dataset.hand;
    $("#fingerHintText").textContent = key === "space"
      ? "Either thumb · press the space bar"
      : `${hand} hand · ${finger} finger`;
    clearTimeout(keyGuideTimer);
    keyGuideTimer = setTimeout(() => target.classList.remove("guide-active"), 260);
  }

  const arcadeGames = [
    {
      id: "rain", name: "Word Rain", icon: "☔", eyebrow: "Falling words",
      desc: "Type each falling word before it reaches the floor. Three lives, steady pace.",
      mode: "falling", duration: 45, lives: 3, speed: 26, spawn: 1500,
      words: ["the","and","for","with","that","this","from","have","your","about","people","time","work","world","small","great","light","night","start","still"]
    },
    {
      id: "sprint", name: "Word Sprint", icon: "⚡", eyebrow: "Word sprint",
      desc: "A rapid-fire word challenge. Clear as many words as you can in thirty seconds.",
      mode: "sprint", duration: 30,
      words: ["type","fast","calm","steady","quick","focus","clean","rhythm","practice","progress","accuracy","speed","stroke","habit","quiet","flow","balance","effort","smooth","control"]
    },
    {
      id: "kiko", name: "Kiko Dash", icon: "⚔", eyebrow: "Character game", character: true, target: 15,
      desc: "Help Kiko the key ninja dash to the flag. Every correct word is one step closer.",
      mode: "sprint", duration: 40,
      words: ["dash","jump","slash","ninja","swift","brave","focus","strike","shadow","speed","kata","blade","quick","honor","silent","storm","leap","spin","dodge","victory"]
    },
    {
      id: "keys", name: "Key Rush", icon: "⌨", eyebrow: "Single keys",
      desc: "Single keys appear one at a time. Hit them cleanly and build pure reflex speed.",
      mode: "sprint", duration: 25,
      words: ["a","s","d","f","j","k","l",";","g","h","q","w","e","r","t","y","u","i","o","p","z","x","c","v","b","n","m",",",".","/"]
    },
    {
      id: "numbers", name: "Number Crunch", icon: "123", eyebrow: "Numbers",
      desc: "Dates, times, and amounts mixed with punctuation. Reach the number row without looking.",
      mode: "sprint", duration: 30,
      words: ["2026","09:15","100","1/1/2026","250","98765","3.14","50%","42","18:20","12,345","500","7/8/2025","0.5","1,000","31/12/2026"]
    },
    {
      id: "punctuation", name: "Punctuation Pop", icon: "?!", eyebrow: "Punctuation",
      desc: "Marks and symbols at speed. Commas, quotes, brackets, and more.",
      mode: "sprint", duration: 30,
      words: ["end.","wait?","yes!","calm,","ready;","go:","it's","well-being","(focus)","and/or","type.","stop?","great!","slow,","begin;","note:","can't","read-only","(yes)","in/out"]
    },
    {
      id: "survival", name: "Survival", icon: "♥", eyebrow: "One life",
      desc: "One life, fast falls, long words. How long can you survive?",
      mode: "falling", duration: 60, lives: 1, speed: 42, spawn: 950,
      words: ["adventure","algorithm","architecture","assumption","atmosphere","beautiful","consequence","consistency","discipline","efficient","framework","hypothesis","observation","performance","precision","repetition","significant","transformation","unexpected","vocabulary"]
    }
  ];

  let arcadeBest = store.get("keystack-arcade", {});
  let arcade = null;

  function buildArcadeFloaties() {
    const layer = $("#arcadeFloaties");
    if (!layer || layer.childElementCount) return;
    const glyphs = [
      ..."qwertyuiopasdfghjklzxcvbnm1234567890;,/",
      "wpm", "type", "focus", "speed", "accuracy", "home row", "rhythm", "practice", "⏎", "⌫"
    ];
    for (let i = 0; i < 42; i++) {
      const span = document.createElement("span");
      const glyph = randomItem(glyphs);
      const isKeycap = i % 3 === 0 && glyph.length === 1;
      span.className = isKeycap ? "floaty keycap" : "floaty";
      span.textContent = glyph;
      span.style.left = `${Math.random() * 100}%`;
      span.style.fontSize = isKeycap ? `${16 + Math.random() * 18}px` : `${12 + Math.random() * 30}px`;
      const duration = 18 + Math.random() * 26;
      span.style.animationDuration = `${duration}s`;
      span.style.animationDelay = `-${Math.random() * duration}s`;
      layer.appendChild(span);
    }
  }

  function renderGameCards() {
    arcadeBest = store.get("keystack-arcade", {});
    $("#gameGrid").innerHTML = arcadeGames.map(game => {
      const best = arcadeBest[game.id] || 0;
      return `<button class="game-card" data-game="${game.id}" type="button">
        <span class="game-card-icon">${game.icon}</span>
        <span class="game-card-body"><strong>${game.name}</strong><span>${game.desc}</span></span>
        <span class="game-card-best ${best ? "has-score" : ""}">${best ? `Best ${best} pts` : "No score yet"}</span>
      </button>`;
    }).join("");
  }

  function showGameGrid() {
    stopArcade();
    $("#gameGrid").hidden = false;
    $("#arcadePanel").hidden = true;
    renderGameCards();
  }

  function stopArcade() {
    if (arcade && arcade.raf) cancelAnimationFrame(arcade.raf);
    arcade = null;
    $("#arcadeWords").innerHTML = "";
    $("#arcadePrompt").hidden = true;
  }

  function openArcade(id) {
    const config = arcadeGames.find(game => game.id === id);
    if (!config) return;
    stopArcade();
    arcade = {
      config, running: false, finished: false, active: [], score: 0,
      timeLeft: config.duration, lives: config.lives || 3, word: null,
      raf: 0, lastTs: 0, spawnTimer: 0
    };
    $("#gameGrid").hidden = true;
    $("#arcadePanel").hidden = false;
    $("#arcadeEyebrow").textContent = config.eyebrow;
    $("#arcadeTitle").textContent = config.name;
    $("#arcadeStartTitle").textContent = config.name;
    $("#arcadeStartText").textContent = config.desc;
    $("#arcadeStartButton").textContent = "Start game";
    $("#arcadeStart").hidden = false;
    $("#arcadePrompt").hidden = true;
    $("#arcadeWords").innerHTML = "";
    $("#arcadeInput").value = "";
    $("#arcadeInput").style.color = "";
    $("#arcadeInput").disabled = true;
    $("#arcadeScore").textContent = "0";
    $("#arcadeTime").textContent = config.duration;
    $("#arcadeLives").textContent = config.lives || 3;
    $("#arcadeLivesWrap").hidden = config.mode !== "falling";
    $("#arcadeBest").textContent = arcadeBest[config.id] || 0;
    $("#arcadeMessage").textContent = config.mode === "falling"
      ? "Type each falling word exactly before it reaches the floor."
      : "Type the target exactly and it clears automatically.";
    $("#characterLane").hidden = !config.character;
    if (config.character) {
      $("#characterRunner").style.left = "0%";
      $("#characterBubble").textContent = "Type a word to help Kiko run!";
    }
  }

  function startArcade() {
    if (!arcade) return;
    if (arcade.raf) cancelAnimationFrame(arcade.raf);
    const config = arcade.config;
    arcade.running = true;
    arcade.finished = false;
    arcade.score = 0;
    arcade.timeLeft = config.duration;
    arcade.lives = config.lives || 3;
    arcade.active = [];
    arcade.word = null;
    arcade.lastTs = 0;
    arcade.spawnTimer = config.spawn || 1500;
    $("#arcadeWords").innerHTML = "";
    $("#arcadeStart").hidden = true;
    $("#arcadePrompt").hidden = true;
    $("#arcadeScore").textContent = "0";
    $("#arcadeTime").textContent = config.duration;
    $("#arcadeLives").textContent = arcade.lives;
    $("#arcadeLivesWrap").hidden = config.mode !== "falling";
    $("#arcadeInput").value = "";
    $("#arcadeInput").style.color = "";
    $("#arcadeInput").disabled = false;
    $("#arcadeInput").focus();
    if (config.character) {
      $("#characterRunner").style.left = "0%";
      $("#characterBubble").textContent = "Go, Kiko, go!";
    }
    if (config.mode === "falling") spawnArcadeWord();
    else nextArcadeWord();
    arcade.raf = requestAnimationFrame(arcadeTick);
  }

  function updateKikoProgress() {
    if (!arcade || !arcade.config.character) return;
    const target = arcade.config.target || 15;
    const pct = Math.min(1, arcade.score / target);
    const runner = $("#characterRunner");
    runner.style.left = `calc(${pct * 100}% - ${pct * 76}px)`;
    runner.classList.remove("hop");
    void runner.offsetWidth;
    runner.classList.add("hop");
    $("#characterBubble").textContent = arcade.score >= target
      ? "Goal! Kiko made it!"
      : randomItem(["Nice!", "Go, Kiko!", "Clean strike!", "Keep dashing!", `${arcade.score}/${target} words`]);
  }

  function arcadeTick(ts) {
    if (!arcade || !arcade.running) return;
    if (!arcade.lastTs) arcade.lastTs = ts;
    const dt = Math.min((ts - arcade.lastTs) / 1000, 0.05);
    arcade.lastTs = ts;
    arcade.timeLeft = Math.max(0, arcade.timeLeft - dt);
    $("#arcadeTime").textContent = Math.ceil(arcade.timeLeft);
    if (arcade.timeLeft <= 0) {
      endArcade("Time is up");
      return;
    }
    const config = arcade.config;
    if (config.mode === "falling") {
      arcade.spawnTimer -= dt * 1000;
      if (arcade.spawnTimer <= 0) {
        spawnArcadeWord();
        arcade.spawnTimer = config.spawn;
      }
      const speed = config.speed * (1 + (config.duration - arcade.timeLeft) / config.duration * 0.7);
      const bottom = $("#arcadeStage").clientHeight - 10;
      for (let i = arcade.active.length - 1; i >= 0; i--) {
        const word = arcade.active[i];
        word.y += speed * dt;
        word.el.style.transform = `translateY(${word.y}px)`;
        if (word.y >= bottom) {
          word.el.remove();
          arcade.active.splice(i, 1);
          arcade.lives -= 1;
          $("#arcadeLives").textContent = Math.max(0, arcade.lives);
          $("#arcadeMessage").textContent = "A word slipped through. Stay calm and keep typing.";
          if (arcade.lives <= 0) {
            endArcade("Out of lives");
            return;
          }
        } else {
          word.el.classList.toggle("near", word.y > bottom - 80);
        }
      }
    }
    arcade.raf = requestAnimationFrame(arcadeTick);
  }

  function spawnArcadeWord() {
    if (!arcade) return;
    const pool = arcade.config.words;
    const activeTexts = arcade.active.map(word => word.text);
    const choices = pool.filter(word => !activeTexts.includes(word));
    const source = choices.length ? choices : pool;
    const text = source[Math.floor(Math.random() * source.length)];
    const el = document.createElement("span");
    el.className = "game-word";
    el.textContent = text;
    el.style.transform = "translateY(-40px)";
    $("#arcadeWords").appendChild(el);
    const maxLeft = Math.max(8, $("#arcadeStage").clientWidth - el.offsetWidth - 16);
    el.style.left = `${8 + Math.random() * maxLeft}px`;
    arcade.active.push({ text, el, y: -40 });
  }

  function nextArcadeWord() {
    if (!arcade) return;
    const pool = arcade.config.words;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && text === arcade.word) text = pool[(pool.indexOf(text) + 1) % pool.length];
    arcade.word = text;
    const prompt = $("#arcadePrompt");
    prompt.hidden = false;
    prompt.querySelector("span").textContent = text;
  }

  function clearArcadeWord(index, input) {
    if (!arcade) return;
    const word = arcade.active[index];
    if (!word) return;
    word.el.classList.add("hit");
    const el = word.el;
    setTimeout(() => el.remove(), 240);
    arcade.active.splice(index, 1);
    arcade.score += 1;
    $("#arcadeScore").textContent = arcade.score;
    input.value = "";
    input.style.color = "";
  }

  function endArcade(reason) {
    if (!arcade || !arcade.running) return;
    arcade.running = false;
    arcade.finished = true;
    cancelAnimationFrame(arcade.raf);
    $("#arcadeWords").innerHTML = "";
    arcade.active = [];
    $("#arcadePrompt").hidden = true;
    $("#arcadeInput").disabled = true;
    $("#arcadeInput").blur();
    const best = Math.max(arcadeBest[arcade.config.id] || 0, arcade.score);
    const isNewBest = best > (arcadeBest[arcade.config.id] || 0);
    if (isNewBest) {
      arcadeBest[arcade.config.id] = best;
      store.set("keystack-arcade", arcadeBest);
    }
    $("#arcadeBest").textContent = best;
    $("#arcadeStartTitle").textContent = reason;
    $("#arcadeStartText").textContent = `You scored ${arcade.score} ${arcade.score === 1 ? "point" : "points"}.${isNewBest ? " That is a new best!" : ""}`;
    $("#arcadeStartButton").textContent = "Play again";
    $("#arcadeStart").hidden = false;
    if (arcade.config.character) $("#characterBubble").textContent = reason;
    showToast(isNewBest ? `New best score · ${best} pts` : `${reason} · Score ${arcade.score}`);
    renderGameCards();
  }

  $("#gameGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".game-card");
    if (card) openArcade(card.dataset.game);
  });
  $("#arcadeBack").addEventListener("click", showGameGrid);
  $("#arcadeRestart").addEventListener("click", () => {
    if (arcade) startArcade();
  });
  $("#arcadeStartButton").addEventListener("click", () => {
    if (arcade) startArcade();
  });
  $("#arcadeInput").addEventListener("input", (e) => {
    if (!arcade || !arcade.running) return;
    const value = e.target.value;
    if (arcade.config.mode === "falling") {
      const match = arcade.active.findIndex(word => word.text === value);
      if (match >= 0) {
        clearArcadeWord(match, e.target);
      } else {
        const isPrefix = !value || arcade.active.some(word => word.text.startsWith(value));
        e.target.style.color = isPrefix ? "" : "var(--error)";
      }
    } else {
      const target = arcade.word || "";
      if (value === target) {
        arcade.score += 1;
        $("#arcadeScore").textContent = arcade.score;
        e.target.value = "";
        e.target.style.color = "";
        updateKikoProgress();
        if (arcade.config.character && arcade.score >= (arcade.config.target || 15)) {
          endArcade("Kiko reached the goal!");
          return;
        }
        nextArcadeWord();
      } else if (!target.startsWith(value)) {
        e.target.value = "";
        e.target.style.color = "";
        if (arcade.config.character) {
          const runner = $("#characterRunner");
          runner.classList.remove("wobble");
          void runner.offsetWidth;
          runner.classList.add("wobble");
          $("#characterBubble").textContent = "Oops — try again!";
        }
        const prompt = $("#arcadePrompt");
        prompt.classList.remove("shake");
        void prompt.offsetWidth;
        prompt.classList.add("shake");
      }
    }
  });

  buildArcadeFloaties();
  renderGameCards();

  renderPersonalBest();
  renderHistory();
  buildKeyboard();
  renderLesson();
  $("#customPaper").value = state.customPassage;
  newPassage(false);
})();
