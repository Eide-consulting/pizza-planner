# Data-driven step model with Poolish as an optional linked pre-ferment timeline

Pizzapp computes a Schedule by walking a Fermentation's ordered list of timed Steps
backwards from the Bake Start, rather than hardcoding each fermentation's clock times.
This keeps the scheduling logic generic and makes adding or tweaking a fermentation a
data change.

Poolish is an orthogonal option that can be enabled on either the 36h or 48h
fermentation. When enabled, its pre-ferment (make → ferment 20h → chill 1h) runs on its
own timeline and must finish exactly when the main dough is mixed. We model this as a
separate pre-ferment step sequence anchored to the main-dough mix, computed
independently and then merged into one chronological Schedule. Modelling the pre-ferment
as just more steps in the chosen fermentation's flat list was rejected because the chill
must land on the mix, not on the previous step's end the way a normal step does — the
anchor point is semantically different, and poolish must compose with either
fermentation without duplicating their step lists.

## Consequences

- The selectable design space is Fermentation (36h | 48h) × Poolish (on | off).
- Adding a new base fermentation is pure data (a step list); no logic changes.
- Poolish composes with any fermentation and any future pre-ferment (e.g. biga) reuses
  the linked-timeline mechanism.
- The merge step must handle interleaving pre-ferment steps into the main timeline.
