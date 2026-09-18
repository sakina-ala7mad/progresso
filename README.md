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
