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

/** @type {Record<string, Fermentation>} */
export const FERMENTATIONS = {
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
};

// Optional pre-ferment, prependable to either fermentation. The last step (chill) is
// anchored so it finishes exactly when the main dough is mixed.
/** @type {Step[]} */
export const POOLISH_STEPS = [
  { id: 'poolish-make', label: 'Make poolish', durationMin: 10 },
  { id: 'poolish-ferment', label: 'Ferment poolish at room temperature', durationMin: 20 * H },
  { id: 'poolish-chill', label: 'Chill poolish in the fridge', durationMin: 1 * H },
];
