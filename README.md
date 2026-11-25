# Keystack Typing Practice

Keystack includes solo typing practice, a typing course, games, and multiplayer test rooms.

## Run locally

Start the room server with Node.js 22 or later.
It uses only built-in Node modules.

```bash
node room-server.js
```

Open `http://localhost:8000`.
For players on the same network, share the host computer's LAN address and port, such as `http://192.168.1.20:8000`.
The server listens on all network interfaces by default.
Set `HOST` or `PORT` to override the address or port.
Solo practice also works by opening `index.html` directly.

## Multiplayer rooms

Open **Rooms**, enter a name, choose the test settings, and select **Create room**.
Guests open the same server address and enter their name and the six-character room code.
Once at least two people have joined, the host can start the five-second countdown.
The server sets one start time and deadline for everyone and closes registration when the countdown begins.

Rooms support all six practice modes, custom durations up to 24 hours, English or Hindi commission skill tests, and paper transcription.
For paper transcription, the host supplies the same printed paper to each typist.
Refreshing the same tab restores the participant's place and their last input received by the server.
The leaderboard appears when everyone finishes or time runs out.
It ranks players by WPM, then accuracy, with shared ranks for ties.
The same room code then admits new players until the next countdown starts.
New arrivals appear in the waiting roster while the leaderboard keeps the scores of the players who took that round.
The host can select **Start next test** to reuse the settings or open **Change test settings** first.
Everyone still in the room starts the next round with a fresh score.
If the host leaves, the next player in the roster becomes host.
Paper transcription uses dictionary-recognized words for scoring.
Participants who leave during the test or enter no text are unranked.

There is no configured player limit.
Capacity depends on the single server process and its network connection.
Rooms live in memory and expire on server restart.
Inactive places in the waiting roster expire after two minutes.
An empty room with a completed round remains available until one hour after that round finished.
Internet play requires a reachable instance of the room server.

## Features

- 15, 30, 60, and 120-second tests
- Easy, Medium, and Hard passages
- Live WPM, accuracy, progress, and character counts
- Correct/incorrect character highlighting
- Final results, personal best, and LocalStorage history
- Dark/light themes and optional sound effects
- 130-lesson touch-typing course spanning foundation, rows, punctuation, capitals, numbers, sentences, speed drills, and mastery
- 11 built-in typing games (falling words and word sprints) placed at the end of every course stage
- Dedicated Games arcade with 7 standalone games, including the cartoon character game Kiko Dash, per-game best scores, replay, a themed background image, and floating key wallpaper
- Illustrated practice workspace with live readings, a responsive settings panel, and light and dark themes
- 141 total course items with completion tracking, stage labels, and a scrollable lesson sidebar
- Keyboard-friendly restart and lesson controls
