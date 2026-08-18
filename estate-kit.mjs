// estate-kit.mjs — the estate's real organs, as loot.
//
// Every entry is a thing that exists and runs. Nothing aspirational: a catalogue with gear nobody
// built is a character sheet promising abilities the character does not have, and the didy would
// spec itself for a raid it cannot survive.
import { gear, gem, potion, INTENT } from './raid.mjs';

// ⚑ MIND IS DECLARED HONESTLY OR THE WHOLE SOVEREIGNTY READ IS A LIE. Most of this estate is
// deterministic code — a mutation gate, an index, a rubric — and deterministic code is mind 0: it
// runs on your machine forever and no model is involved. The pieces that genuinely need a model say
// so. Marking something 0 to make the headline look better is the one edit that breaks this file.
export const GEAR = [
  gear({ id: 'witness', name: 'Witness', intents: [INTENT.prove, INTENT.judge], cost: 2, sockets: 2, mind: 0,
    keys: ['witness','gate','gated','mutation','mutant','ungated'],
    does: 'breaks the code one operator at a time to find tests that only look like they check something' }),
  gear({ id: 'proof-of-play', name: 'Proof-of-Play', intents: [INTENT.prove, INTENT.judge], cost: 1, sockets: 1, mind: 0,
    keys: ['proof','receipt','reproducible','replay'],
    does: 'refuses to list anything without a receipt anybody can re-run' }),
  gear({ id: 'acg-assessor', name: 'The Assessor', intents: [INTENT.judge], cost: 1, sockets: 1, mind: 0,
    keys: ['assessor','rubric','grade','mark'],
    does: 'marks work against the same rubric every time, and passes its own rubric' }),
  gear({ id: 'fall-remember', name: 'The Library', intents: [INTENT.remember, INTENT.find], cost: 1, sockets: 2, mind: 1,
    keys: ['remember','memory','recall','fall-remember'],
    does: 'stores what was said so it can be found later by meaning rather than by keyword' }),
  gear({ id: 'offramp', name: 'The Off-Ramp', intents: [INTENT.remember], cost: 1, sockets: 1,
    needs: ['fall-remember'], mind: 1,
    keys: ['offramp','off-ramp','export','transcript','chat'],
    does: 'turns a dead chat export into live memory — and needs somewhere to put it' }),
  gear({ id: 'estate-index', name: 'The Index', intents: [INTENT.find, INTENT.explain], cost: 1, sockets: 1, mind: 0,
    keys: ['estate','index','repos','repositories','inventory'],
    does: 'knows all 1,628 repositories, so a sweep covers the estate instead of a sample' }),
  gear({ id: 'shadow-surface', name: 'The Shadow', intents: [INTENT.judge, INTENT.explain], cost: 1, sockets: 1, mind: 0,
    keys: ['shadow','cannot','refuse','refusal','blind'],
    does: 'computes exactly what an agent cannot reach, as the complement of what it can' }),
  gear({ id: 'sovereign-browser', name: 'The Watchtower', intents: [INTENT.watch], cost: 2, sockets: 2, mind: 1,
    keys: ['browser','page','pages','click','render','live'],
    does: 'drives a real browser and judges what it OBSERVED, never what it was told' }),
  gear({ id: 'sididy-govern', name: 'The Governor', intents: [INTENT.build, INTENT.move], cost: 1, sockets: 1, mind: 0,
    keys: ['budget','ceiling','spend','govern','cost','limit'],
    does: 'holds a hard ceiling on what a run may spend, so a loop cannot burn an unbounded bill' }),
  gear({ id: 'possibility-engine', name: 'The Oracle', intents: [INTENT.build, INTENT.explain], cost: 1, sockets: 2, mind: 0,
    keys: ['possibility','options','branch','maybe','oracle'],
    does: 'holds options open, weighted, and collapses one only when its condition genuinely fires' }),
  gear({ id: 'kcc-mint', name: 'The Mint', intents: [INTENT.move, INTENT.prove], cost: 1, sockets: 1, mind: 0,
    keys: ['mint','badge','stamp','provenance','kcc'],
    does: 'stamps a build with where it came from, and every badge has to be earned by a real check' }),
  gear({ id: 'local-model', name: 'The Forge', intents: [INTENT.build, INTENT.explain, INTENT.find], cost: 1, sockets: 2, mind: 1,
    keys: ['local','sovereign','ollama','offline','electric'],
    does: 'runs the work on your own electric instead of rented compute' }),
];

export const GEMS = [
  gem({ id: 'adversarial', name: 'Adversarial', fits: ['witness', 'acg-assessor', 'shadow-surface'], cost: 1,
    does: 'tries to refute its own finding before reporting it' }),
  gem({ id: 'exhaustive', name: 'Exhaustive', fits: ['estate-index', 'witness'], cost: 1,
    does: 'covers every entry rather than a sample — no silent truncation' }),
  gem({ id: 'by-meaning', name: 'By Meaning', fits: ['fall-remember'], cost: 1,
    does: 'retrieves on what a thing means, not on which words it happens to contain' }),
  gem({ id: 'sovereign', name: 'Sovereign', fits: ['local-model'], cost: 0,
    does: 'keeps the work on your machine; nothing leaves unless you say so' }),
  gem({ id: 'append-only', name: 'Append-Only', fits: ['possibility-engine', 'fall-remember'], cost: 0,
    does: 'never edits history — a change is a new entry, so what happened stays visible' }),
];

export const POTIONS = [
  potion({ id: 'frontier', name: 'Frontier Draught', cost: 2, grants: [INTENT.judge, INTENT.build],
    does: 'one escalation to the big model for the reasoning a local one genuinely cannot do' }),
  potion({ id: 'deep-sweep', name: 'Deep Sweep', cost: 1, grants: [INTENT.find],
    does: 'widens a search past the first plausible answer — a measure that cannot fail is not a measure' }),
  potion({ id: 'second-pair', name: 'Second Pair of Eyes', cost: 1, grants: [INTENT.judge],
    does: 'a separate pass that tries to refute the first one instead of agreeing with it' }),
];

export const CATALOGUE = { gear: GEAR, gems: GEMS, potions: POTIONS };
export default CATALOGUE;
