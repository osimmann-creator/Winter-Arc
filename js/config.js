'use strict';
/* =====================================================================
   WINTER ARC · challenge settings (edit these)
   ===================================================================== */
const CONFIG = {
  name: 'Winter Arc',
  seasonStart: '2026-11-23',   // the Monday week 1 starts in the group timezone
  seasonWeeks: 17,             // Mon–Sun weeks; 17 weeks ends Sun Mar 21, 2027 at 11:59 PM
  weeklyMin: 7,                // points everyone needs every week
  strikesOut: 2,               // strikes that eliminate you
  timezone: 'America/New_York',
  insideJokesStart: '2026-11-23',
};

/* Point system. Colors match the celebration videos. */
const CATS = {
  gym:     { label: 'Gym',                   pts: 1.5, color: '#F2853A', dark: '#B4521C' },
  run:     { label: 'Run',                   pts: 1.5, color: '#5C7CF0', dark: '#3550B8' },
  bike:    { label: 'Bike Ride',             pts: 1.5, color: '#24A6AF', dark: '#16616B', minMiles: 8 },
  mma:     { label: 'MMA',                   pts: 1.5, color: '#D9434A', dark: '#962830' },
  jickle:  { label: 'Jickle',                pts: 0.5, color: '#45B87A', dark: '#2A7D52' },
  volo:    { label: 'Volo',                  pts: 0.5, color: '#F5B23E', dark: '#B87A1A' },
  soccer:  { label: 'Soccer',                pts: 0.5, color: '#2FA36B', dark: '#1D6E48' },
  date:    { label: 'Date',                  pts: 4,   color: '#EE5982', dark: '#A83560' },
  beers:   { label: 'Beers with the fellas', short: 'Beers', pts: 1, color: '#E39A2E', dark: '#A8661A', oncePerWeek: true },
  reading: { label: 'Reading',               pts: 1,   color: '#7254DC', dark: '#4F35B0', oncePerWeek: true },
};
const CAT_ORDER = ['gym', 'run', 'bike', 'mma', 'jickle', 'volo', 'soccer', 'date', 'beers', 'reading'];

/* Celebration videos per activity: assets/celebrations/<id>.mp4 (+ <id>.webp poster).
   One is picked at random per log (never the same one twice in a row).
   users: only plays when one of those usernames logs it (the gallery still shows it). */
const CELEBRATIONS = {
  gym: [
    { id: 'gym-1', name: 'Beast Mode' }, { id: 'gym-2', name: 'Gun Show' }, { id: 'gym-3', name: 'Leg Day' },
    { id: 'gym-4', name: 'Atlas Mode' }, { id: 'gym-5', name: 'Mirror Check' },
    { id: 'gym-6', name: 'Raise the Bar' }, { id: 'gym-7', name: 'Box Jump' }, { id: 'gym-8', name: 'Rope Storm' },
    { id: 'gym-9', name: 'Gains Shake' }, { id: 'gym-10', name: 'Hammer Time' },
  ],
  run: [
    { id: 'run-1', name: 'Speed Demon' }, { id: 'run-2', name: 'Frost Miles' }, { id: 'run-3', name: 'Torch Bearer' },
    { id: 'run-4', name: 'Night Owl' }, { id: 'run-5', name: 'Goose Chase' },
    { id: 'run-6', name: 'Rush Hour' }, { id: 'run-7', name: 'Green Light' }, { id: 'run-8', name: 'Pigeon Panic' },
    { id: 'run-9', name: 'Sunrise Miles' }, { id: 'run-10', name: 'Coffee Run' },
  ],
  bike: [
    { id: 'bike-1', name: 'King of the Mountain' }, { id: 'bike-2', name: 'Send It' }, { id: 'bike-3', name: 'Sprint Finish' },
  ],
  mma: [
    { id: 'mma-1', name: 'Knockout' },
    { id: 'mma-2', name: 'Main Event', users: ['amaan'] }, { id: 'mma-3', name: 'Flying Knee', users: ['amaan'] },
    { id: 'mma-4', name: 'The Champ', users: ['amaan'] },
  ],
  jickle: [
    { id: 'jickle-1', name: 'Jickle King' }, { id: 'jickle-2', name: "Chef's Kiss" }, { id: 'jickle-3', name: 'The Erne' },
    { id: 'jickle-4', name: 'Jickled!' }, { id: 'jickle-5', name: 'Quick Hands' },
  ],
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
  { username: 'phil', name: 'Phil', color: '#D9644F' },
];

const ALIASES = { dylan: { points: 4, name: 'La4' } };

/* Inside jokes. Each fires once (per key) and its video pops up once for each
   person. Names are matched by username, so renaming someone doesn't break it.
   feed: also post a card to the feed. playFor: hours the pop-up stays fresh;
   after that it's quietly marked seen. */
const INSIDE_JOKES = {
  coin: { video: 'joke-coin', title: 'The Coin', users: ['dean', 'jake'], feed: true, playFor: 72 },
  bluehair: { video: 'joke-bluehair', title: 'Blue Hair', users: ['connor'], feed: true, playFor: 72 },
  iron: { video: 'joke-iron', title: 'The Iron', users: ['ayaad'], feed: true, playFor: 12, days: [0] },
  bag: { video: 'joke-bag', title: 'The Bag', users: ['dean', 'connor', 'dylan'], feed: true, playFor: 72 },
  fight: { video: 'joke-fight', title: 'Dylan Starts Fights', users: ['dylan'], feed: true, playFor: 72 },
  crashout: { video: 'joke-crashout', title: 'Crash Out KNR', users: ['connor'], feed: true, playFor: 48 },
  satellite: { video: 'joke-satellite', title: 'Satellite House', users: ['connor'], feed: true, playFor: 48 }, // Connor logs beers with the boys
  puke: { video: 'joke-puke', title: 'Puked On', users: ['amaan'], feed: true, playFor: 48 },
  mma: { video: 'joke-mma', title: 'MMA Guy', users: ['amaan'], feed: true, playFor: 72, count: 4 },
  radiator: { video: 'joke-radiator', title: 'The Radiator', users: ['jake'], feed: true, playFor: 48, days: 4 }, // Jake hasn't logged anything in 4 days
  mom: { video: 'joke-mom', title: 'Jake’s Mom', users: ['jake'], feed: true, playFor: 12, day: 0, from: 12, to: 24 },
  nets: { video: 'joke-nets', title: 'The Nets Game', users: ['jake', 'gaurav'], feed: true, playFor: 72 },
  liquor: { video: 'joke-liquor', title: 'The Liquor Run', users: ['gaurav'], feed: true, playFor: 12, days: [0] },
  phil: { video: 'joke-phil', title: 'Punxsutawney Phil', users: ['phil'], feed: true, playFor: 48, days: 3 }, // Philip logs after 3+ days without logging
  scared: { video: 'joke-scared', title: 'Scared of Girls', users: [], feed: true, playFor: 72, days: 30 },
  timesheet: { video: 'joke-timesheet', title: 'The Time Sheet', users: ['jake'], feed: true, playFor: 48, days: [6, 0] }, // Jake's post that gets him to the weekly minimum lands on a Saturday or Sunday
  /* Round 2 (animations/hyperframes). Osim's Sundays: The Crossing at 6 PM, then Final Call if he makes it or #worthit on Monday if he just misses. */
  crossing: { video: 'joke-crossing', title: 'The Crossing', users: ['osim'], feed: true, playFor: 6, day: 0, from: 18 }, // still in and short of his goal at 6 PM Sunday
  mycar: { video: 'joke-mycar', title: 'My Car, My Rules', users: [], feed: true, playFor: 24 },          // a Sunday post ties or passes whoever was alone in first
  finalcall: { video: 'joke-finalcall', title: 'Final Call', users: ['osim'], feed: true, playFor: 12, days: [0] }, // the post that gets Osim to his goal is dated Sunday
  worthit: { video: 'joke-worthit', title: '#worthit', users: ['osim'], feed: true, playFor: 24, short: 1.5 },  // Monday, and he missed last week's goal by 1.5 or less
  basement: { video: 'joke-basement', title: 'Operation Basement', users: ['dean'], feed: true, playFor: 24, from: 22, to: 4 }, // Dean logs something timed 10 PM-3:59 AM
  nomap: { video: 'joke-nomap', title: 'No Map', users: ['dylan', 'connor'], feed: true, playFor: 48, hours: 72 }, // both still in and both 72+ hours without a log
  /* GTA: anyone, so no names in the videos; the feed card says who. */
  grandtheft: { video: 'joke-grandtheft', title: 'Grand Theft #1', users: [], feed: true, playFor: 24, days: [5, 6] }, // a Fri/Sat post steals first place
  wanted: { video: 'joke-wanted', title: 'Wanted', users: [], feed: true, playFor: 48 },          // a post gets its CAP_DISPUTE-th cap
  busted: { video: 'joke-busted', title: 'Busted', users: [], feed: true, playFor: 48 },          // a post is voided
  wasted: { video: 'joke-wasted', title: 'Wasted', users: [], feed: true, playFor: 72 },          // someone takes his last strike
  parole: { video: 'joke-parole', title: 'Out on Parole', users: [], feed: true, playFor: 48 },   // an eliminated member logs again
  partners: { video: 'joke-partners', title: 'Partners in Crime', users: [], feed: true, playFor: 48 }, // same activity, same day, each other's witness
  /* Holidays play for everyone on the day, in the group timezone. */
  thanksgiving: { video: 'joke-thanksgiving', title: 'Thanksgiving', users: [], feed: true, playFor: 24 }, // 4th Thursday of November; names the week's lowest scorer
  xmas: { video: 'joke-xmas', title: 'Naughty or Nice', users: [], feed: true, playFor: 72 },     // recorded by the server on Dec 25 with the vote results (XMAS below)
  nye: { video: 'joke-nye', title: 'New Year’s Eve', users: [], feed: true, playFor: 24 },        // Dec 31
  groundhog: { video: 'joke-groundhog', title: 'Groundhog Day', users: [], feed: true, playFor: 24, host: 'phil' }, // Feb 2; Phil has spoken
  valentine: { video: 'joke-valentine', title: 'Valentine’s Day', users: [], feed: true, playFor: 24 }, // Feb 14; names everyone still short
  /* Round 3 (animations/hyperframes, NEW-ANIMATIONS-3). */
  signal: { video: 'joke-signal', title: 'Signal Lost', users: ['connor'], feed: true, playFor: 48, hours: 72 }, // still in, 72+ hours without a log (No Map instead if Dylan has gone quiet too)
  besties: { video: 'joke-besties', title: '3 AM Besties', users: ['connor'], feed: true, playFor: 24, from: 22, to: 5 }, // Connor logs something timed 10 PM-4:59 AM
  lockedout: { video: 'joke-lockedout', title: 'Locked Out', users: ['connor'], feed: true, playFor: 48 }, // everyone still in has reached his goal except Connor
  volcano: { video: 'joke-volcano', title: 'The Volcano', users: ['dean', 'dylan'], feed: true, playFor: 72 }, // tied for the week, above 0
  bestof40: { video: 'joke-bestof40', title: 'Best of 40', users: ['dean', 'jake'], feed: true, playFor: 72, ties: 3 }, // the third week they tie: plays instead of The Coin
  la4: { video: 'joke-retire', title: 'Retire the Number', users: ['dylan'], feed: true, playFor: 72, points: 4, weeks: 3 }, // the third week he hits exactly 4 (La4); once a season
  diet: { video: 'joke-diet', title: 'Balanced Diet', users: ['jake'], feed: true, playFor: 24 }, // Jake logs Beers with the fellas
  pullout: { video: 'joke-pullout', title: 'The Pull-Out', users: ['jake'], feed: true, playFor: 12, hour: 6 }, // the morning after a Jake beers post, from 6 AM
  jailbreak: { video: 'joke-jailbreak', title: 'Jailbreak', users: ['jake'], feed: true, playFor: 48 }, // his first post after The Radiator's four days
  fridge: { video: 'joke-fridge', title: 'Mom’s Fridge', users: ['jake'], feed: true, playFor: 48, days: [1, 2, 3, 4, 5] }, // the post that gets Jake to his goal is dated Mon-Fri
  cleared: { video: 'joke-cleared', title: 'Cleared to Play', users: ['phil'], feed: true, playFor: 48 }, // the commissioner marks Phil recovered
  spring: { video: 'joke-spring', title: 'Early Spring', users: ['phil'], feed: true, playFor: 48, days: 3 }, // Phil logs on three days in a row
  warhero: { video: 'joke-warhero', title: 'War Hero', users: [], feed: true, playFor: 72 }, // the first date after a Scared of Girls drought
};

/* Christmas: Naughty or Nice. Everyone votes on everyone else on Dec 24 (group timezone); the results come out
   on Dec 25 as the xmas event, revealed in the app with a stamp on each face. The rules below are the defaults. */
const XMAS = {
  vote: [12, 24],          // [month, day] voting is open all day
  reveal: [12, 25],        // [month, day] results from 12:00 AM
  ties: 'naughty',         // a tied (or empty) count goes this way
  nonVoters: 'naughty',    // anyone who doesn't vote at all goes straight on this list
  anonymous: true,         // the reveal shows totals, never who voted what (the server never sends voter names)
};
/* Osim's own stamp every week he reaches the minimum: it slams onto his screen,
   sits on his ring card, and a card goes to the feed for everyone. */
const HOAT = { username: 'osim', text: 'HOAT GUARANTEE', title: 'Hoat Guarantee', feed: true };
/* Everyone with his own character (animations/src/hero/looks.ts; sheets in animations/characters). His Home screen
   shows him instead of Flexander, from assets/mascot/<username>/<pose>.webp. Anyone not listed gets Flexander. */
const CHARACTERS = ['osim', 'phil', 'dylan', 'connor', 'gaurav', 'dean', 'amaan', 'jake', 'ayaad'];

const REACTIONS = ['\u{1F525}', '\u{1F4AA}', '\u{1F44F}', '\u{1F602}', '\u{1F9E2}'];   // fire, flex, clap, laugh, cap
const CAP = '\u{1F9E2}';
const CAP_DISPUTE = 3;         // this many caps marks a post "disputed"

function fmtPts(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
const U = {
  clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  rng(seed) { let s = ((seed + 1) * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; },
};
