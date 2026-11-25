const assert = require("node:assert/strict");
const test = require("node:test");
const papers = require("../assets/hindi-skill-passages");
const { selectSkillPaper } = require("../typing-tests");

test("all Hindi selections have a source and enough text for ten minutes at 200 WPM", (t) => {
  const random = t.mock.method(Math, "random");
  assert.ok(papers.length > 1);
  assert.equal(new Set(papers.map(paper => paper.text)).size, papers.length);
  for (const [index, paper] of papers.entries()) {
    random.mock.mockImplementation(() => index / papers.length);
    assert.equal(selectSkillPaper("hindi"), paper);
    assert.notEqual(selectSkillPaper("hindi", paper).text, paper.text);
    assert.ok(paper.text.length >= 10 * 200 * 5, paper.title);
    assert.equal(paper.text, paper.text.normalize("NFC"));
    assert.match(paper.text, /^[\p{Script_Extensions=Devanagari} \x21-\x40]+$/u);
    assert.ok(paper.author && paper.title && URL.canParse(paper.url));
  }
});
