'use strict';
/* =====================================================================
   WINTER ARC · challenge settings (edit these)
   ===================================================================== */
const CONFIG = {
  name: 'Winter Arc',
  seasonStart: '2026-11-02',   // the Monday week 1 starts (local time)
  seasonWeeks: 17,             // Mon–Sun weeks; 17 weeks ends Sun Feb 28, 2027 at 11:59 PM
  weeklyMin: 7,                // points everyone needs every week
  strikesOut: 2,               // strikes that eliminate you
};

/* Point system. Colors match the celebration videos. */
const CATS = {
  gym:     { label: 'Gym',                   pts: 1.5, color: '#F2853A', dark: '#B4521C' },
  run:     { label: 'Run',                   pts: 1.5, color: '#5C7CF0', dark: '#3550B8' },
  mma:     { label: 'MMA',                   pts: 1.5, color: '#D9434A', dark: '#962830' },
  jickle:  { label: 'Jickle',                pts: 0.5, color: '#45B87A', dark: '#2A7D52' },
  volo:    { label: 'Volo',                  pts: 0.5, color: '#F5B23E', dark: '#B87A1A' },
  soccer:  { label: 'Soccer',                pts: 0.5, color: '#2FA36B', dark: '#1D6E48' },
  date:    { label: 'Date',                  pts: 4,   color: '#EE5982', dark: '#A83560' },
  beers:   { label: 'Beers with the fellas', short: 'Beers', pts: 1, color: '#E39A2E', dark: '#A8661A' },
  reading: { label: 'Reading',               pts: 1,   color: '#7254DC', dark: '#4F35B0' },
};
const CAT_ORDER = ['gym', 'run', 'mma', 'jickle', 'volo', 'soccer', 'date', 'beers', 'reading'];

/* Celebration videos per activity: assets/celebrations/<id>.mp4 (+ <id>.webp poster).
   One is picked at random per log (never the same one twice in a row). */
const CELEBRATIONS = {
  gym: [
    { id: 'gym-1', name: 'Beast Mode' }, { id: 'gym-2', name: 'Gun Show' }, { id: 'gym-3', name: 'Leg Day' },
    { id: 'gym-4', name: 'Atlas Mode' }, { id: 'gym-5', name: 'Mirror Check' },
  ],
  run: [
    { id: 'run-1', name: 'Speed Demon' }, { id: 'run-2', name: 'Frost Miles' }, { id: 'run-3', name: 'Torch Bearer' },
    { id: 'run-4', name: 'Night Owl' }, { id: 'run-5', name: 'Goose Chase' },
  ],
  mma: [{ id: 'mma-1', name: 'Knockout' }],
  jickle: [{ id: 'jickle-1', name: 'Jickle King' }],
  volo: [{ id: 'volo-1', name: 'Sky Spike' }],
  soccer: [{ id: 'soccer-1', name: 'Golazo!' }],
  date: [{ id: 'date-1', name: 'Date Night' }],
  beers: [{ id: 'beers-1', name: 'Cheers Fellas' }],
  reading: [{ id: 'reading-1', name: 'Big Brain' }],
};

/* The group. Accounts are made ahead of time; there is no public sign-up.
   Usernames are what people type to sign in (lowercase). The hosted version
   keeps the real roster in the database: this list seeds it and the preview. */
const ROSTER = [
  { username: 'osim', name: 'Osim', color: '#7254DC', role: 'commissioner' },
  { username: 'amaan', name: 'Amaan', color: '#F2853A' },
  { username: 'ayaad', name: 'Ayaad', color: '#2FA36B' },
  { username: 'connor', name: 'Connor', color: '#2F66E6' },
  { username: 'dean', name: 'Dean', color: '#EE5982' },
  { username: 'dylan', name: 'Dylan', color: '#1FA3A0' },
  { username: 'gaurav', name: 'Gaurav', color: '#B45AC8' },
  { username: 'jake', name: 'Jake', color: '#E39A2E' },
  { username: 'philip', name: 'Philip', color: '#D9644F' },
];

/* Inside jokes. Each fires once (per key) and its video pops up once for each
   person. Names are matched by username, so renaming someone doesn't break it.
   feed: also post a card to the feed. playFor: hours the pop-up stays fresh;
   after that it's quietly marked seen. day/from/to: only in that window
   (day 0 = Sunday … 6 = Saturday, hours in the group's time zone).
   "This week" means points in the current Monday–Sunday week. The exact rules
   are in Logic.jokes (js/logic.js). */
const INSIDE_JOKES = {
  coin: { video: 'joke-coin', title: 'The Coin', users: ['dean', 'jake'], feed: true, playFor: 72 },        // Dean & Jake tied on points this week
  bluehair: { video: 'joke-bluehair', title: 'Blue Hair', users: ['connor'], feed: true, playFor: 72 },  // Connor has the most points this week
  iron: { video: 'joke-iron', title: 'The Iron', users: ['ayaad'], feed: true, playFor: 12, day: 6, from: 6, to: 12 },   // Saturday 6 AM–noon, Ayaad in last
  bag: { video: 'joke-bag', title: 'The Bag', users: ['dean', 'connor', 'dylan'], feed: true, playFor: 72 },  // Dean, Connor & Dylan all tied this week (above 0)
  fight: { video: 'joke-fight', title: 'Dylan Starts Fights', users: ['dylan'], feed: true, playFor: 72 },   // Dylan tied for 1st this week
  crashout: { video: 'joke-crashout', title: 'Crash Out KNR', users: ['connor'], feed: true, playFor: 48 },   // Connor calls cap (🧢) on someone's post this week
  satellite: { video: 'joke-satellite', title: 'Satellite House', users: ['connor'], feed: true, playFor: 48 }, // Connor logs beers with the boys
  puke: { video: 'joke-puke', title: 'Puked On', users: ['amaan'], feed: true, playFor: 48 },              // Amaan alone in last this week (again each time he drops back there)
  mma: { video: 'joke-mma', title: 'MMA Guy', users: ['amaan'], feed: true, playFor: 72, count: 4 },        // Amaan logs his 4th MMA session of the week
  radiator: { video: 'joke-radiator', title: 'The Radiator', users: ['jake'], feed: true, playFor: 48, days: 4 }, // Jake hasn't logged anything in 4 days
  mom: { video: 'joke-mom', title: 'Jake’s Mom', users: ['jake'], feed: true, playFor: 6, day: 0, from: 18, to: 24 }, // Sunday from 6 PM, Jake still short of the minimum
  nets: { video: 'joke-nets', title: 'The Nets Game', users: ['jake', 'gaurav'], feed: true, playFor: 72 },  // Jake or Gaurav missed the minimum last week
  liquor: { video: 'joke-liquor', title: 'The Liquor Run', users: ['gaurav'], feed: true, playFor: 12, day: 6, from: 6, to: 12 }, // Saturday 6 AM–noon, Gaurav in last
  phil: { video: 'joke-phil', title: 'Punxsutawney Phil', users: ['philip'], feed: true, playFor: 48, days: 3 }, // Philip logs after 3+ days without logging
  scared: { video: 'joke-scared', title: 'Scared of Girls', users: [], feed: true, playFor: 72, days: 30 },  // nobody has logged a date in 30 days
  timesheet: { video: 'joke-timesheet', title: 'The Time Sheet', users: ['jake'], feed: true, playFor: 48, days: [6, 0] }, // Jake's post that gets him to the weekly minimum lands on a Saturday or Sunday
};
/* Name swaps: while Dylan has exactly 4 points this week, the app calls him La4. */
const ALIASES = [{ username: 'dylan', name: 'La4', pts: 4 }];
/* Osim's own stamp every week he reaches the minimum: it slams onto his screen,
   sits on his ring card, and a card goes to the feed for everyone. */
const HOAT = { username: 'osim', text: 'HOAT GUARANTEE', title: 'Hoat Guarantee', feed: true };

const REACTIONS = ['\u{1F525}', '\u{1F4AA}', '\u{1F44F}', '\u{1F602}', '\u{1F9E2}'];   // fire, flex, clap, laugh, cap
const CAP = '\u{1F9E2}';
const CAP_DISPUTE = 3;         // this many caps marks a post "disputed"

function fmtPts(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
const U = {
  clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  rng(seed) { let s = ((seed + 1) * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; },
};
