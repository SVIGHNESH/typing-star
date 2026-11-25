function createPaperReview(editor) {
  const view = editor.closest(".view");
  const panel = view.querySelector("#paperReview");
  const workspace = view.querySelector(".paper-workspace");
  const history = view.querySelector("#paperEdits");
  let dictionary;
  let previous = "";
  let selection;
  let edits = [];
  let backspace;
  let keyboardBackspace = false;
  let attempt = 0;

  // A classic script also works when index.html is opened directly from disk.
  function loadDictionary() {
    if (!dictionary) {
      dictionary = new Promise(resolve => {
        const script = document.createElement("script");
        script.src = "assets/english-words.js";
        script.onload = () => resolve(paperEnglishWords);
        script.onerror = () => {
          dictionary = null;
          resolve(null);
        };
        document.head.append(script);
      });
    }
    return dictionary;
  }

  function reset() {
    attempt++;
    previous = "";
    selection = null;
    edits = [];
    backspace = null;
    panel.hidden = true;
    workspace.hidden = false;
    view.querySelector("#paperHistory").open = false;
    history.replaceChildren();
  }

  function addBackspace() {
    backspace = { action: "Backspace", at: editor.selectionStart, removed: "", added: "" };
    edits.push(backspace);
  }

  editor.addEventListener("keydown", event => {
    backspace = null;
    keyboardBackspace = !editor.readOnly && event.key === "Backspace";
    if (keyboardBackspace) addBackspace();
  });
  editor.addEventListener("keyup", () => { backspace = null; });
  editor.addEventListener("blur", () => { backspace = null; });

  const isBackward = type => /^delete.*Backward$/.test(type);
  editor.addEventListener("beforeinput", event => {
    selection = [editor.selectionStart, editor.selectionEnd];
    if (!editor.readOnly && isBackward(event.inputType) && !(keyboardBackspace && backspace)) addBackspace();
  });

  function record(value, event) {
    if (!event) {
      loadDictionary();
      return;
    }
    // Anchor the unchanged suffix at the caret to disambiguate repeated letters.
    let oldEnd = previous.length;
    let newEnd = value.length;
    while (oldEnd && newEnd > editor.selectionStart && previous[oldEnd - 1] === value[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    let at = 0;
    while (at < oldEnd && at < newEnd && previous[at] === value[at]) at++;
    // Preserve the actual selection, even when the replacement shares letters.
    if (selection && selection[0] < selection[1]) {
      const [start, end] = selection;
      const tail = previous.slice(end);
      if (value.length >= start + tail.length && value.startsWith(previous.slice(0, start)) && value.endsWith(tail)) {
        at = start;
        oldEnd = end;
        newEnd = value.length - tail.length;
      }
    }
    selection = null;
    const removed = previous.slice(at, oldEnd);
    const added = value.slice(at, newEnd);
    previous = value;

    const type = event.inputType || "";
    if (isBackward(type)) {
      if (!backspace) addBackspace();
      Object.assign(backspace, { at, removed, added });
    } else if (removed || added) {
      const labels = {
        insertFromPaste: "Paste", insertFromDrop: "Drop", deleteByCut: "Cut",
        historyUndo: "Undo", historyRedo: "Redo"
      };
      const action = labels[type] || (removed && added ? "Replace" : removed ? "Delete" : "Type");
      const last = edits.at(-1);
      if (action === "Type" && last?.action === "Type" && last.at + last.added.length === at) {
        last.added += added;
      } else {
        edits.push({ action, at, removed, added });
      }
    }
    backspace = null;
  }

  function renderHistory() {
    const rows = document.createDocumentFragment();
    for (const { action, at, removed, added } of edits) {
      const row = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = action;
      const detail = document.createElement("code");
      const parts = [];
      if (removed) parts.push("Removed " + JSON.stringify(removed));
      if (added) parts.push((removed ? "added " : "") + JSON.stringify(added));
      detail.textContent = parts.join(", ") || "Nothing to remove";
      const position = document.createElement("small");
      position.textContent = "Position " + (at + 1);
      row.append(label, detail, position);
      rows.append(row);
    }
    history.replaceChildren(rows);
    view.querySelector("#paperNoEdits").hidden = edits.length !== 0;
  }

  async function finish(elapsed) {
    const currentAttempt = attempt;
    const text = editor.value;
    const words = await loadDictionary();
    if (currentAttempt !== attempt) return;
    const transcript = document.createDocumentFragment();
    let cursor = 0;
    let count = 0;
    let flagged = 0;
    let characters = 0;
    for (const match of text.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu)) {
      const token = match[0];
      if (!/\p{L}/u.test(token)) continue;
      const word = token.normalize("NFC").replaceAll("’", "'").toLowerCase();
      const known = words?.has(word) || (word.endsWith("'s") && words?.has(word.slice(0, -2)));
      transcript.append(text.slice(cursor, match.index));
      cursor = match.index + token.length;
      if (known) {
        characters += [...token].length + Number(/\s/u.test(text.charAt(cursor)));
      }
      if (words && !known) {
        const mark = document.createElement("mark");
        mark.textContent = token;
        transcript.append(mark);
        flagged++;
      } else {
        transcript.append(token);
      }
      count++;
    }
    transcript.append(text.slice(cursor) || (text ? "" : "No text entered."));
    const wpm = Math.round(characters / 5 / (elapsed / 60));
    const outcome = view.querySelector("#paperOutcome");
    outcome.textContent = words ? (wpm >= 35 ? "Pass" : "Below pass mark") : "Unscored";
    outcome.classList.toggle("passed", Boolean(words) && wpm >= 35);
    view.querySelector("#paperSpeed").textContent = words ? wpm + " WPM" : "Unavailable";
    view.querySelector("#paperWords").textContent = count;
    view.querySelector("#paperFlagged").textContent = words ? flagged : "Unchecked";
    view.querySelector("#paperBackspaces").textContent = edits.filter(edit => edit.action === "Backspace").length;
    view.querySelector("#paperScoreNote").textContent = words
      ? "Passing speed is 35 WPM. Speed uses five characters per word and counts recognized words plus one space after each, if typed."
      : "The English dictionary could not be loaded. Your transcription and edit history are available below.";
    view.querySelector("#paperSpellingNote").textContent = words
      ? (flagged ? "Underlined words are missing from the English dictionary. Names and technical terms may be flagged." : "No words flagged by the English dictionary.")
      : "Spelling unchecked.";
    view.querySelector("#paperTranscript").replaceChildren(transcript);
    renderHistory();
    workspace.hidden = true;
    panel.hidden = false;
    if (view.classList.contains("active")) view.querySelector("#paperReviewTitle").focus();
  }

  return { reset, record, finish };
}
