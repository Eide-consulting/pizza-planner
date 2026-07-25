# 🍕 Pizzapp

A tiny, mobile-friendly **backwards scheduler** for pizza dough. Tell it when you want
to start baking and pick your dough; it works out the clock time for every step —
mixing, rises, refrigeration, balling — so you know exactly when to start.

Based on the 36-hour and 48-hour doughs (and the poolish pre-ferment) from the
*Pizzamani — Perfekt pizza hjemme* book.

## What it does

- Pick a **fermentation**: **24-hour**, **36-hour**, **48-hour**, **72-hour**, or **Custom**.
- With **Custom**, enter a total room-temperature budget and a total cold/fridge budget;
  the short initial bulk (2h) and temper (2h) stay fixed, all remaining room-temperature
  time goes to the balls' final rise, and all cold time goes to the fridge bulk.
- Optionally add a **poolish** pre-ferment (20h ferment + 1h chill), prepended to either.
- Optionally set a **quiet window** (e.g. 22:00–08:00): if balling would start during it,
  Pizzapp moves room-temperature time out of the final rise and into the pre-fridge bulk
  so balling starts at the end of the window instead — the bake time and the total
  room-temperature and cold budgets stay the same.
- Enter your **bake start** (date + time).
- Get a single chronological checklist, earliest action first, each with weekday, date,
  time and how long it lasts.

Example (48h + poolish, baking Thursday 16:00):

```
Mon 20 Jul, 17:50   Make poolish                      10m
Mon 20 Jul, 18:00   Ferment poolish at room temp      20h
Tue 21 Jul, 14:00   Chill poolish in the fridge       1h
Tue 21 Jul, 15:00   Mix dough                         30m
Tue 21 Jul, 15:30   Rest dough                        30m
Tue 21 Jul, 16:00   Bulk rise at room temperature     2h
Tue 21 Jul, 18:00   Bulk rise in the fridge           36h
Thu 23 Jul, 06:00   Temper (bring to room temp)       2h
Thu 23 Jul, 08:00   Ball & final rise at room temp    8h
Thu 23 Jul, 16:00   Bake
```

## Project layout

```
index.html          The page
styles.css          Styling (mobile-first)
src/methods.js      Dough data: fermentation + poolish step durations
src/schedule.js     Pure backwards-scheduling logic (no DOM)
src/app.js          Form wiring + rendering
test/schedule.test.js  Unit tests (node:test)
CONTEXT.md          Domain glossary
docs/adr/           Architecture decision records
```

There is **no build step** — the browser runs the ES modules directly.

## Run locally

The app uses ES modules, so it must be served over HTTP (opening `index.html` from the
file system will not load the modules). Start any static server from the repo root:

```bash
npm run serve          # python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>.

## Test

```bash
npm test               # node --test
```

No dependencies to install — the tests use Node's built-in `node:test` runner.

## Publish to GitHub

This repo is local-only. To put it on GitHub and host the app for free on GitHub Pages:

### 1. Create the remote and push

```bash
# from the repo root
git add -A
git commit -m "Pizzapp: dough scheduler"

# create the repo on GitHub and push (requires the gh CLI, logged in)
gh repo create pizzapp --public --source=. --remote=origin --push
```

Or, without the `gh` CLI, create an empty repo on github.com first, then:

```bash
git remote add origin https://github.com/<your-username>/pizzapp.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

Because everything is static and lives at the repo root, Pages can serve it directly:

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Set **Branch** to `main` and folder to **`/ (root)`**, then **Save**.

Or from the CLI:

```bash
gh api -X POST repos/<your-username>/pizzapp/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

After a minute your app is live at:

```
https://<your-username>.github.io/pizzapp/
```

Every push to `main` redeploys automatically.

> Tip: there are no underscore-prefixed folders, so no `.nojekyll` file is needed.
