const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

let server;
let origin;
before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, "../room-server.js")], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: "0" }
  });
  const [message] = await once(server.stdout, "data");
  origin = "http://127.0.0.1:" + /port (\d+)/.exec(message)[1];
});
after(async () => {
  const exit = once(server, "exit");
  server.kill();
  await exit;
});

async function post(route, body, token, status = 200) {
  const response = await fetch(origin + "/api/rooms" + route, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  assert.equal(response.status, status, data.error);
  return data;
}

const config = { mode: "time", difficulty: "easy", duration: 1 };
function call(room, action, body = {}, status = 200) {
  return post("/" + room.code + "/" + action, body, room.token, status);
}

test("rooms share every passage mode and transfer ownership when the host leaves", async () => {
  for (const mode of ["time", "words", "quote", "numbers", "punctuation", "custom", "skill", "paper"]) {
    const host = await post("", { name: "Host", config: { ...config, mode, difficulty: "hard", language: "hindi",
      customPassage: "A shared passage.", duration: ["paper", "skill"].includes(mode) ? 600 : 86400 } });
    const guest = await call(host, "join", { name: "Guest" });
    assert.equal(host.passage, guest.passage);
    if (mode === "skill") assert.match(guest.passage, /[अ-ह]/);
    if (mode === "custom") assert.equal(guest.passage, "A shared passage.");
    if (mode === "paper") assert.equal(guest.passage, "");
    await call(guest, "start", {}, 403);
    await call(host, "leave");
    const promoted = await call(guest, "sync");
    assert.equal(promoted.host, guest.id);
    assert.equal(promoted.members.length, 1);
    await call(guest, "start", {}, 409);
    await call(guest, "leave");
    await call(guest, "sync", {}, 404);
  }
});

test("shared deadline scores disconnected typists and rejects late edits and joins", async () => {
  const host = await post("", { name: "Host", config: { ...config, duration: 2 } });
  const peers = await Promise.all(Array.from({ length: 24 }, (_, i) => call(host, "join", { name: "Player " + i })));
  const start = await call(host, "start");
  assert.equal(start.members.length, 25);
  assert.equal(start.end - start.start, 2000);
  const early = await call(host, "sync", { text: "early", page: 0 });
  assert.equal(early.text, "");
  await call(host, "join", { name: "Late" }, 409);
  await post("/" + host.code + "/sync", {}, "invalid", 403);
  await delay(start.start - Date.now() + 15);
  const body = { text: host.passage.slice(0, 10), page: 0 };
  await Promise.all([host, peers[0]].map(m => call(m, "sync", body)));
  assert.equal((await call(peers[0], "sync")).text, body.text);
  await call(peers[1], "leave");
  await delay(start.end - Date.now() + 15);
  const result = await call(host, "sync", { page: 0, text: host.passage });
  assert.equal(result.phase, "results");
  assert.equal(result.text, body.text);
  const ranked = result.leaderboard.filter(m => m.ranked);
  assert.deepEqual(ranked.map(m => [m.wpm, m.accuracy]), [[60, 100], [60, 100]]);
  assert.equal(result.leaderboard.find(m => m.id === peers[1].id).status, "left");
});

test("continuous tests share subsequent pages and ignore a retried page submission", async () => {
  const host = await post("", { name: "Host", config: { ...config, duration: 30 } });
  const guest = await call(host, "join", { name: "Guest" });
  const start = await call(host, "start");
  await delay(start.start - Date.now() + 15);
  const body = { page: 0, text: host.passage };
  const results = await Promise.all([host, guest].map(m => call(m, "sync", body)));
  assert.equal(results[0].page, 1);
  assert.equal(results[0].passage, results[1].passage);
  const repeated = await call(host, "sync", body);
  assert.equal(repeated.page, 1);
  assert.equal(repeated.text, "");
  await call(host, "sync", { page: 1, text: "x ".repeat(10) });
  await call(guest, "leave");
  const final = await call(host, "sync");
  assert.equal(final.phase, "results");
  assert.equal(final.leaderboard[0].status, "error limit");
});

test("new players join between rounds without changing scores, and replay starts with fresh attempts", async () => {
  const host = await post("", { name: "Host", config });
  const guest = await call(host, "join", { name: "Guest" });
  const first = await call(host, "start");
  await delay(first.start - Date.now() + 20);
  await call(guest, "sync", { round: 1, page: 0, text: first.passage.slice(0, 5) });
  await delay(first.end - Date.now() + 20);
  const result = await call(host, "sync");
  assert.equal(result.phase, "results");
  const newcomer = await call(host, "join", { name: "New player" });
  assert.deepEqual(newcomer.leaderboard, result.leaderboard);
  assert.equal(newcomer.members.length, 3);
  await call(host, "leave");
  const promoted = await call(guest, "sync");
  assert.equal(promoted.host, guest.id);
  assert.deepEqual(promoted.leaderboard, result.leaderboard);
  await call(newcomer, "next", { round: 1 }, 403);

  const changed = { ...config, mode: "custom", duration: 2, customPassage: "Start this round." };
  await call(guest, "next", { round: 1, config: { ...changed, duration: 0 } }, 400);
  const second = await call(guest, "next", { round: 1, config: changed });
  const duplicate = await call(guest, "next", { round: 1, config: changed });
  assert.equal(duplicate.start, second.start);
  assert.equal(second.round, 2);
  assert.equal(second.text, "");
  assert.equal(second.page, 0);
  assert.equal(second.passage, changed.customPassage);
  assert.equal(second.members.length, 2);
  const synced = await call(newcomer, "sync", { round: 1, page: 0, version: newcomer.version });
  assert.deepEqual(synced.config, second.config);
  assert.equal(synced.start, second.start);
  await call(guest, "join", { name: "Late" }, 409);
  await delay(second.start - Date.now() + 20);
  const stale = await call(guest, "sync", { round: 1, page: 0, text: changed.customPassage });
  assert.equal(stale.text, "");
  assert.equal(stale.status, "typing");
  await Promise.all([guest, newcomer].map(m => call(m, "sync", { round: 2, page: 0, text: changed.customPassage })));
  const secondResult = await call(guest, "sync");
  assert.equal(secondResult.phase, "results");
  assert.deepEqual(secondResult.leaderboard.map(m => m.accuracy), [100, 100]);
  assert.equal(secondResult.leaderboard.some(m => m.id === host.id), false);

  await call(guest, "leave");
  await call(newcomer, "leave");
  const returning = await call(guest, "join", { name: "Returning host" });
  assert.equal(returning.host, returning.id);
  assert.deepEqual(returning.leaderboard, secondResult.leaderboard);
  await call(returning, "next", { round: 2 }, 409);
  await call(returning, "join", { name: "Returning guest" });
  const replay = await call(returning, "next", { round: 2 });
  assert.equal(replay.round, 3);
  assert.deepEqual(replay.config, second.config);
});
