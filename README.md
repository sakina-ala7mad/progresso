# Productivity Timer — Part 1

This is the first isolated rebuild: **Timer Tracker only**. It is intentionally not the dashboard/habits/tasks/goals implementation yet.

## Run

```bash
npm install
npm run dev
```

## Implemented

- Countdown, Pomodoro, and Normal/count-up modes
- Direct `hh:mm:ss` editing for countdown
- Black timer text; red while paused
- Start / Pause / Resume / Quit / Restart controls
- Dark overlay modal on pause/quit
- Colored tag chips
- Create and edit tags without rewriting old session history
- Pomodoro focus + break inputs side-by-side
- Pomodoro `0 / N` session display before starting
- Only Pomodoro focus sessions are persisted
- Normal timer starts at `00:00:00` and counts upward
- Countdown/Pomodoro completion persists a session
- Quit persists elapsed focus time
- LocalStorage persistence for tags and sessions
- No fake session history

## LocalStorage keys

- `productivity_timer_tags_v1`
- `productivity_timer_sessions_v1`

Session shape follows the requested schema:

```js
{
  tagName: string,
  tagColor: string,
  durationMinutes: number,
  durationFormatted: string,
  timestamp: string
}
```

## Intentional decisions for this rebuild

1. Historical sessions keep the tag name/color captured at the time the session is saved. Editing a current tag therefore does not silently change history.
2. Quit saves elapsed focus time, because the specification says sessions are stored on completion **or quit**.
3. A Pomodoro break never creates a history record.
4. Mode switching is blocked while a timer is active so an accidental click cannot corrupt elapsed time.
5. Timer timing is based on wall-clock timestamps rather than assuming `setInterval` fires exactly on schedule.

## Tag deletion

Tags can now be deleted from the Timer page using the small red `×` control that appears when hovering a tag. Deleting a tag does not modify existing session history. The currently selected tag is automatically switched to another remaining tag. At least one tag must remain.

## Custom timer-completion sound (v6)

- The app uses `public/timer-notification.mp3`, a 10-second maximum excerpt cropped from the audio file supplied by the user.
- On the Timer page, click **Test Sound** once before starting a timer. This helps Safari authorize audio playback.
- When a countdown or Pomodoro phase finishes, a cheerful completion dialog appears. The sound loops until **Stop alarm** is clicked. Click **Let's go** to dismiss the celebration.
- If Safari is silent, go to Safari → Settings → Websites → Auto-Play and set **When visiting other websites** to **Allow All Auto-Play**, then reload and test the sound.

## About the macOS menu bar

This project is a browser-based Vite/React web app. A normal website cannot create a native item in the macOS menu bar like the battery, clock, or native apps. That requires a separate macOS menu-bar companion app or packaging the timer with native macOS integration. It is not controlled by a Safari setting.


## Start on macOS with one double-click

1. Keep this project folder somewhere convenient (for example, Documents).
2. Double-click **Start Productivity App.command**. It opens Terminal, installs dependencies on the first run if needed, starts the local server, and opens the app in your browser.
3. Keep the Terminal window open while using the app. Press Control+C in that window to stop the local server.
4. If macOS blocks the first launch, right-click the `.command` file, choose **Open**, and confirm.

Node.js (LTS) and npm are required. This launcher does not package a heavy native app; it runs the existing lightweight Vite web app locally.

## Automatic habit completion from timer tags

When creating or editing a habit, choose a timer tag under **Automatically complete from timer tag**. Once sessions with that tag total at least 60 minutes on the current local day, the habit is checked automatically. Leave the setting at **No link — check manually** for a regular manually checked habit. Linked habits can still be checked manually.

### Launcher troubleshooting (updated)

The `Start Productivity App.command` launcher now locates the project folder if it is inside the project, or if it has been moved to Desktop while the extracted `fixsound` folder remains beside it. The simplest setup is to keep the `.command` file inside the `fixsound` folder, in the same folder as `package.json`, and double-click it there. Do not copy only the launcher to Desktop unless the extracted project folder is also nearby.

## Part 4 v12 Notes and panel updates
- Copy Style remains saved after applying it; use Apply Style repeatedly, or Copy Style again to replace the saved formatting.
- Highlight colors automatically choose a contrasting text color for readability in both appearance modes.
- The Notes toolbar's right-side layout is wider and keeps its Top / Right / Both location selector visible.
- Selected note tags and the tag editor are displayed above the writing area.
- Dashboard, Timer, History, Habits, and Notes panels are keyed independently so changing one page's size does not carry over to another page.
