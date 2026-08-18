# The Armoury

**Live: https://sjgant80-hub.github.io/didy-raid/**

A room in [fallworld](https://sjgant80-hub.github.io/fallworld/). You say where you are going;
your didy kits *itself* out of the estate. You do not pick the tools.

- **organs** go into slots — the real estate: witness, proof-of-play, the index, the library
- **runes** go into their sockets — adversarial, exhaustive, by-meaning, sovereign, append-only
- **vials** are drunk from their own purse, only if the job earns one

Everything equipped carries **why**, in a sentence you can argue with. And the sheet always shows
the other half — what this kit **cannot** do, which a character sheet never tells you.

## The bar that levels up is sovereignty

Day one you rent every piece of thinking from somebody else's frontier model on somebody else's
electric. What you build over months is not a bigger kit — it is a **rig**: your own models, good
enough to take work back off the rented one.

| rig | | holds |
|---|---|---|
| 0 | **Renting** | no model of your own; every piece of thinking is rented |
| 1 | **Own Forge** | a small local model: the grunt work comes home |
| 2 | **Sovereign** | a large model of your own; nothing has to leave unless you send it |

The headline number is the share of *this job* that runs on your own electric, weighted by what it
costs — a claim you can check against your own bill. It rises when you **build** something. Never
when you spend.

An empty kit reads `no claim`, not `100%`. A badge that cannot fail is not a badge.

## Party

Paste an ally's code and what they built comes with them. **What pools is the rig, not the slots** —
if your ally owns the big local model, the party runs your rented work on *their* machine, and
everyone's rented share falls. That is a real reason to find somebody who built what you did not.

The party sheet is computed, never assumed: which roles nobody covered, who hosts what, and where
two of you wasted a slot bringing the same organ.

## Proof

| check | verdict |
|---|---|
| tests | 112 |
| witness mutation gate | **1.00 — 0 survivors, 0 exemptions** |
| fuzz | the five readers never throw, on any input |
| page | generated from `raid.mjs`; CI fails if the page and the kernel disagree |

```bash
node --test
node build-page.mjs
```

`raid.mjs` is pure: no I/O, no clock, no randomness. The same job against the same catalogue kits
the same build every time, so a spec can be replayed, diffed, and argued with.
