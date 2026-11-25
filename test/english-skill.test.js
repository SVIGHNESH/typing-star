const assert = require("node:assert/strict");
const test = require("node:test");
const papers = require("../assets/english-skill-passages");
const { selectSkillPaper } = require("../typing-tests");

test("every English skill paper supplies ten minutes of typeable text at 200 WPM", (t) => {
  for (const [index, paper] of papers.entries()) {
    const random = t.mock.method(Math, "random", () => index / papers.length);
    const { text } = selectSkillPaper("english");
    assert.equal(text, paper.text);
    assert.ok(text.length >= 10 * 200 * 5, paper.title);
    assert.match(text, /^[ -~]+$/);
    assert.ok(paper.author && paper.title && URL.canParse(paper.url));
    random.mock.restore();
  }
});

test("an English retry selects a different paper", () => {
  for (const previous of papers) {
    const next = selectSkillPaper("english", previous);
    assert.notEqual(next.text, previous.text);
  }
});
