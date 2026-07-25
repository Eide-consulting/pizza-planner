# Quiet window shifts room-temperature time from the final rise into the pre-fridge bulk

The Ball step always starts one final-rise duration before the Bake Start, so an early or
midday bake can push balling into the middle of the night — you would have to get up at
02:00 to divide dough. Pizzapp lets the user declare a **Quiet window** (e.g. 22:00–08:00)
during which balling must not start.

When the default balling start falls inside the window, we move room-temperature time out
of the balls' final rise and into the pre-fridge Bulk RT step by the amount needed to
reach the end of the window. Because the moved time stays within the room-temperature
budget and only changes *which* room-temperature step it belongs to, three invariants
hold: the Bake Start is unchanged, the total room-temperature time is unchanged, and the
total cold time is unchanged. The Mix time (bake minus the full lead) therefore does not
move either, so a linked poolish timeline is unaffected. Only the balling start slides
later, to the end of the window.

The shift is one-directional: growing the pre-fridge bulk can only push balling *later*,
never earlier, so a balling start already before the window is left untouched. If clearing
the window would shorten the final rise below a 2h floor, we shift as much as the floor
allows and stop — a best effort that protects the dough rather than an error or an
unusable proof.

## Consequences

- The quiet window is a pure, optional post-processing step on the resolved step list; it
  composes with every fermentation preset and with Custom, and needs no per-preset data.
- It never mutates the shared `FERMENTATIONS` presets — the adjusted step list is a copy.
- Because only the bulk/ball split moves, the feature cannot reschedule the mix, the bake,
  or the poolish, keeping the existing scheduling invariants intact.
- The 2h final-rise floor means a window that is impossible to fully clear yields the best
  achievable balling start rather than a failure.
