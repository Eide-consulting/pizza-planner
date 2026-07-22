# Pizzapp

A backwards-scheduling tool for pizza dough. You enter the time you want to start
baking and pick a fermentation (36h or 48h), optionally with poolish; Pizzapp computes
the clock time for each preparation step working backwards from the bake.

## Language

**Fermentation**:
The base dough procedure, chosen either as a preset by total length — **24h**, **36h**,
**48h**, or **72h** — or as **Custom**, where the user supplies a total room-temperature
budget and a total cold budget. Either way it defines the ordered sequence of main-dough
steps. Selectable independently of Poolish.
_Avoid_: Recipe, method (Pizzapp schedules time, it does not manage ingredients)

**Step**:
A single stage of preparation with a duration and an environment. The full sequence is
Mix → Rest → Bulk RT → Bulk Cold → Temper → Ball + Final Rise → Bake.
_Avoid_: Stage, phase

**Bake Start**:
The target clock time the user wants to begin baking. The anchor from which the whole
schedule is computed backwards.
_Avoid_: Finish time, deadline (Norwegian: _steika begynnelse_)

**Schedule**:
The set of clock times for every step, produced by summing step durations backwards
from the Bake Start.
_Avoid_: Plan, timeline

**RT (Room Temperature)**:
A step environment where the dough sits at ambient temperature.
_Avoid_: Bench, counter (Norwegian: _romtemperatur_)

**Cold**:
A step environment where the dough proofs in the fridge.
_Avoid_: CT, fridge, refrigerated (Norwegian: _kjøleskap_)

**Bulk**:
Proofing the whole dough mass together, before it is divided into balls.
_Avoid_: First rise

**Ball**:
Dividing the bulk dough into individual dough balls, followed by their final rise.
_Avoid_: Portion, split (Norwegian: _balling_)

**Temper**:
Letting Cold dough return to Room Temperature after the fridge, before balling.
_Avoid_: Warm up, rest (Norwegian: _romtemperering_)

**Poolish**:
An optional pre-ferment (make → ferment 20h → chill 1h) that can be added on top of
either Fermentation. When enabled, its timeline is anchored so the poolish is ready
exactly when the main dough is mixed; the chosen Fermentation's main-dough steps are
otherwise unchanged.
_Avoid_: Starter, preferment
