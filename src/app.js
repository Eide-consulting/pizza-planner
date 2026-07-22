// DOM wiring for Pizzapp. Reads the form, calls the pure scheduler, renders the list.

import { buildSchedule, formatDuration } from './schedule.js';

const form = document.getElementById('scheduler-form');
const bakeInput = document.getElementById('bake-start');
const output = document.getElementById('schedule');
const errorBox = document.getElementById('error');
const customTimes = document.querySelector('.custom-times');

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// Prefill the bake time with the next 18:00, as a sensible default.
function defaultBakeStart() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(18, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function render(entries) {
  output.replaceChildren();
  for (const entry of entries) {
    const li = document.createElement('li');
    li.className = `step step--${entry.kind}`;

    const time = document.createElement('span');
    time.className = 'step__time';
    time.textContent = dateFmt.format(entry.time);

    const label = document.createElement('span');
    label.className = 'step__label';
    label.textContent = entry.label;

    li.append(time, label);

    const dur = formatDuration(entry.durationMin);
    if (dur) {
      const badge = document.createElement('span');
      badge.className = 'step__duration';
      badge.textContent = dur;
      li.append(badge);
    }

    output.append(li);
  }
}

function update() {
  errorBox.textContent = '';
  try {
    const fermentationId = form.elements.fermentation.value;
    const withPoolish = form.elements.poolish.checked;
    const bakeStart = new Date(bakeInput.value);
    const custom = {
      rtHours: Number(form.elements.rtHours.value),
      ctHours: Number(form.elements.ctHours.value),
    };
    customTimes.hidden = fermentationId !== 'custom';
    if (Number.isNaN(bakeStart.getTime())) {
      output.replaceChildren();
      return;
    }
    render(buildSchedule({ fermentationId, custom, withPoolish, bakeStart }));
  } catch (err) {
    output.replaceChildren();
    errorBox.textContent = err instanceof Error ? err.message : String(err);
  }
}

bakeInput.value = toInputValue(defaultBakeStart());
form.addEventListener('input', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
