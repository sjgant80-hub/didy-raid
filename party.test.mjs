// The party: two didys hooking up for the same job.
//
// The failure this file exists to catch is a group that believes it is covered. One person who
// knows they did not bring the gate will go and get it; four people who each assumed somebody else
// brought it walk in with nothing, and every individual sheet looked fine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTENT, RIG, rigAt, gear, spec, hostFor, party } from './raid.mjs';

const CO = { gear: [
  gear({ id: 'code', name: 'Plain Code', intents: [INTENT.find], cost: 1, mind: 0, does: 'is deterministic code' }),
  gear({ id: 'sml', name: 'Small Mind', intents: [INTENT.prove], cost: 1, mind: 1, does: 'wants a small model' }),
  gear({ id: 'big', name: 'Big Mind', intents: [INTENT.judge], cost: 1, mind: 2, does: 'wants a large model' }),
  gear({ id: 'eye', name: 'The Eye', intents: [INTENT.watch], cost: 1, mind: 0, does: 'watches a page' }),
], gems: [], potions: [] };

const JOB = 'find and gate and judge it';
const member = (who, rig, job = JOB, cat = CO) => ({ ...spec(job, cat, { slots: 9, budget: 9, rig }), who });

test('WHAT POOLS IS THE RIG, NOT THE SLOTS — the ally hosts what you would have rented', () => {
  // Adding members' slots together would just make a party a bigger single player, and nobody would
  // have a reason to bring anybody in particular. What actually pools is whose machine runs it.
  const alone = member('solo', 0);
  assert.ok(alone.rented.length > 0, 'a rig-0 didy must be renting something to begin with');
  const p = party([alone, member('ally', 2)], CO, JOB);
  assert.ok(p.sovereignty > alone.sovereignty, 'standing next to a bigger rig changed nothing');
  assert.equal(p.sovereignty, 1, 'an ally owning every mind should leave the party renting nothing');
  assert.ok(p.hosted.some(h => h.from === 'solo' && h.host === 'ally'), 'nothing was reported as hosted by the ally');
});

test('a party of equals reclaims nothing, and does not pretend otherwise', () => {
  const p = party([member('a', 0), member('b', 0)], CO, JOB);
  assert.deepEqual(p.hosted, [], 'two renting didys somehow hosted each other');
  assert.ok(p.sovereignty < 1, 'a party that owns no model claimed ' + p.sovereignty);
});

test('the lightest rig that can carry the work hosts it, not always the biggest machine', () => {
  const small = { who: 'small', rig: rigAt(1), equipped: [] };
  const large = { who: 'large', rig: rigAt(2), equipped: [] };
  assert.equal(hostFor(1, [large, small]).who, 'small', 'a small job was sent to the big machine');
  assert.equal(hostFor(2, [small, large]).who, 'large');
  assert.equal(hostFor(2, [small]), null, 'a rig that cannot hold it was offered as a host');
  assert.equal(hostFor(9, [small, large]), null, 'a mind off the ladder found a host');
});

test('A ROLE NOBODY BROUGHT IS NAMED BEFORE THE PARTY GOES ANYWHERE', () => {
  const noJudge = { gear: CO.gear.filter(g => g.id !== 'big'), gems: [], potions: [] };
  const p = party([member('a', 0, JOB, noJudge), member('b', 2, JOB, noJudge)], noJudge, JOB);
  assert.deepEqual(p.uncovered, [INTENT.judge], 'the missing role was not named: ' + JSON.stringify(p.uncovered));
  assert.ok(p.roles.find(r => r.intent === INTENT.find).by.length > 0, 'a role that WAS covered read as empty');
});

test('every covered role says which member is covering it', () => {
  const p = party([member('a', 0), member('b', 0)], CO, JOB);
  assert.ok(p.roles.length > 0);
  for (const r of p.roles) {
    for (const who of r.by) assert.ok(p.members.some(m => m.who === who), 'a role credited somebody not in the party');
  }
});

test('two people bringing the same organ is reported as waste, not as teamwork', () => {
  const p = party([member('a', 0), member('b', 0)], CO, JOB);
  assert.ok(p.doubled.length > 0, 'two identical kits doubled up on nothing at all');
  for (const d of p.doubled) assert.ok(d.by.length > 1, d.id + ' was called doubled with one owner');
});

test('a party names what nobody in it can do — its own shadow, not any one member\'s', () => {
  const p = party([member('a', 0, 'find something')], CO, 'find something');
  const ids = p.cannot.map(c => c.id);
  assert.ok(ids.includes('big'), 'a party of one claimed the whole catalogue');
  assert.ok(!ids.includes('code'), 'something that WAS brought was listed as impossible');
});

test('AN EMPTY PARTY MAKES NO CLAIM rather than a perfect one', () => {
  for (const bad of [[], null, undefined, 'party', [null, 7, {}]]) {
    const p = party(bad, CO, JOB);
    assert.equal(p.sovereignty, null, 'an empty party scored ' + p.sovereignty);
    assert.deepEqual(p.members, []);
  }
});

test('party() is total, and never re-specs what somebody brought', () => {
  const a = member('a', 0);
  const before = JSON.stringify(a);
  for (const cat of [null, undefined, {}, { gear: null }, { gear: [null, 7] }, CO]) party([a, null, 7, {}], cat, JOB);
  assert.equal(JSON.stringify(a), before, 'the party quietly rewrote a member kit');
  for (const t of [null, undefined, 0, {}, { toString() { throw new Error('toxic'); } }]) {
    assert.ok(Array.isArray(party([a], CO, t).roles), 'party died on a task of ' + typeof t);
  }
});

test('a member who never named themselves still gets a name on the sheet', () => {
  const p = party([spec(JOB, CO, { slots: 9, budget: 9, rig: 0 })], CO, JOB);
  assert.ok(p.members[0].who.length > 0, 'an unnamed member appeared as nothing');
  assert.ok(p.roles.every(r => r.by.every(w => typeof w === 'string' && w.length)));
});

test('the party sovereignty is weighted by cost, like the solo one', () => {
  const kit = { gear: [
    gear({ id: 'cheap', intents: [INTENT.find], cost: 0, mind: 0, does: 'free and local' }),
    gear({ id: 'dear', intents: [INTENT.judge], cost: 8, mind: 2, does: 'dear and rented' }),
  ], gems: [], potions: [] };
  const p = party([member('a', 0, 'find and judge', kit)], kit, 'find and judge');
  assert.equal(p.sovereignty, 0, 'one free local tool made a rented bill look sovereign: ' + p.sovereignty);
});

test('every rung of the ladder can host at least what it holds', () => {
  for (const r of RIG) {
    const m = { who: r.name, rig: r, equipped: [] };
    assert.equal(hostFor(r.holds, [m]).who, r.name, r.name + ' cannot host the mind it claims to hold');
    if (r.holds < 2) assert.equal(hostFor(r.holds + 1, [m]), null, r.name + ' hosted more than it holds');
  }
});


// ─── what the mutation gate proved nothing was watching ───

test('two rigs that hold the same amount pick the same host every time', () => {
  const a = { who: 'first', rig: rigAt(1), equipped: [] };
  const b = { who: 'second', rig: rigAt(1), equipped: [] };
  assert.equal(hostFor(1, [a, b]).who, 'first', 'an unstable tie means two runs of one party disagree');
  assert.equal(hostFor(1, [b, a]).who, 'second');
});

test('a member with no rig at all is not a host, and does not take the party down', () => {
  const broken = { who: 'broken', equipped: [] };
  const real = { who: 'real', rig: rigAt(2), equipped: [] };
  assert.equal(hostFor(0, [broken]).who, 'broken', 'a missing rig should read as the bottom rung, not a crash');
  assert.equal(hostFor(2, [broken]), null, 'a member with no rig hosted large-model work');
  assert.equal(hostFor(2, [broken, real]).who, 'real');
});

test('an organ only one member brought is NOT reported as doubled', () => {
  // Off by one here turns every single item into "wasted overlap", and the advice the party gets
  // is to drop the only copy of something nobody else has.
  const solo = member('a', 0, 'watch the page');
  const other = member('b', 0, 'find something');
  const p = party([solo, other], CO, 'find and watch');
  for (const d of p.doubled) assert.ok(d.by.length > 1, d.id + ' was called waste with a single owner');
  const brought = new Set(p.members.flatMap(m => m.brought));
  assert.ok(brought.size > p.doubled.length, 'every single organ was reported as a duplicate');
});

test('a party carrying only free tools still reads sovereignty honestly', () => {
  const free = { gear: [
    gear({ id: 'f-mine', intents: [INTENT.find], cost: 0, mind: 0, does: 'free and local' }),
    gear({ id: 'f-rent', intents: [INTENT.judge], cost: 0, mind: 2, does: 'free but needs a big model' }),
  ], gems: [], potions: [] };
  const owned = party([member('a', 2, 'find and judge', free)], free, 'find and judge');
  assert.equal(owned.sovereignty, 1, 'a party owning every mind read as ' + owned.sovereignty);
  // With no prices to weigh, the honest reading is heads: one of the two tools runs locally, so
  // half of this kit is yours. Reporting 1 here would be a score that cannot fail; reporting 0
  // would punish the free local tool for being free.
  const half = party([member('b', 0, 'find and judge', free)], free, 'find and judge');
  assert.equal(half.sovereignty, 0.5, 'free-but-rented read as ' + half.sovereignty);
  const allRented = { gear: [free.gear[1]], gems: [], potions: [] };
  assert.equal(party([member('c', 0, 'judge it', allRented)], allRented, 'judge it').sovereignty, 0,
    'a kit that is entirely rented must read zero, whatever it cost');
});

test('a party split between owned and rented reads as a real fraction, not a verdict', () => {
  const p = party([member('a', 1)], CO, JOB);
  assert.ok(p.sovereignty > 0 && p.sovereignty < 1, 'a mixed party read as ' + p.sovereignty);
});

test('THE JOB THE PARTY IS ON IS THE JOB THE PARTY WAS GIVEN', () => {
  // Falling back to a member's own task means the party silently reports on whatever the first
  // person happened to be doing, and the role coverage answers the wrong question entirely.
  const walker = member('a', 0, 'watch the page');
  const p = party([walker], CO, 'find and judge');
  assert.equal(p.task, 'find and judge');
  assert.deepEqual(p.roles.map(r => r.intent).sort(), [INTENT.find, INTENT.judge].sort(),
    'the party read the wrong job: ' + p.roles.map(r => r.intent).join(','));
  // With no task given at all, falling back to what the member brought is the right behaviour.
  assert.equal(party([walker], CO).task, 'watch the page');
});

test('a member who names themselves nothing still gets a name', () => {
  const blank = { ...member('x', 0), who: '' };
  const p = party([blank], CO, JOB);
  assert.ok(p.members[0].who.length > 0, 'an empty name survived onto the sheet');
});
