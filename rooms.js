(() => {
  const view = document.querySelector("#roomsView");
  const $ = selector => view.querySelector(selector);
  const create = $("#roomCreate");
  const join = $("#roomJoin");
  const next = $("#roomNext");
  for (const form of [create, next]) {
    form.querySelector(".room-fields").append($("#roomConfigFields").content.cloneNode(true));
    form.elements.mode.addEventListener("change", () => configure(form));
  }
  configure(create);
  const editor = $("#roomEditor");
  const modes = Object.fromEntries([...create.elements.mode.options].map(option => [option.value, option.text]));
  const sessionKey = "keystack-room-session";
  let session;
  let room;
  let offset = 0;
  let timer;
  let busy = false;
  let lastSent = "";
  let online = true;

  function notice(message = "") {
    $("#roomNotice").textContent = message;
    $("#roomNotice").hidden = !message;
  }

  function configure(form, config) {
    const fields = form.elements;
    if (config) fields.mode.value = config.mode;
    const mode = fields.mode.value;
    const exam = mode === "skill" || mode === "paper";
    fields.duration.value = config ? config.duration + "s" : exam ? "10m" : ({ quote: "90s", words: "60s", numbers: "60s", punctuation: "60s" }[mode] || "30s");
    fields.duration.readOnly = exam;
    form.querySelector("[data-duration-hint]").hidden = exam;
    form.querySelector("[data-difficulty]").hidden = !["time", "words"].includes(mode);
    form.querySelector("[data-language]").hidden = mode !== "skill";
    form.querySelector("[data-custom]").hidden = mode !== "custom";
    fields.customPassage.required = mode === "custom";
    fields.customPassage.disabled = mode !== "custom";
    if (config) {
      fields.difficulty.value = config.difficulty;
      fields.language.value = config.language || "english";
      fields.customPassage.value = config.customPassage || "";
    }
  }

  function readConfig(form) {
    const { mode, duration, difficulty, language, customPassage } = form.elements;
    const seconds = Math.round(typingTests.parseDurationInput(duration.value));
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400) {
      notice("Choose a duration between 1 second and 24 hours.");
      return;
    }
    return { mode: mode.value, duration: seconds, difficulty: difficulty.value, language: language.value, customPassage: customPassage.value };
  }

  async function request(path, body, token) {
    const before = Date.now();
    let response;
    try {
      response = await fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(8000)
      });
    } catch {
      throw new Error(session ? "Connection lost. Reconnecting to the room…" : "Cannot reach the room server. Open the address served by node room-server.js.");
    }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Rooms need the room server. Run node room-server.js and open its address.");
    }
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || "Room request failed."), { status: response.status });
    if (data.now) offset = data.now - (before + Date.now()) / 2;
    return data;
  }

  function saveSession(value) {
    session = value;
    try {
      if (value) sessionStorage.setItem(sessionKey, JSON.stringify(value));
      else sessionStorage.removeItem(sessionKey);
    } catch {}
  }

  function clearRoom() {
    clearTimeout(timer);
    saveSession(null);
    room = null;
    $("#roomSession").hidden = true;
    $("#roomLeave").hidden = true;
    $("#roomEntry").hidden = false;
    $("#roomSubtitle").hidden = false;
    editor.readOnly = true;
    editor.value = lastSent = "";
  }

  function cell(tag, value) {
    const el = document.createElement(tag);
    el.textContent = value;
    return el;
  }

  function renderMembers() {
    if (room.phase === "results") {
      const rows = [];
      let rank = 0;
      let previous;
      room.leaderboard.forEach((m, index) => {
        if (!previous || previous.wpm !== m.wpm || previous.accuracy !== m.accuracy) rank = index + 1;
        previous = m;
        const row = document.createElement("tr");
        const suffix = m.id === room.id ? " (you)" : "";
        const status = m.status === "left" ? " · Left" : m.status === "error limit" ? " · Error limit" : !m.ranked ? " · No entry" : "";
        row.classList.toggle("self", m.id === room.id);
        row.append(cell("td", m.ranked ? rank : "-"), cell("td", m.name + suffix + status),
          cell("td", m.ranked ? m.wpm : "-"), cell("td", m.ranked ? m.accuracy + "%" : "-"));
        rows.push(row);
      });
      $("#roomResults tbody").replaceChildren(...rows);
    }
    $("#roomCount").textContent = "(" + room.members.length + ")";
    const rows = room.members.map(m => {
      const row = document.createElement("li");
      const label = m.id === room.id ? m.name + " (you)" : m.name;
      const status = ["lobby", "results"].includes(room.phase) ? (m.id === room.host ? "Host" : "Joined")
        : room.phase === "countdown" ? "Ready" : m.status;
      row.append(cell("span", label), cell("small", status));
      return row;
    });
    $("#roomMembers").replaceChildren(...rows);
  }

  function renderPassage() {
    const panel = $("#roomPassage");
    panel.hidden = room.config.mode === "paper";
    if (panel.hidden) return;
    const typed = [...editor.value];
    const target = [...room.passage];
    const fragment = document.createDocumentFragment();
    let run;
    for (let i = 0; i < typed.length; i++) {
      const cls = typed[i] === target[i] ? "done" : "wrong";
      if (!run || run.className !== cls) {
        run = cell("span", "");
        run.className = cls;
        fragment.append(run);
      }
      run.append(target[i] || "");
    }
    const cursor = cell("span", target[typed.length] || "");
    cursor.className = "cursor";
    fragment.append(cursor, target.slice(typed.length + 1).join(""));
    panel.replaceChildren(fragment);
    panel.scrollTop = Math.max(0, cursor.offsetTop - panel.clientHeight / 2);
  }

  function updateClock() {
    if (!room?.start || room.phase === "results") return;
    const now = Date.now() + offset;
    const waiting = now < room.start;
    const end = now >= room.end;
    const clock = waiting ? Math.ceil((room.start - now) / 1000) : typingTests.formatClock((room.end - now) / 1000);
    $("#roomClock").textContent = waiting ? "Starting in " + clock : clock + (Math.ceil((room.end - now) / 1000) < 60 ? "s" : "");
    const locked = waiting || end || room.status !== "typing";
    if (editor.readOnly !== locked) {
      editor.readOnly = locked;
      if (!locked && view.classList.contains("active")) editor.focus({ preventScroll: true });
    }
  }

  function apply(data) {
    const first = !room;
    const oldPhase = room?.phase;
    const oldRound = room?.round;
    const oldHost = room?.host;
    room = { ...room, ...data };
    if (first) {
      $("#roomEntry").hidden = true;
      $("#roomSession").hidden = false;
      $("#roomLeave").hidden = false;
      $("#roomSubtitle").hidden = true;
      $("#roomCode").textContent = room.code;
    }
    if (data.config) {
      const config = room.config;
      const detail = config.mode === "skill" ? config.language : ["time", "words"].includes(config.mode) ? config.difficulty : "";
      $("#roomSettings").textContent = [modes[config.mode], detail, typingTests.formatDurationLabel(config.duration)].filter(Boolean).join(" · ");
    }
    const lobby = room.phase === "lobby";
    const results = room.phase === "results";
    const host = room.id === room.host;
    // A running single-round server may still serve the updated browser files.
    const singleRoundResults = results && !room.round;
    if (singleRoundResults) room.leaderboard = room.members;
    $("#roomRound").hidden = singleRoundResults;
    next.hidden = !results || !host || singleRoundResults;
    next.querySelector("button").disabled = room.members.length < 2;
    $("#roomResults").hidden = !results;
    $("#roomStart").hidden = !host || !lobby;
    $("#roomStart").disabled = room.members.length < 2;
    $("#roomTest").hidden = lobby || results || room.status !== "typing";
    if (data.members) renderMembers();
    if (results) {
      editor.readOnly = true;
      const entering = oldPhase !== "results" || oldRound !== room.round;
      if (host && (entering || oldHost !== room.host)) {
        configure(next, room.config);
        next.querySelector("details").open = false;
      }
      $("#roomResultsTitle").textContent = singleRoundResults ? "Leaderboard" : "Round " + room.round + " leaderboard";
      if (entering) $("#roomPhase").textContent = "Next test";
      $("#roomInstruction").textContent = host
        ? "Share the room code and start when everyone has joined."
        : "The room is open. Your host will start the next test.";
      const paper = room.config.mode === "paper";
      $("#roomAccuracyLabel").textContent = paper ? "Recognized words" : "Accuracy";
      $("#roomRankRule").textContent = paper ? "Ranked by WPM, then the percentage of words recognized by the dictionary." : "Ranked by WPM, then accuracy. Matching scores share a rank.";
      if (entering && view.classList.contains("active")) $("#roomResultsTitle").focus();
      return;
    }
    if (data.passage !== undefined) {
      editor.value = lastSent = data.text;
      editor.maxLength = room.config.mode === "paper" ? 10000 : room.passage.length;
      renderPassage();
    }
    const waiting = !lobby && room.status !== "typing";
    const title = lobby ? "Waiting room" : room.status === "error limit" ? "Error limit reached" : waiting ? "Your test is complete" : room.phase === "countdown" ? "Get ready" : "Test in progress";
    if ($("#roomPhase").textContent !== title) $("#roomPhase").textContent = title;
    $("#roomInstruction").textContent = lobby
      ? (host ? "Share the code, then start when everyone has joined." : "Your host will start the test when everyone has joined.")
      : waiting ? (room.status === "error limit" ? "Your attempt is unranked after 10 wrong words. " : "") + "The leaderboard opens when everyone finishes or time runs out."
      : room.config.mode === "paper" ? "Type from the same printed paper supplied by your host." : "Type the passage below.";
    updateClock();
  }

  function schedule(delay) {
    clearTimeout(timer);
    if (session && (room?.round || room?.phase !== "results")) timer = setTimeout(() => sync(), delay);
  }

  async function sync(action = "sync", options = {}) {
    if (busy || !session) return;
    busy = true;
    clearTimeout(timer);
    const body = room ? { version: room.version, page: room.page, round: room.round, ...options } : {};
    if (action === "sync" && room?.status === "typing" && editor.value !== lastSent) body.text = editor.value;
    try {
      const data = await request("/api/rooms/" + session.code + "/" + action, body, session.token);
      if (!online || action !== "sync") notice();
      online = true;
      if (action === "leave") return clearRoom();
      if (body.text !== undefined && data.phase !== "countdown") lastSent = body.text;
      apply(data);
    } catch (error) {
      if (action === "leave" && !error.status) {
        clearRoom();
        notice("Disconnected from the room. The server could not confirm your departure.");
        return;
      }
      if (error.status === 404 || (error.status === 403 && action === "sync")) clearRoom();
      online = false;
      notice(error.message);
    } finally {
      busy = false;
      schedule(online && room?.status === "typing" && editor.value !== lastSent ? 80 : online ? 800 : 1800);
    }
  }

  async function enter(event) {
    event.preventDefault();
    if (busy || session) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const body = { name: values.name.trim() };
    if (!body.name) return notice("Enter your name.");
    let path = "/api/rooms";
    if (form === create) {
      body.config = readConfig(form);
      if (!body.config) return;
    } else {
      path += "/" + encodeURIComponent(values.code.trim().toUpperCase()) + "/join";
    }
    busy = true;
    form.querySelector("button").disabled = true;
    notice();
    try {
      const data = await request(path, body);
      saveSession({ code: data.code, token: data.token });
      online = true;
      apply(data);
      schedule(500);
    } catch (error) {
      notice(error.message);
    } finally {
      busy = false;
      form.querySelector("button").disabled = false;
    }
  }

  // A deliberate action waits for any in-flight progress update.
  async function command(action, options) {
    const current = session;
    while (busy && session === current) await new Promise(resolve => setTimeout(resolve, 30));
    if (!session || session !== current) return;
    await sync(action, options);
  }
  next.addEventListener("submit", event => {
    event.preventDefault();
    const config = readConfig(next);
    if (config) command("next", { round: room.round, config });
  });
  create.addEventListener("submit", enter);
  join.addEventListener("submit", enter);
  $("#roomStart").addEventListener("click", () => command("start"));
  $("#roomLeave").addEventListener("click", () => command("leave"));
  $("#roomCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(room.code); notice("Room code copied."); }
    catch {
      const range = document.createRange();
      range.selectNodeContents($("#roomCode"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      notice("Code selected. Use your device’s copy command.");
    }
  });
  editor.addEventListener("beforeinput", event => {
    updateClock();
    if (editor.readOnly || ["insertFromPaste", "insertFromDrop"].includes(event.inputType)) event.preventDefault();
  });
  editor.addEventListener("input", () => {
    renderPassage();
    if (!busy) schedule(0);
  });
  setInterval(updateClock, 150);
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey));
    if (saved?.code && saved?.token) {
      session = saved;
      $("#roomEntry").hidden = true;
      $("#roomLeave").hidden = false;
      document.querySelector('.tab[data-view="rooms"]').click();
      sync();
    }
  } catch {}
})();
