// The catalogue is data, not logic — so the gate that matters is integrity, not mutation.
// A `needs` or `fits` pointing at an id nobody declared makes that tool permanently unequippable,
// and nothing anywhere would say so: it just never appears in a loadout and never appears as a
// refusal either. This is the failure mode a pure-data file actually has.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTENT, spec } from './raid.mjs';
import CATALOGUE, { GEAR, GEMS, POTIONS } from './estate-kit.mjs';

const ids = new Set(GEAR.map(g => g.id));

test('every organ in the kit has a unique id', () => {
  assert.equal(ids.size, GEAR.length, 'two organs share an id, so one of them can never be equipped');
});

test('EVERY PREREQUISITE NAMES AN ORGAN THAT IS ACTUALLY IN THE KIT', () => {
  for (const g of GEAR) {
    for (const n of g.needs) {
      assert.ok(ids.has(n), `${g.id} needs "${n}", which is in no catalogue — it can never be equipped`);
    }
  }
});

test('every gem fits at least one organ that exists', () => {
  for (const j of GEMS) {
    assert.ok(j.fits.length > 0, `${j.id} fits nothing, so it can never be socketed`);
    assert.ok(j.fits.some(f => ids.has(f)), `${j.id} only fits organs that are not here: ${j.fits.join(', ')}`);
  }
});

test('a gem never asks for a socket its host does not have', () => {
  for (const j of GEMS) {
    const hosts = GEAR.filter(g => j.fits.includes(g.id));
    assert.ok(hosts.some(h => h.sockets > 0), `${j.id} fits only organs with no sockets: ${j.fits.join(', ')}`);
  }
});

test('every potion grants something the reader can actually name', () => {
  const known = new Set(Object.values(INTENT));
  for (const p of POTIONS) {
    assert.ok(p.grants.length > 0, `${p.id} grants nothing`);
    for (const gr of p.grants) assert.ok(known.has(gr), `${p.id} grants "${gr}", which is not an intent`);
  }
});

test('every organ says what it does, in a sentence somebody could disagree with', () => {
  for (const g of GEAR) {
    assert.ok(g.does.length >= 20, `${g.id} describes itself in ${g.does.length} chars: "${g.does}" — a shrug, not a description`);
    assert.ok(g.intents.length > 0, `${g.id} is for nothing, so no job will ever reach it`);
  }
});

test('every organ is reachable — some job in the estate equips it', () => {
  // ⚑ An organ nobody can ever reach is dead weight that reads as capability. Drive the real
  // vocabulary at the real catalogue and check every single one comes back at least once.
  const jobs = [
    'audit the whole estate and find which repos have no gate',
    'prove this kernel is clean with a mutation gate and judge the tests',
    'remember this session and recall it later by meaning',
    'export the chat transcript into memory',
    'build and ship a page then push it live',
    'watch the live page in a browser and screenshot it',
    'explain what this agent cannot do and where it is blind',
    'mint a badge and stamp the provenance',
    'hold the options open and weigh them',
    'run it locally on my own electric, offline',
    'keep the spend under budget',
    'grade this against the rubric',
  ];
  const reached = new Set();
  for (const j of jobs) for (const e of spec(j, CATALOGUE, { slots: 6, budget: 9 }).equipped) reached.add(e.id);
  const dead = GEAR.filter(g => !reached.has(g.id)).map(g => g.id);
  assert.deepEqual(dead, [], `no job in the estate can reach: ${dead.join(', ')}`);
});

test('the kit specs a real estate job without blowing its own ceiling', () => {
  const s = spec('audit the estate and gate every build', CATALOGUE);
  assert.ok(s.equipped.length > 0);
  assert.ok(s.spent <= s.budget);
  assert.ok(s.equipped.every(e => e.why.length > 20));
});
