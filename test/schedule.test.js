import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildSchedule, formatDuration } from '../src/schedule.js';
import { FERMENTATIONS, POOLISH_STEPS } from '../src/methods.js';

const MS_PER_MIN = 60 * 1000;
const BAKE = new Date('2026-07-23T16:00:00');

function sumDurations(steps) {
  return steps.reduce((total, s) => total + s.durationMin, 0);
}

function entryFor(entries, label) {
  return entries.find((e) => e.label === label);
}

test('36h schedule ends with the bake at the requested time', () => {
  const entries = buildSchedule({ fermentationId: '36h', withPoolish: false, bakeStart: BAKE });
  const last = entries[entries.length - 1];
  assert.equal(last.label, 'Bake');
  assert.equal(last.time.getTime(), BAKE.getTime());
});

test('entries are sorted chronologically', () => {
  const entries = buildSchedule({ fermentationId: '48h', withPoolish: true, bakeStart: BAKE });
  for (let i = 1; i < entries.length; i++) {
    assert.ok(entries[i].time.getTime() >= entries[i - 1].time.getTime());
  }
});

test('36h without poolish: mix starts one full lead time before the bake', () => {
  const entries = buildSchedule({ fermentationId: '36h', withPoolish: false, bakeStart: BAKE });
  const lead = sumDurations(FERMENTATIONS['36h'].steps); // 30+30+120+1440+120+480 = 2220
  assert.equal(lead, 2220);
  const mix = entryFor(entries, 'Mix dough');
  assert.equal(mix.time.getTime(), BAKE.getTime() - lead * MS_PER_MIN);
});

test('48h cold bulk is 12h longer than 36h', () => {
  const cold36 = FERMENTATIONS['36h'].steps.find((s) => s.id === 'bulk-cold').durationMin;
  const cold48 = FERMENTATIONS['48h'].steps.find((s) => s.id === 'bulk-cold').durationMin;
  assert.equal(cold48 - cold36, 12 * 60);
});

test('poolish chill finishes exactly when the main dough is mixed', () => {
  const entries = buildSchedule({ fermentationId: '36h', withPoolish: true, bakeStart: BAKE });
  const mix = entryFor(entries, 'Mix dough');
  const chill = entryFor(entries, 'Chill poolish in the fridge');
  const chillDuration = POOLISH_STEPS.find((s) => s.id === 'poolish-chill').durationMin;
  assert.ok(chill, 'chill step present when poolish enabled');
  assert.equal(chill.time.getTime() + chillDuration * MS_PER_MIN, mix.time.getTime());
});

test('poolish "make" is the very first action', () => {
  const entries = buildSchedule({ fermentationId: '48h', withPoolish: true, bakeStart: BAKE });
  assert.equal(entries[0].label, 'Make poolish');
});

test('no poolish steps appear when poolish is off', () => {
  const entries = buildSchedule({ fermentationId: '36h', withPoolish: false, bakeStart: BAKE });
  assert.ok(entries.every((e) => e.kind !== 'poolish'));
});

test('unknown fermentation throws', () => {
  assert.throws(() => buildSchedule({ fermentationId: '99h', withPoolish: false, bakeStart: BAKE }));
});

test('invalid bake time throws', () => {
  assert.throws(() =>
    buildSchedule({ fermentationId: '36h', withPoolish: false, bakeStart: new Date('nope') }),
  );
});

test('formatDuration renders compactly', () => {
  assert.equal(formatDuration(36 * 60), '36h');
  assert.equal(formatDuration(150), '2h 30m');
  assert.equal(formatDuration(30), '30m');
  assert.equal(formatDuration(0), '');
});

test('custom method sends all cold time to the fridge bulk', () => {
  const entries = buildSchedule({
    fermentationId: 'custom',
    custom: { rtHours: 12, ctHours: 30 },
    withPoolish: false,
    bakeStart: BAKE,
  });
  const cold = entryFor(entries, 'Bulk rise in the fridge');
  assert.equal(cold.durationMin, 30 * 60);
});

test('custom method puts all room-temperature time beyond 4h into the ball rise', () => {
  const entries = buildSchedule({
    fermentationId: 'custom',
    custom: { rtHours: 14, ctHours: 58 },
    withPoolish: false,
    bakeStart: BAKE,
  });
  const ball = entryFor(entries, 'Ball & final rise at room temperature');
  const bulkRt = entryFor(entries, 'Bulk rise at room temperature');
  const temper = entryFor(entries, 'Temper (bring to room temperature)');
  assert.equal(bulkRt.durationMin, 2 * 60);
  assert.equal(temper.durationMin, 2 * 60);
  assert.equal(ball.durationMin, (14 - 4) * 60); // matches the 72h preset's 10h ball
});

test('custom method rejects room-temperature time of 4h or less', () => {
  assert.throws(() =>
    buildSchedule({
      fermentationId: 'custom',
      custom: { rtHours: 4, ctHours: 24 },
      withPoolish: false,
      bakeStart: BAKE,
    }),
  );
});

test('custom method rejects negative cold time', () => {
  assert.throws(() =>
    buildSchedule({
      fermentationId: 'custom',
      custom: { rtHours: 12, ctHours: -1 },
      withPoolish: false,
      bakeStart: BAKE,
    }),
  );
});

// Quiet window: 22:00–08:00 expressed as minutes since midnight.
const QUIET = { startMin: 22 * 60, endMin: 8 * 60 };
const NIGHT_BAKE = new Date('2026-07-23T12:00:00'); // 36h ball → balling at 04:00

test('quiet window shifts RT from the ball rise into the pre-fridge bulk', () => {
  const entries = buildSchedule({
    fermentationId: '36h',
    withPoolish: false,
    bakeStart: NIGHT_BAKE,
    quietWindow: QUIET,
  });
  const ball = entryFor(entries, 'Ball & final rise at room temperature');
  const bulkRt = entryFor(entries, 'Bulk rise at room temperature');
  // Balling would start at 04:00 (inside 22:00–08:00); it is pushed to 08:00, so 4h of
  // final rise moves into the pre-fridge bulk (2h → 6h, 8h → 4h).
  assert.equal(ball.durationMin, 4 * 60);
  assert.equal(bulkRt.durationMin, 6 * 60);
  assert.equal(ball.time.getTime(), NIGHT_BAKE.getTime() - 4 * 60 * MS_PER_MIN); // 08:00
  assert.equal(ball.time.getHours(), 8);
});

test('quiet window keeps the total lead time (mix and bake are unmoved)', () => {
  const plain = buildSchedule({ fermentationId: '36h', withPoolish: false, bakeStart: NIGHT_BAKE });
  const quiet = buildSchedule({
    fermentationId: '36h',
    withPoolish: false,
    bakeStart: NIGHT_BAKE,
    quietWindow: QUIET,
  });
  assert.equal(
    entryFor(quiet, 'Mix dough').time.getTime(),
    entryFor(plain, 'Mix dough').time.getTime(),
  );
  assert.equal(quiet[quiet.length - 1].time.getTime(), NIGHT_BAKE.getTime());
});

test('quiet window leaves a daytime balling start untouched', () => {
  // BAKE is 16:00; the 36h ball rise of 8h puts balling at 08:00, at the window edge.
  const plain = buildSchedule({ fermentationId: '36h', withPoolish: false, bakeStart: BAKE });
  const quiet = buildSchedule({
    fermentationId: '36h',
    withPoolish: false,
    bakeStart: BAKE,
    quietWindow: QUIET,
  });
  assert.equal(
    entryFor(quiet, 'Ball & final rise at room temperature').durationMin,
    entryFor(plain, 'Ball & final rise at room temperature').durationMin,
  );
});

test('quiet window never shortens the final rise below 2h (best effort)', () => {
  // Bake at 09:00 → balling at 01:00; clearing to 08:00 needs 7h but only 6h is available
  // (8h ball down to the 2h floor), so it shifts 6h and stops.
  const earlyBake = new Date('2026-07-23T09:00:00');
  const entries = buildSchedule({
    fermentationId: '36h',
    withPoolish: false,
    bakeStart: earlyBake,
    quietWindow: QUIET,
  });
  const ball = entryFor(entries, 'Ball & final rise at room temperature');
  const bulkRt = entryFor(entries, 'Bulk rise at room temperature');
  assert.equal(ball.durationMin, 2 * 60);
  assert.equal(bulkRt.durationMin, 8 * 60);
});

test('quiet window does not mutate the shared fermentation presets', () => {
  buildSchedule({
    fermentationId: '36h',
    withPoolish: false,
    bakeStart: NIGHT_BAKE,
    quietWindow: QUIET,
  });
  const ball = FERMENTATIONS['36h'].steps.find((s) => s.id === 'ball');
  const bulkRt = FERMENTATIONS['36h'].steps.find((s) => s.id === 'bulk-rt');
  assert.equal(ball.durationMin, 8 * 60);
  assert.equal(bulkRt.durationMin, 2 * 60);
});
