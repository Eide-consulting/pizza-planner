// Pure backwards-scheduling logic. No DOM, no I/O — import this in the browser and in
// node:test alike. See docs/adr/0001-data-driven-step-schedule.md for the model.

import { FERMENTATIONS, POOLISH_STEPS } from './methods.js';

/**
 * @typedef {Object} ScheduleEntry
 * @property {Date}    time          When to start this action.
 * @property {string}  label         What to do.
 * @property {number}  durationMin   How long the action lasts (0 for the bake).
 * @property {'poolish'|'main'|'bake'} kind
 */

const MS_PER_MIN = 60 * 1000;

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
 * @param {string}  options.fermentationId  '36h' or '48h'.
 * @param {boolean} options.withPoolish
 * @param {Date}    options.bakeStart        When you want to start baking.
 * @returns {ScheduleEntry[]}  Sorted earliest → latest, ending with the bake.
 */
export function buildSchedule({ fermentationId, withPoolish, bakeStart }) {
  const fermentation = FERMENTATIONS[fermentationId];
  if (!fermentation) {
    throw new Error(`Unknown fermentation: ${fermentationId}`);
  }
  if (!(bakeStart instanceof Date) || Number.isNaN(bakeStart.getTime())) {
    throw new Error('bakeStart must be a valid Date');
  }

  const { entries: mainEntries, firstStart: mixStart } = scheduleBackwards(
    fermentation.steps,
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
