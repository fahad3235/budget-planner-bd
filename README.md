# Budget Planner BD — বাজেট প্ল্যানার বিডি

A free, fully offline monthly budget planner and savings-goal tracker for Bangladesh. Plan the month *before* it happens — unlike expense trackers that only look backward.

## The problem

Most budgeting tools record what you already spent. Budget Planner BD is forward-looking: set a monthly income, allocate it across categories (with a one-click 50/30/20 template), track actual spending against the plan during the month, and work toward named savings goals with auto-computed monthly targets.

## Features

- Monthly income (BDT) with a month selector
- Category budgets: one-click **50/30/20 template** (Needs / Wants / Savings) plus fully custom categories
- Planned-vs-actual tracking per category with progress bars and **overspend warnings**
- Over-budget guard: warns when planned total exceeds income
- **Savings goals**: name + target + deadline → required monthly saving auto-computed; contribution logging; progress bars; overdue handling
- **Month rollover**: archive a month, start a new one (budgets and goals carry over, actuals reset); archived-month history with savings rate
- localStorage persistence, JSON export/import, realistic sample data
- Full **EN/বাংলা UI toggle** (Bengali digits in BN mode), responsive mobile + desktop, empty states, inline validation

## Tech stack

Vanilla HTML / CSS / JavaScript. No build step, no frameworks, no backend, zero network requests. All budget math lives in one pure, commented module (`js/budget.js`).

## Prerequisites

Any modern browser. For local development, any static file server (Python 3 recommended).

## Install

No install needed — open `index.html`, or serve the folder:

```bash
cd budget-planner-bd
python3 -m http.server 8123
# open http://localhost:8123/
```

## Dev commands

None — there is no build, no package manager, no test runner config. Tests are a standalone Node script (see below).

## Environment variables

None. The app is fully offline and uses no APIs, keys, or secrets.

## Testing

Real headless-Chromium tests via `playwright-core` + the cached headless shell (kept outside the repo):

```bash
# from the build dir, in one terminal:
python3 -m http.server 8123
# in another (adjust paths to your playwright-core + headless shell):
node /tmp/bp-test/test.js
```

**25/25 checks pass, 0 console/page errors**, covering: 50/30/20 template math (৳60,000 → 30k/18k/12k), actual-spend logging with exact remaining, overspend flagging, custom categories + duplicate rejection, savings-goal monthly requirement (৳50,000 over 10 months → ৳5,000/mo), contributions, invalid-input rejection (empty names, past deadlines), reload persistence, month rollover (actuals reset, budgets/goals kept, history archived), export download, import round-trip, BN/EN toggle with Bengali digits, and 390px mobile overflow.

A `?asof=YYYY-MM-DD` query parameter freezes "today" for deterministic deadline tests.

## Deployment

GitHub Pages compatible: push the folder contents to the `main` branch root of a public repo and enable Pages (Deploy from a branch → `main` / `/ (root)`).

## Limitations

- Data is per-browser `localStorage` (no sync; JSON export is the backup path)
- Savings-goal monthly requirement uses whole calendar months — a documented convention, not financial advice
- Clearing browser site data deletes everything
- No reminders/notifications; no multi-currency (BDT only)

## Status

Complete and verified. Built 2026-10-11 as MUSE PROJECT FACTORY Ω run #14.
