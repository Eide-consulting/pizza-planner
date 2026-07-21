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
