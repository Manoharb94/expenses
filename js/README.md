# Gharwise web app: how the code is organised

`app.html` holds only the page shell, styles and a list of `<script>` tags. The code lives in `js/`, one file per area.
The files are plain scripts that share one global scope and load **in this order** (order matters):

| File | What is in it |
|---|---|
| core | settings, constants, state `S`, helpers, offline saving |
| auth | sign up, login, mobile verification, family join |
| gmail | connect Gmail (personal script) |
| statements | statement and any-file import |
| data | loading data, periods and totals |
| charts | charts and ideas |
| budget | budgets and fixed expenses |
| forecast | forecast |
| blocks | Home cards, lending, income, insights |
| reports-plan | Analytics, Budget plan, Goals |
| ui | toast, top bar, rows, small charts |
| home | Home, Transactions, Budget screens |
| menu | Menu, Settings, About |
| family | Family Sync |
| tracking | Automated tracking (SMS, email) |
| account | change password, delete account |
| render | the render switch |
| starter | Starter plan |
| scan-bill | Scan Bill (on-device reading) |
| edit | swipe to delete, long-press, categories |
| loans | loans |
| tour | app tour, errors, refresh |
| groups-core | groups: data and helpers |
| profile | profile and photo crop |
| groups-ui | groups: screens, split, settle up |
| bind | event bindings for every screen |
| main | start-up and service worker |

## After changing any file in `js/`

    python3 tools/build.py

This gives each script tag a fingerprint (so changed files are always fetched fresh) and lists the files in `sw.js`
for offline use. Then commit `app.html`, `sw.js` and the changed files together. Change the web version number
(`WEBVER` in `menu.js`) on each release.

New feature = new file: add its `<script src="js/yourfile.js"></script>` line before `main.js`, then run the build.
