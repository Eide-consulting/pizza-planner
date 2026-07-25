// Pure backwards-scheduling logic. No DOM, no I/O — import this in the browser and in
// node:test alike. See docs/adr/0001-data-driven-step-schedule.md for the model.

import { FERMENTATIONS, POOLISH_STEPS, buildCustomFermentation } from './methods.js';

/**
 * @typedef {Object} ScheduleEntry
 * @property {Date}    time          When to start this action.
 * @property {string}  label         What to do.
 * @property {number}  durationMin   How long the action lasts (0 for the bake).
 * @property {'poolish'|'main'|'bake'} kind
 */

const MS_PER_MIN = 60 * 1000;
const MINS_PER_DAY = 24 * 60;

// The final rise must never be shortened below this when shifting time out of it to
// clear the quiet window; a ball needs a real proof no matter what the clock says.
const MIN_BALL_MIN = 2 * 60;

/** Minutes elapsed since local midnight for a Date. */
function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Shift room-temperature time out of the balls' final rise and into the pre-fridge bulk
 * so that balling does not start during a quiet window (e.g. overnight). Total room-
 * temperature time, total cold time, and the bake time are all unchanged: only the split
 * between the two room-temperature steps moves, which pushes the balling start later.
 *
 * Balling can only ever be pushed *later* (the pre-fridge bulk grows, the final rise
 * shrinks), so a start already at or before the window is left untouched. If clearing the
 * window would shorten the final rise below MIN_BALL_MIN, we shift as much as allowed and
 * leave the rest — a best effort rather than an unusable dough.
 *
 * @param {import('./methods.js').Step[]} steps  Ordered first → last.
 * @param {Date}   bakeStart
 * @param {{startMin: number, endMin: number}} [quietWindow]  Minutes since midnight.
 * @returns {import('./methods.js').Step[]}  A new array; inputs are never mutated.
 */
function applyQuietWindow(steps, bakeStart, quietWindow) {
  if (!quietWindow) return steps;
  const { startMin, endMin } = quietWindow;
  // An unset or zero-length window (start === end) means "no quiet hours".
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || startMin === endMin) {
    return steps;
  }

  const ball = steps.find((s) => s.id === 'ball');
  const bulkRt = steps.find((s) => s.id === 'bulk-rt');
  if (!ball || !bulkRt) return steps;

  const ballingStart = new Date(bakeStart.getTime() - ball.durationMin * MS_PER_MIN);
  const t = minutesOfDay(ballingStart);
  const inWindow =
    startMin < endMin ? t >= startMin && t < endMin : t >= startMin || t < endMin;
  if (!inWindow) return steps;

  // Minutes forward from the balling start to the next end-of-window boundary.
  const delta = ((endMin - t) % MINS_PER_DAY + MINS_PER_DAY) % MINS_PER_DAY;
  const available = ball.durationMin - MIN_BALL_MIN;
  const shift = Math.min(delta, available);
  if (shift <= 0) return steps;

  return steps.map((s) => {
    if (s.id === 'ball') return { ...s, durationMin: s.durationMin - shift };
    if (s.id === 'bulk-rt') return { ...s, durationMin: s.durationMin + shift };
    return s;
  });
}

/**
 * Walk an ordered step list backwards from an anchor end time, returning entries with
 * absolute start times. Returns the start time of the first step as well.
 *
 * @param {import('./methods.js').Step[]} steps  Ordered first → last.
 * @param {Date}   anchorEnd  The moment the last step finishes.
 * @param {'poolish'|'main'} kind
 * @returns {{ entries: ScheduleEntry[], firstStart: Date }}
 */
function scheduleBackwards(steps, anchorEnd, kind) {
  const entries = [];
  let cursor = anchorEnd.getTime();
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    const start = cursor - step.durationMin * MS_PER_MIN;
    entries.push({
      time: new Date(start),
      label: step.label,
      durationMin: step.durationMin,
      kind,
    });
    cursor = start;
  }
  entries.reverse();
  return { entries, firstStart: new Date(cursor) };
}

/**
 * Build the full chronological schedule for a dough.
 *
 * @param {Object} options
 * @param {string}  options.fermentationId  '24h', '36h', '48h', '72h', or 'custom'.
 * @param {{rtHours: number, ctHours: number}} [options.custom]  Used when fermentationId is 'custom'.
 * @param {boolean} options.withPoolish
 * @param {Date}    options.bakeStart        When you want to start baking.
 * @param {{startMin: number, endMin: number}} [options.quietWindow]  Optional hours,
 *   as minutes since midnight, during which balling must not start. When the default
 *   balling start falls inside it, room-temperature time is moved from the final rise
 *   into the pre-fridge bulk to push balling to the end of the window.
 * @returns {ScheduleEntry[]}  Sorted earliest → latest, ending with the bake.
 */
export function buildSchedule({ fermentationId, custom, withPoolish, bakeStart, quietWindow }) {
  const fermentation =
    fermentationId === 'custom' ? buildCustomFermentation(custom ?? {}) : FERMENTATIONS[fermentationId];
  if (!fermentation) {
    throw new Error(`Unknown fermentation: ${fermentationId}`);
  }
  if (!(bakeStart instanceof Date) || Number.isNaN(bakeStart.getTime())) {
    throw new Error('bakeStart must be a valid Date');
  }

  const steps = applyQuietWindow(fermentation.steps, bakeStart, quietWindow);

  const { entries: mainEntries, firstStart: mixStart } = scheduleBackwards(
    steps,
    bakeStart,
    'main',
  );

  const entries = [...mainEntries];

  if (withPoolish) {
    // The poolish chill must finish exactly when the main dough is mixed.
    const { entries: poolishEntries } = scheduleBackwards(POOLISH_STEPS, mixStart, 'poolish');
    entries.push(...poolishEntries);
  }

  entries.push({ time: new Date(bakeStart.getTime()), label: 'Bake', durationMin: 0, kind: 'bake' });

  entries.sort((a, b) => a.time.getTime() - b.time.getTime());
  return entries;
}

/**
 * Format a duration in minutes as a compact human string, e.g. "36h", "2h 30m", "30m".
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
