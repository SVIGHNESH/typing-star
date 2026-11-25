// Run with node room-server.js. Each room lives on this server until it expires.
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { randomBytes, randomInt, randomUUID } = require("node:crypto");
const tests = require("./typing-tests");
const { paperWords } = require("./paper-review");

const rooms = new Map();
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const continuous = new Set(["time", "words", "punctuation", "numbers"]);
const modes = new Set([...continuous, "quote", "custom", "skill", "paper"]);
const lobbyTimeout = 120_000;
const resultsLifetime = 3_600_000;

function reject(status, message) {
  throw Object.assign(new Error(message), { status });
}

function validText(value, max) {
  return typeof value === "string" && value.trim() && value.length <= max;
}

function configuration(input) {
  const { mode, duration, difficulty, language, customPassage } = input || {};
  if (!modes.has(mode)) reject(400, "Choose a test mode.");
  if (!Number.isInteger(duration) || duration < 1 || duration > 86400) reject(400, "Choose a duration between 1 second and 24 hours.");
  if (["skill", "paper"].includes(mode) && duration !== 600) reject(400, "This test lasts 10 minutes.");
  if (!["easy", "medium", "hard"].includes(difficulty)) reject(400, "Choose a difficulty.");
  if (mode === "skill" && !["english", "hindi"].includes(language)) reject(400, "Choose a skill test language.");
  if (mode === "custom" && (!validText(customPassage, 2000) || customPassage.trim().length < 10)) reject(400, "Enter a passage of 10 to 2,000 characters.");
  return { mode, duration, difficulty, language: mode === "skill" ? language : undefined,
    customPassage: mode === "custom" ? customPassage.trim() : undefined };
}

function firstPage(config) {
  return tests.passage(config) + (continuous.has(config.mode) ? " " : "");
}

function createRoom(config) {
  let code;
  do { code = Array.from({ length: 6 }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join(""); } while (rooms.has(code));
  return { code, config, pages: [firstPage(config)], members: new Map(), host: null,
    round: 1, departed: [], leaderboard: [],
    version: 0, phase: "lobby", start: 0, end: 0, remaining: 0, finishedAt: 0 };
}

function freshAttempt() {
  return { page: 0, text: "", previousCorrect: 0, previousChars: 0, previousWrong: 0,
    correct: 0, chars: 0, accuracy: 0, wpm: 0, status: "ready" };
}

function acceptingPlayers(room) {
  return room.phase === "lobby" || room.phase === "results";
}

function join(room, name, now) {
  if (!acceptingPlayers(room)) reject(409, "This test has started. Join when the round finishes.");
  if (!validText(name, 32)) reject(400, "Enter a name of up to 32 characters.");
  const token = randomBytes(24).toString("hex");
  const member = { id: randomUUID(), name: name.trim(), lastSeen: now, ...freshAttempt() };
  room.members.set(token, member);
  room.host ||= member.id;
  room.version++;
  return { token, member };
}

function score({ id, name, status, wpm, accuracy, chars }) {
  return { id, name, status, wpm, accuracy, ranked: chars > 0 && status !== "left" };
}

function completeRound(room, now) {
  room.leaderboard = room.departed.concat(Array.from(room.members.values(), score))
    .sort((a, b) => Number(b.ranked) - Number(a.ranked) || b.wpm - a.wpm || b.accuracy - a.accuracy);
  room.departed = [];
  room.phase = "results";
  room.finishedAt = now;
  room.version++;
}

function finish(room, member, now, status) {
  member.status = status;
  const seconds = Math.max(1, (Math.min(now, room.end) - room.start) / 1000);
  member.wpm = Math.round(member.correct * 12 / seconds);
  room.remaining--;
  room.version++;
  if (!room.remaining) completeRound(room, now);
}

function advance(room, now) {
  if (room.phase === "countdown" && now >= room.start) {
    room.phase = "running";
    room.version++;
  }
  if (room.phase === "running" && now >= room.end) {
    for (const member of room.members.values()) {
      if (member.status === "typing") finish(room, member, room.end, "finished");
    }
  }
}

function leave(room, token, now) {
  const member = room.members.get(token);
  if (member.status === "typing") finish(room, member, now, "left");
  if (!acceptingPlayers(room)) room.departed.push(score(member));
  room.members.delete(token);
  if (member.id === room.host) room.host = room.members.values().next().value?.id || null;
  if (!room.members.size && room.phase === "lobby") rooms.delete(room.code);
  room.version++;
}

function acceptInput(room, member, page, text, now) {
  if (room.phase !== "running" || member.status !== "typing" || member.page !== page) return;
  const mode = room.config.mode;
  const passage = room.pages[page];
  const limit = mode === "paper" ? 10000 : passage.length;
  if (typeof text !== "string" || text.length > limit) reject(400, "The entry exceeds the passage length.");
  member.text = text;
  if (mode === "paper") {
    const words = [...paperWords(text, require("./assets/english-words"))];
    const known = words.filter(word => word.known);
    member.correct = known.reduce((sum, word) => sum + word.characters, 0);
    member.chars = text.length;
    member.accuracy = words.length ? Math.round(100 * known.length / words.length) : 0;
    return;
  }
  const typed = [...text];
  const target = [...passage];
  member.correct = member.previousCorrect + typed.filter((c, i) => c === target[i]).length;
  member.chars = member.previousChars + typed.length;
  member.accuracy = member.chars ? Math.round(100 * member.correct / member.chars) : 0;
  const wrong = member.previousWrong + tests.wrongWords(text, passage);
  if (mode !== "skill" && wrong >= 10) return finish(room, member, now, "error limit");
  if (text.length < passage.length) return;
  if (!continuous.has(mode)) return finish(room, member, now, "finished");
  member.previousCorrect = member.correct;
  member.previousChars = member.chars;
  member.previousWrong = wrong;
  member.text = "";
  member.page++;
  room.pages[member.page] ??= tests.passage(room.config, true) + " ";
}

function snapshot(room, member, body, now) {
  const full = body.version === undefined || body.round !== room.round;
  const result = { now, round: room.round, version: room.version, phase: room.phase, start: room.start,
    end: room.end, status: member.status, page: member.page };
  if (full || body.version !== room.version) {
    result.host = room.host;
    result.members = Array.from(room.members.values(), ({ id, name, status }) => ({ id, name, status }));
    if (room.phase === "results") result.leaderboard = room.leaderboard;
  }
  if (full) {
    result.id = member.id;
    result.code = room.code;
    result.config = room.config;
  }
  if (full || body.page !== member.page) {
    result.passage = room.pages[member.page];
    result.text = member.text;
  }
  return result;
}

async function readJson(req) {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") reject(415, "Send a JSON request.");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) reject(413, "The entry is too large.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks));
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {}
  reject(400, "Invalid room request.");
}

async function roomRequest(req, route) {
  if (req.method !== "POST") reject(405, "Use POST.");
  const body = await readJson(req);
  const now = Date.now();
  if (route === "/api/rooms") {
    const room = createRoom(configuration(body.config));
    const { member, token } = join(room, body.name, now);
    rooms.set(room.code, room);
    return { token, ...snapshot(room, member, {}, now) };
  }
  const match = /^\/api\/rooms\/([A-Z2-9]{6})\/(join|sync|start|next|leave)$/.exec(route);
  const room = match && rooms.get(match[1]);
  if (!room) reject(404, "Room not found. Check the code with your host.");
  advance(room, now);
  const action = match[2];
  if (action === "join") {
    const { member, token } = join(room, body.name, now);
    return { token, ...snapshot(room, member, {}, now) };
  }
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const member = room.members.get(token);
  if (!member) reject(403, "Your place in this room expired. Join again to continue.");
  member.lastSeen = now;
  if (action === "start" || action === "next") {
    if (member.id !== room.host) reject(403, "Only the host can start the test.");
    // Bind the command to the round the host saw so a retry cannot start a later round.
    if ((action === "next" ? body.round : body.round ?? 1) !== room.round) return snapshot(room, member, body, now);
    if (room.phase === (action === "next" ? "results" : "lobby")) {
      if (room.members.size < 2) reject(409, "Invite another typist before starting.");
      if (room.phase === "results") {
        const config = body.config === undefined ? room.config : configuration(body.config);
        const page = firstPage(config);
        room.config = config;
        room.pages = [page];
        room.leaderboard = [];
        room.round++;
        for (const participant of room.members.values()) Object.assign(participant, freshAttempt());
      }
      room.start = now + 5000;
      room.end = room.start + room.config.duration * 1000;
      room.phase = "countdown";
      room.remaining = room.members.size;
      for (const participant of room.members.values()) participant.status = "typing";
      room.version++;
    }
  } else if (action === "leave") {
    leave(room, token, now);
    return {};
  } else if (body.text !== undefined && (body.round ?? 1) === room.round) {
    acceptInput(room, member, body.page, body.text, now);
  }
  return snapshot(room, member, body, now);
}

const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const publicFiles = new Set(["/index.html", "/styles.css", "/typing-tests.js", "/paper-review.js", "/script.js", "/rooms.js"]);
const server = http.createServer(async (req, res) => {
  try {
    const route = new URL(req.url, "http://localhost").pathname;
    if (route.startsWith("/api/")) {
      const result = await roomRequest(req, route);
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(JSON.stringify(result));
    }
    const file = route === "/" ? "/index.html" : route;
    if (!["GET", "HEAD"].includes(req.method) || !(publicFiles.has(file) || /^\/assets\/(fonts\/)?[\w.-]+\.(svg|js|woff2|txt)$/.test(file))) reject(404, "File not found.");
    const filename = path.join(__dirname, file);
    const stat = await fs.promises.stat(filename);
    res.writeHead(200, { "Content-Type": contentTypes[path.extname(file)], "Content-Length": stat.size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filename).on("error", () => res.destroy()).pipe(res);
  } catch (error) {
    const status = error.status || (error.code === "ENOENT" ? 404 : 500);
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ error: status === 500 ? "Room server error." : error.message }));
  }
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    advance(room, now);
    if (acceptingPlayers(room)) {
      for (const [token, member] of room.members) {
        if (now - Math.max(member.lastSeen, room.finishedAt) > lobbyTimeout) leave(room, token, now);
      }
    }
    if (room.phase === "results" && !room.members.size && now - room.finishedAt > resultsLifetime) rooms.delete(room.code);
  }
}, 15000).unref();

server.listen(Number(process.env.PORT || 8000), process.env.HOST || "0.0.0.0", () => {
  console.log("Keystack room server listening on port " + server.address().port);
});
