// Dough data for Pizzapp. Values come from the Pizzamani book (36h / 48h doughs and
// the poolish pre-ferment). Durations are in minutes. See CONTEXT.md for vocabulary.

/**
 * @typedef {Object} Step
 * @property {string} id            Stable identifier.
 * @property {string} label         Human-readable action.
 * @property {number} durationMin   How long this action lasts, in minutes.
 */

/**
 * @typedef {Object} Fermentation
 * @property {string} id
 * @property {string} label
 * @property {Step[]} steps  Ordered first action → last action before the bake.
 */

const H = 60;

// Room-temperature steps that stay fixed regardless of fermentation length: a short
// initial bulk before the fridge, and the temper after it. All other room-temperature
// time is spent on the balls' final rise.
const BULK_RT_MIN = 2 * H;
const TEMPER_MIN = 2 * H;

/** @type {Record<string, Fermentation>} */
export const FERMENTATIONS = {
  '24h': {
    id: '24h',
    label: '24-hour',
    steps: [
      { id: 'mix', label: 'Mix dough', durationMin: 30 },
      { id: 'rest', label: 'Rest dough', durationMin: 30 },
      { id: 'bulk-rt', label: 'Bulk rise at room temperature', durationMin: 2 * H },
      { id: 'bulk-cold', label: 'Bulk rise in the fridge', durationMin: 12 * H },
      { id: 'temper', label: 'Temper (bring to room temperature)', durationMin: 2 * H },
      { id: 'ball', label: 'Ball & final rise at room temperature', durationMin: 8 * H },
    ],
  },
  '36h': {
    id: '36h',
    label: '36-hour',
    steps: [
      { id: 'mix', label: 'Mix dough', durationMin: 30 },
      { id: 'rest', label: 'Rest dough', durationMin: 30 },
      { id: 'bulk-rt', label: 'Bulk rise at room temperature', durationMin: 2 * H },
      { id: 'bulk-cold', label: 'Bulk rise in the fridge', durationMin: 24 * H },
      { id: 'temper', label: 'Temper (bring to room temperature)', durationMin: 2 * H },
      { id: 'ball', label: 'Ball & final rise at room temperature', durationMin: 8 * H },
    ],
  },
  '48h': {
    id: '48h',
    label: '48-hour',
    steps: [
      { id: 'mix', label: 'Mix dough', durationMin: 30 },
      { id: 'rest', label: 'Rest dough', durationMin: 30 },
      { id: 'bulk-rt', label: 'Bulk rise at room temperature', durationMin: 2 * H },
      { id: 'bulk-cold', label: 'Bulk rise in the fridge', durationMin: 36 * H },
      { id: 'temper', label: 'Temper (bring to room temperature)', durationMin: 2 * H },
      { id: 'ball', label: 'Ball & final rise at room temperature', durationMin: 8 * H },
    ],
  },
  '72h': {
    id: '72h',
    label: '72-hour',
    steps: [
      { id: 'mix', label: 'Mix dough', durationMin: 30 },
      { id: 'rest', label: 'Rest dough', durationMin: 30 },
      { id: 'bulk-rt', label: 'Bulk rise at room temperature', durationMin: 2 * H },
      { id: 'bulk-cold', label: 'Bulk rise in the fridge', durationMin: 58 * H },
      { id: 'temper', label: 'Temper (bring to room temperature)', durationMin: 2 * H },
      { id: 'ball', label: 'Ball & final rise at room temperature', durationMin: 10 * H },
    ],
  },
};

/**
 * Build a fermentation from a total room-temperature budget and a total cold budget,
 * rather than a fixed preset. The short initial bulk (2h) and the temper (2h) are held
 * constant; all remaining room-temperature time goes to the balls' final rise, and all
 * cold time goes to the fridge bulk.
 *
 * @param {Object} options
 * @param {number} options.rtHours  Total room-temperature hours (must exceed 4).
 * @param {number} options.ctHours  Total cold/fridge hours (must be >= 0).
 * @returns {Fermentation}
 */
export function buildCustomFermentation({ rtHours, ctHours }) {
  if (!Number.isFinite(rtHours) || !Number.isFinite(ctHours)) {
    throw new Error('Custom times must be numbers');
  }
  if (ctHours < 0) {
    throw new Error('Cold time cannot be negative');
  }
  const ballMin = Math.round(rtHours * H) - BULK_RT_MIN - TEMPER_MIN;
  if (ballMin <= 0) {
    throw new Error('Room-temperature time must be more than 4 hours');
  }
  return {
    id: 'custom',
    label: 'Custom',
    steps: [
      { id: 'mix', label: 'Mix dough', durationMin: 30 },
      { id: 'rest', label: 'Rest dough', durationMin: 30 },
      { id: 'bulk-rt', label: 'Bulk rise at room temperature', durationMin: BULK_RT_MIN },
      { id: 'bulk-cold', label: 'Bulk rise in the fridge', durationMin: Math.round(ctHours * H) },
      { id: 'temper', label: 'Temper (bring to room temperature)', durationMin: TEMPER_MIN },
      { id: 'ball', label: 'Ball & final rise at room temperature', durationMin: ballMin },
    ],
  };
}

// Optional pre-ferment, prependable to either fermentation. The last step (chill) is
// anchored so it finishes exactly when the main dough is mixed.
/** @type {Step[]} */
export const POOLISH_STEPS = [
  { id: 'poolish-make', label: 'Make poolish', durationMin: 10 },
  { id: 'poolish-ferment', label: 'Ferment poolish at room temperature', durationMin: 20 * H },
  { id: 'poolish-chill', label: 'Chill poolish in the fridge', durationMin: 1 * H },
];
