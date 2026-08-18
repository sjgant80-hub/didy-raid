// Tests for the raid kernel.
//
// Each one names a way the spec could be wrong in a way you would not notice by looking at it — a
// loadout that reads fine and does nothing. A test that only checks the happy path would pass
// against an auto-speccer that quietly ignores its own budget, and that is the whole risk here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KAPPA, INTENT, NAMED, MIND, MIND_NAME, RIG, rigAt, readTask, gear, gem, potion, scoreGear, spec, cannot, readout,
} from './raid.mjs';

// ── a tiny catalogue we control completely, so a test failing means the kernel changed ──
const KIT = {
  gear: [
    gear({ id: 'g-find',  name: 'Finder',  intents: [INTENT.find],  cost: 1, sockets: 1, does: 'finds', keys: ['finder'] }),
    gear({ id: 'g-prove', name: 'Prover',  intents: [INTENT.prove], cost: 1, sockets: 1, does: 'proves', keys: ['gate'] }),
    gear({ id: 'g-both',  name: 'Both',    intents: [INTENT.find, INTENT.prove], cost: 1, sockets: 0, does: 'does both' }),
    gear({ id: 'g-dear',  name: 'Dear',    intents: [INTENT.find],  cost: 9, sockets: 0, does: 'costs a fortune' }),
    gear({ id: 'g-dep',   name: 'Dependent', intents: [INTENT.find], cost: 1, sockets: 0, needs: ['g-find'], does: 'needs the finder' }),
    gear({ id: 'g-orphan', name: 'Orphan', intents: [INTENT.find], cost: 1, sockets: 0, needs: ['nowhere'], does: 'needs a tool nobody has' }),
    gear({ id: 'g-watch', name: 'Watcher', intents: [INTENT.watch], cost: 1, sockets: 0, does: 'watches' }),
  ],
  gems: [
    gem({ id: 'sharp', name: 'Sharp', fits: ['g-find'], cost: 0, does: 'sharpens' }),
    gem({ id: 'costly', name: 'Costly', fits: ['g-find'], cost: 99, does: 'unaffordable' }),
    gem({ id: 'misfit', name: 'Misfit', fits: ['g-nothing'], cost: 0, does: 'fits nothing here' }),
  ],
  potions: [potion({ id: 'p', name: 'Potion', cost: 1, grants: [INTENT.find], does: 'helps' })],
};

// ─────────────────────────── reading the job ───────────────────────────

test('reads the intents a job actually names', () => {
  const w = readTask('sweep the estate and prove the gate is clean');
  const intents = w.map(x => x.intent);
  assert.ok(intents.includes(INTENT.find), 'sweep is a find');
  assert.ok(intents.includes(INTENT.prove), 'prove/gate/clean is a prove');
});

test('a job that names nothing reads as nothing — no intent is invented', () => {
  assert.deepEqual(readTask('xylophone marmalade'), []);
  assert.deepEqual(readTask(''), []);
  assert.deepEqual(readTask(null), []);
});

test('the strongest-evidenced intent is read first', () => {
  const w = readTask('find search sweep and also push');
  assert.equal(w[0].intent, INTENT.find);
  assert.equal(w[0].weight, 3);
});

test('cue matching is on whole words, not substrings', () => {
  // "unfindable" contains "find". A substring matcher would read a find intent that is not there.
  assert.deepEqual(readTask('this is unfindable'), []);
});

test('a repeated cue does not inflate the weight', () => {
  // Saying "test test test" is emphasis, not three separate needs.
  assert.equal(readTask('test test test').find(w => w.intent === INTENT.prove).weight, 1);
});

test('reading a job is case-insensitive', () => {
  assert.equal(readTask('AUDIT the Estate').length, readTask('audit the estate').length);
});

// ─────────────────────────── declaring loot ───────────────────────────

test('gear declaring an intent that does not exist is refused at definition time', () => {
  // ⚑ A typo'd intent would silently never match, and the gear would sit in the catalogue looking
  // available forever. It has to throw where it is written, not go quiet where it is used.
  assert.throws(() => gear({ id: 'x', intents: ['teleport'] }), /not an intent/);
});

test('gear with no id, a negative cost, or fractional sockets is refused', () => {
  assert.throws(() => gear({ name: 'nameless' }), /id/);
  assert.throws(() => gear({ id: 'x', cost: -1 }), /cost/);
  assert.throws(() => gear({ id: 'x', sockets: 1.5 }), /sockets/);
});

test('declared loot is frozen — a catalogue cannot be edited by whoever reads it', () => {
  const g = gear({ id: 'x', intents: [INTENT.find] });
  assert.throws(() => { g.cost = 0; }, TypeError);
  assert.throws(() => { g.intents.push(INTENT.prove); }, TypeError);
});

// ─────────────────────────── scoring, with a reason ───────────────────────────

test('every score carries a why, and a zero carries none', () => {
  const wanted = readTask('find things');
  const hit = scoreGear(KIT.gear[0], wanted, new Set());
  assert.ok(hit.score > 0);
  assert.match(hit.why, /the job asks to find/);
  assert.match(hit.why, /finds/, 'the why quotes what the gear actually does');

  const miss = scoreGear(KIT.gear[6], wanted, new Set());
  assert.equal(miss.score, 0);
  assert.equal(miss.why, '');
});

test('a job that names the gear outranks a job that merely implies it', () => {
  // The defect this catches: two tools serve `prove` equally, so the tie fell to whichever was
  // cheaper — and a job that literally said "gate" equipped the badge-stamper over the gate.
  const wanted = readTask('gate this');
  const named = scoreGear(KIT.gear[1], wanted, new Set(['gate']));
  const implied = scoreGear(KIT.gear[2], wanted, new Set(['gate']));
  assert.ok(named.score > implied.score, 'the named tool must win');
  assert.match(named.why, /names it directly/);
  assert.ok(NAMED > 0);
});

test('gear can be reached by name alone, with no matching intent', () => {
  const s = scoreGear(KIT.gear[0], [], new Set(['finder']));
  assert.ok(s.score > 0, 'saying its name is enough to reach it');
  assert.deepEqual(s.matched, []);
});

// ─────────────────────────── speccing the build ───────────────────────────

test('the didy equips for the job without being told what to equip', () => {
  const s = spec('sweep and gate', KIT);
  const ids = s.equipped.map(e => e.id);
  assert.ok(ids.includes('g-find'), 'covers find');
  assert.ok(ids.includes('g-prove'), 'covers prove');
});

test('EVERY EQUIPPED THING CARRIES A WHY — a loadout nobody can interrogate cannot be corrected', () => {
  const s = spec('sweep and gate', KIT);
  assert.ok(s.equipped.length > 0);
  for (const e of s.equipped) {
    assert.equal(typeof e.why, 'string');
    assert.ok(e.why.length > 20, `${e.id} equipped with a why nobody could argue with: ${JSON.stringify(e.why)}`);
  }
});

test('THE BUDGET IS A HARD CEILING — an agent that can talk itself over budget has no budget', () => {
  for (const budget of [0, 1, 2, 3, 5, 9]) {
    const s = spec('find search sweep audit scan gate test verify watch push', KIT, { budget, slots: 99 });
    const real = s.equipped.reduce((a, e) => a + e.cost, 0)
               + s.equipped.flatMap(e => e.gems).reduce((a, g) => a + g.cost, 0);
    assert.ok(real <= budget, `spent ${real} against a ceiling of ${budget}`);
    assert.equal(s.spent, real, 'the reported spend is the real spend');
  }
});

test('slots are a hard ceiling too', () => {
  for (const slots of [0, 1, 2, 3]) {
    const s = spec('find search sweep audit gate watch', KIT, { slots, budget: 99 });
    assert.ok(s.equipped.length <= slots, `equipped ${s.equipped.length} into ${slots} slots`);
  }
});

test('ROLE COVERAGE BEFORE DEPTH — one of each role the job needs, not four of the loudest', () => {
  // ⚑ Ranking purely on score filled every slot with whichever intent the task used the most words
  // for. "find, audit, sweep for builds with no gate" equipped four finders and left the gate home.
  const s = spec('find search sweep audit scan and gate it', KIT, { slots: 2, budget: 99 });
  const served = new Set(s.equipped.flatMap(e => e.serves));
  assert.ok(served.has(INTENT.prove), 'the quiet role still gets a body in the party');
  assert.ok(served.has(INTENT.find));
});

test('GEAR WHOSE PREREQUISITE CANNOT BE MET IS REFUSED, not quietly equipped and dead', () => {
  const s = spec('find', KIT, { slots: 9, budget: 99 });
  const ids = s.equipped.map(e => e.id);
  assert.ok(!ids.includes('g-orphan'), 'a tool needing a tool nobody has must not be equipped');
  assert.ok(s.passed.some(p => p.id === 'g-orphan'), 'and it must be reported, not silently dropped');
});

test('a prerequisite that IS available gets carried, and carried FIRST', () => {
  const s = spec('find', KIT, { slots: 9, budget: 99 });
  const ids = s.equipped.map(e => e.id);
  if (ids.includes('g-dep')) {
    assert.ok(ids.includes('g-find'), 'the dependency came with it');
    assert.ok(ids.indexOf('g-find') < ids.indexOf('g-dep'), 'and came first');
  }
});

test('a prerequisite that will not fit means the dependent does not go in either', () => {
  // Room for exactly one, and the dependent needs a companion it cannot afford.
  const only = { ...KIT, gear: KIT.gear.filter(g => ['g-dep', 'g-find'].includes(g.id)) };
  const s = spec('find', only, { slots: 1, budget: 99 });
  const ids = s.equipped.map(e => e.id);
  assert.ok(!ids.includes('g-dep') || ids.includes('g-find'), 'never the dependent without its prerequisite');
});

test('nothing is equipped twice, however many roles it covers', () => {
  const s = spec('find search and gate and verify', KIT, { slots: 9, budget: 99 });
  const ids = s.equipped.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a job with no readable intent specs nothing rather than guessing', () => {
  const s = spec('xylophone marmalade', KIT);
  assert.deepEqual(s.equipped, []);
  assert.equal(s.spent, 0);
  assert.match(s.status, /nothing|read/i, `an empty spec must say so, got ${JSON.stringify(s.status)}`);
});

test('the spec is pure — the same job specs the same build, every time', () => {
  const a = spec('audit the estate and gate it', KIT);
  const b = spec('audit the estate and gate it', KIT);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

test('speccing does not mutate the catalogue it was handed', () => {
  const before = JSON.stringify(KIT);
  spec('find and gate and watch and push', KIT, { slots: 9, budget: 99 });
  assert.equal(JSON.stringify(KIT), before);
});

test('a catalogue with no gear, or a missing one, specs nothing instead of throwing', () => {
  assert.equal(spec('find', { gear: [] }).equipped.length, 0);
  assert.equal(spec('find', {}).equipped.length, 0);
});

// ─────────────────────────── gems ───────────────────────────

test('a gem only goes into gear it fits, and only into a real socket', () => {
  const s = spec('find', KIT, { slots: 9, budget: 99 });
  for (const e of s.equipped) {
    assert.ok(e.gems.length <= e.sockets, `${e.id} has ${e.gems.length} gems in ${e.sockets} sockets`);
    for (const g of e.gems) {
      const decl = KIT.gems.find(x => x.id === g.id);
      assert.ok(decl.fits.includes(e.id), `${g.id} does not fit ${e.id}`);
    }
  }
});

test('a gem the run cannot afford is not socketed', () => {
  const s = spec('find', KIT, { slots: 9, budget: 2 });
  assert.ok(!s.equipped.flatMap(e => e.gems).some(g => g.id === 'costly'));
});

test('a gem that fits nothing equipped is never socketed anywhere', () => {
  const s = spec('find and gate and watch', KIT, { slots: 9, budget: 99 });
  assert.ok(!s.equipped.flatMap(e => e.gems).some(g => g.id === 'misfit'));
});

// ─────────────────────────── potions ───────────────────────────

test('potions come from their own purse and cannot be raided for gear', () => {
  const s = spec('find', KIT, { slots: 9, budget: 99, potionBudget: 0 });
  assert.deepEqual(s.potions, []);
});

test('a potion is only drunk for an intent the job actually named', () => {
  const s = spec('watch the page', KIT, { slots: 9, budget: 99, potionBudget: 9 });
  assert.ok(!s.potions.some(p => p.id === 'p'), 'a find potion on a watch job is waste');
});

// ─────────────────────────── the shadow of the spec ───────────────────────────

test('CANNOT is the other half of the sheet — what this build will not be able to do', () => {
  const s = spec('find', KIT, { slots: 1, budget: 1 });
  const no = cannot(s, KIT);
  assert.ok(no.length > 0);
  for (const c of no) {
    assert.ok(c.why && c.why.length > 3, `${c.name} refused with no reason given`);
    assert.ok(!s.equipped.some(e => e.id === c.id), 'nothing is both equipped and refused');
  }
});

test('the shadow and the spec partition the catalogue — nothing falls between them', () => {
  // ⚑ The partition invariant. A tool that is neither equipped nor named as missing is a capability
  // nobody can see either way, which is exactly the blind spot the shadow surface exists to kill.
  const s = spec('find and gate and watch and push', KIT, { slots: 2, budget: 2 });
  const seen = new Set([...s.equipped.map(e => e.id), ...cannot(s, KIT).map(c => c.id)]);
  for (const g of KIT.gear) assert.ok(seen.has(g.id), `${g.id} is in neither the spec nor its shadow`);
});

test('a full-strength spec still names what it gave up', () => {
  const s = spec('find', KIT, { slots: 99, budget: 99 });
  const no = cannot(s, KIT);
  assert.ok(no.every(c => c.kind && c.why));
});

// ─────────────────────────── the readout ───────────────────────────

test('the readout says the spend and the ceiling, never just a mood', () => {
  const s = spec('find and gate', KIT, { budget: 6 });
  const line = readout(s);
  assert.match(line, /\/6/, `the readout hides the ceiling: ${line}`);
  assert.ok(line.includes(String(s.spent)));
});

test('heat is a real reading of the burn line, not decoration', () => {
  const cool = spec('find', KIT, { slots: 9, budget: 99 });
  const hot = spec('find search sweep audit gate watch push', KIT, { slots: 9, budget: 3 });
  assert.ok(cool.spent / 99 < KAPPA);
  assert.notEqual(cool.heat, hot.heat, 'a cold run and a run at the ceiling must not read the same');
  assert.ok(KAPPA > 0.6 && KAPPA < 0.62);
});

test('a readout of an empty spec is still a sentence, not an empty string', () => {
  const line = readout(spec('xylophone', KIT));
  assert.ok(line.trim().length > 0);
});

// ─── what the mutation gate proved nothing was watching ───

test('a build that fits the budget EXACTLY is allowed in', () => {
  // ⚑ The off-by-one that makes a ceiling of 6 really a ceiling of 5. Nothing noticed, because
  // every other test spends under the line rather than on it.
  const one = { gear: [gear({ id: 'a', intents: [INTENT.find], cost: 3, does: 'finds' })], gems: [], potions: [] };
  assert.equal(spec('find', one, { budget: 3, slots: 9 }).equipped.length, 1, 'exactly on budget must fit');
  assert.equal(spec('find', one, { budget: 2, slots: 9 }).equipped.length, 0, 'a penny over must not');
});

test('a potion that fits the purse exactly is drunk', () => {
  const one = { gear: [], gems: [], potions: [potion({ id: 'p', cost: 2, grants: [INTENT.find], does: 'helps' })] };
  assert.equal(spec('find', one, { potionBudget: 2 }).potions.length, 1);
  assert.equal(spec('find', one, { potionBudget: 1 }).potions.length, 0);
});

test('a gem that fits the remaining budget exactly is socketed', () => {
  const kit = {
    gear: [gear({ id: 'a', intents: [INTENT.find], cost: 1, sockets: 1, does: 'finds' })],
    gems: [gem({ id: 'j', fits: ['a'], cost: 1, does: 'sharpens' })], potions: [],
  };
  assert.equal(spec('find', kit, { budget: 2, slots: 9 }).gems.length, 1);
  assert.equal(spec('find', kit, { budget: 1, slots: 9 }).gems.length, 0);
});

test('an empty-string id is refused as hard as a missing one', () => {
  // typeof '' IS 'string', so a guard that only checks the type lets a nameless thing through.
  for (const make of [gear, gem, potion]) assert.throws(() => make({ id: '' }), /id/);
});

test('a cost that is not a number is refused — NaN is not "free"', () => {
  for (const make of [gear, gem, potion]) {
    assert.throws(() => make({ id: 'x', cost: NaN }), /cost/, 'NaN cost must be refused');
    assert.throws(() => make({ id: 'x', cost: Infinity }), /cost/, 'an infinite cost must be refused');
  }
});

test('loot with no display name falls back to its id rather than showing "undefined"', () => {
  assert.equal(gear({ id: 'witness' }).name, 'witness');
  assert.equal(gem({ id: 'sharp' }).name, 'sharp');
  assert.equal(potion({ id: 'brew' }).name, 'brew');
});

test('an equal score breaks to the cheaper tool, and an equal price to a stable order', () => {
  // Without this the loadout is score-ordered but arbitrary underneath, and two identical runs
  // can spec differently — which quietly breaks every claim that a spec is replayable.
  const kit = { gear: [
    gear({ id: 'z-cheap', intents: [INTENT.find], cost: 1, does: 'finds' }),
    gear({ id: 'a-dear',  intents: [INTENT.find], cost: 5, does: 'finds' }),
    gear({ id: 'b-cheap', intents: [INTENT.find], cost: 1, does: 'finds' }),
  ], gems: [], potions: [] };
  const ids = spec('find', kit, { slots: 3, budget: 99 }).equipped.map(e => e.id);
  assert.equal(ids[0], 'b-cheap', 'cheapest first, then id order — got ' + ids.join(','));
  assert.equal(ids[1], 'z-cheap');
});

test('THE SLOT CEILING HOLDS EVEN WHEN A TOOL DRAGS ITS PREREQUISITE IN WITH IT', () => {
  // ⚑ The defect the gate found: the slot check ran against the one piece of gear asked for, then
  // the prerequisite was fetched afterwards — so two went into one slot and the ceiling was fiction.
  const kit = { gear: [
    gear({ id: 'needy', intents: [INTENT.find], cost: 1, needs: ['base'], does: 'needs the base' }),
    gear({ id: 'base',  intents: [INTENT.find], cost: 1, does: 'is the base' }),
  ], gems: [], potions: [] };
  for (const slots of [0, 1, 2]) {
    const s = spec('find', kit, { slots, budget: 99 });
    assert.ok(s.equipped.length <= slots, `${s.equipped.length} tools in ${slots} slot(s)`);
    for (const e of s.equipped) {
      const decl = kit.gear.find(g => g.id === e.id);
      for (const n of decl.needs) assert.ok(s.equipped.some(x => x.id === n), `${e.id} equipped without ${n}`);
    }
  }
});

test('the budget ceiling holds across a prerequisite chain too', () => {
  const kit = { gear: [
    gear({ id: 'needy', intents: [INTENT.find], cost: 2, needs: ['base'], does: 'needs the base' }),
    gear({ id: 'base',  intents: [INTENT.find], cost: 2, does: 'is the base' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 3 });
  assert.equal(s.spent, 2, 'the pair costs 4 against a ceiling of 3, so only the base goes in');
  assert.ok(!s.equipped.some(e => e.id === 'needy'));
});

test('a prerequisite loop is refused instead of hanging', () => {
  const kit = { gear: [
    gear({ id: 'a', intents: [INTENT.find], needs: ['b'], does: 'loops' }),
    gear({ id: 'b', intents: [INTENT.find], needs: ['a'], does: 'loops back' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 99 });
  assert.deepEqual(s.equipped, [], 'neither can go in');
  assert.equal(s.passed.length, 2, 'and both are reported');
});

test('a carried prerequisite says it was carried, not that the job asked for it', () => {
  const kit = { gear: [
    gear({ id: 'needy', name: 'Needy', intents: [INTENT.find], needs: ['base'], does: 'needs the base' }),
    gear({ id: 'base',  name: 'Base',  intents: [INTENT.prove], does: 'is the base' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 99 });
  const base = s.equipped.find(e => e.id === 'base');
  assert.ok(base, 'the prerequisite came along');
  assert.match(base.why, /carried because Needy needs it/);
  assert.deepEqual(base.serves, [], 'it serves no intent the job named — the sheet must not pretend it does');
});

test('a job read as nothing and a job read as something-unserved are different states', () => {
  const empty = { gear: [], gems: [], potions: [] };
  assert.equal(spec('xylophone', empty).understood, false);
  assert.equal(spec('find things', empty).understood, true);
  assert.notEqual(spec('xylophone', empty).status, spec('find things', empty).status);
});


test('a role is covered by a cheaper tool rather than left uncovered', () => {
  // The defect: only ever considering the single best candidate for a role meant an expensive first
  // choice left the role empty, while a tool that would have covered it sat right below in the rank.
  const kit = { gear: [
    gear({ id: 'dear', intents: [INTENT.watch], cost: 9, does: 'watches, expensively', keys: ['watch'] }),
    gear({ id: 'cheap', intents: [INTENT.watch], cost: 1, does: 'watches' }),
  ], gems: [], potions: [] };
  const s = spec('watch the page', kit, { slots: 9, budget: 2 });
  assert.deepEqual(s.equipped.map(e => e.id), ['cheap'], 'the affordable one covers the role');
  assert.deepEqual(s.uncovered, [], 'and the role is not reported as uncovered');
});

test('A ROLE NOTHING CAN COVER IS SAID OUT LOUD, not left as a silent hole', () => {
  const kit = { gear: [gear({ id: 'f', intents: [INTENT.find], cost: 1, does: 'finds' })], gems: [], potions: [] };
  const s = spec('find the page and watch it', kit, { slots: 9, budget: 9 });
  assert.deepEqual(s.uncovered, [INTENT.watch]);
  assert.match(s.status, /cannot watch/, 'a build that cannot do part of the job must say so: ' + s.status);
});

test('free loot is legal - a cost of zero is not an error', () => {
  assert.equal(gear({ id: 'x', cost: 0 }).cost, 0);
  assert.equal(gem({ id: 'x', cost: 0 }).cost, 0);
  assert.equal(potion({ id: 'x', cost: 0 }).cost, 0);
});

test('a socket holds one gem, and no-socket gear holds none', () => {
  const kit = {
    gear: [gear({ id: 'a', intents: [INTENT.find], cost: 0, sockets: 1, does: 'finds' }),
           gear({ id: 'b', intents: [INTENT.find], cost: 0, sockets: 0, does: 'also finds' })],
    gems: [gem({ id: 'j1', fits: ['a', 'b'], cost: 0, does: 'one' }),
           gem({ id: 'j2', fits: ['a', 'b'], cost: 0, does: 'two' })],
    potions: [],
  };
  const s = spec('find', kit, { slots: 9, budget: 9 });
  assert.equal(s.equipped.find(e => e.id === 'a').gems.length, 1, 'one socket takes exactly one gem');
  assert.equal(s.equipped.find(e => e.id === 'b').gems.length, 0, 'no socket takes none');
});

test('a chain that fills the slots exactly, and costs exactly the budget, still fits', () => {
  const kit = { gear: [
    gear({ id: 'needy', intents: [INTENT.find], cost: 1, needs: ['base'], does: 'needs the base' }),
    gear({ id: 'base',  intents: [INTENT.find], cost: 1, does: 'is the base' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 2, budget: 2 });
  assert.equal(s.equipped.length, 2, 'exactly two into exactly two slots at exactly the price');
  assert.equal(s.spent, 2);
});

test('the refusal names how many extra tools would have had to come along', () => {
  const kit = { gear: [
    gear({ id: 'needy', intents: [INTENT.find], cost: 1, needs: ['base'], does: 'needs the base' }),
    gear({ id: 'base',  intents: [INTENT.prove], cost: 1, does: 'is the base' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 1, budget: 9 });
  const no = s.passed.find(p => p.id === 'needy');
  assert.ok(/the 1 tool/.test(no.why), 'miscounted the chain: ' + no.why);
});

test('spending exactly the budget reads as at the ceiling, not merely hot', () => {
  const kit = { gear: [gear({ id: 'a', intents: [INTENT.find], cost: 4, does: 'finds' })], gems: [], potions: [] };
  assert.equal(spec('find', kit, { slots: 9, budget: 4 }).status, 'at the ceiling');
  assert.equal(spec('find', kit, { slots: 9, budget: 5 }).status, 'hot');
});

test('a budget of zero gives a real reading, not NaN', () => {
  const kit = { gear: [gear({ id: 'a', intents: [INTENT.find], cost: 0, does: 'finds free' })], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 0 });
  assert.ok(Number.isFinite(s.heat), 'heat came back ' + s.heat);
  assert.equal(s.heat, 0);
});

test('two intents named with equal evidence read in a stable order', () => {
  const w = readTask('build and watch');
  assert.deepEqual(w.map(x => x.intent), [INTENT.build, INTENT.watch]);
});

test('what loot does is carried through verbatim, not blanked', () => {
  assert.equal(gear({ id: 'x', does: 'gates the build' }).does, 'gates the build');
  assert.equal(gem({ id: 'x', does: 'sharpens it' }).does, 'sharpens it');
  assert.equal(potion({ id: 'x', does: 'escalates once' }).does, 'escalates once');
});

test('a prerequisite that never said what it does still gets a readable why', () => {
  const kit = { gear: [
    gear({ id: 'needy', name: 'Needy', intents: [INTENT.find], needs: ['base'], does: 'needs the base' }),
    gear({ id: 'base',  name: 'Base' }),
  ], gems: [], potions: [] };
  const base = spec('find', kit, { slots: 9, budget: 9 }).equipped.find(e => e.id === 'base');
  assert.ok(base.why.length > 20, 'a silent prerequisite left an unreadable why: ' + JSON.stringify(base.why));
  assert.doesNotMatch(base.why, /undefined/);
});

test('two tools refused for two different reasons are both reported, each with its own', () => {
  const kit = { gear: [
    gear({ id: 'dear', intents: [INTENT.find], cost: 99, does: 'costs too much' }),
    gear({ id: 'orphan', intents: [INTENT.find], cost: 1, needs: ['nowhere'], does: 'needs a ghost' }),
    gear({ id: 'ok', intents: [INTENT.find], cost: 1, does: 'is fine' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 2 });
  const why = new Map(s.passed.map(p => [p.id, p.why]));
  assert.ok(why.has('dear') && why.has('orphan'), 'both refusals survive - got ' + [...why.keys()]);
  assert.notEqual(why.get('dear'), why.get('orphan'), 'and they do not share one reason');
});


test('ONE TOOL, ONE REASON - the shadow never lists the same refusal twice', () => {
  // The count-based version of this test passed against a broken dedupe: the mutation dropped one
  // entry and duplicated another, and the total came out the same. Assert the ids, not the tally.
  const kit = { gear: [
    gear({ id: 'dear', intents: [INTENT.find], cost: 99, does: 'costs too much' }),
    gear({ id: 'ghost', intents: [INTENT.find], cost: 1, needs: ['nowhere'], does: 'needs a ghost' }),
    gear({ id: 'big', intents: [INTENT.find], cost: 1, needs: ['dear'], does: 'needs the dear one' }),
  ], gems: [], potions: [] };
  const s = spec('find and search', kit, { slots: 1, budget: 2 });
  const ids = s.passed.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'a tool refused twice: ' + ids.join(','));
  for (const id of ['dear', 'ghost']) assert.ok(ids.includes(id), id + ' vanished from the shadow');
});

test('a single tool refused for room does not claim it had companions', () => {
  const kit = { gear: [gear({ id: 'solo', intents: [INTENT.find], cost: 1, does: 'finds alone' })], gems: [], potions: [] };
  assert.equal(spec('find', kit, { slots: 0, budget: 9 }).passed[0].why, 'no slot left');
  assert.ok(/^would cost 1/.test(spec('find', kit, { slots: 9, budget: 0 }).passed[0].why),
    'a lone tool must not be refused as though it dragged others with it');
});

test('EVERY ROLE THE JOB NAMES GETS A BODY BEFORE ANY ROLE GETS A SECOND', () => {
  // Three roles, three slots, and two strong candidates for the loudest role. If the coverage pass
  // stops early or does not stop at all, one role walks in with nobody.
  const kit = { gear: [
    gear({ id: 'f1', intents: [INTENT.find], cost: 1, does: 'finds', keys: ['find', 'search'] }),
    gear({ id: 'f2', intents: [INTENT.find], cost: 1, does: 'also finds', keys: ['find', 'search'] }),
    gear({ id: 'p1', intents: [INTENT.prove], cost: 1, does: 'proves' }),
    gear({ id: 'w1', intents: [INTENT.watch], cost: 1, does: 'watches' }),
  ], gems: [], potions: [] };
  const s = spec('find and search, then gate it, then watch it', kit, { slots: 3, budget: 3 });
  const served = new Set(s.equipped.flatMap(e => e.serves));
  for (const need of [INTENT.find, INTENT.prove, INTENT.watch]) {
    assert.ok(served.has(need), need + ' walked in with nobody: ' + s.equipped.map(e => e.id).join(','));
  }
  assert.deepEqual(s.uncovered, []);
});

test('covering a role stops at one - the pass does not keep spending on a role it already filled', () => {
  const kit = { gear: [
    gear({ id: 'f1', intents: [INTENT.find], cost: 1, does: 'finds' }),
    gear({ id: 'f2', intents: [INTENT.find], cost: 1, does: 'also finds' }),
    gear({ id: 'w1', intents: [INTENT.watch], cost: 1, does: 'watches' }),
  ], gems: [], potions: [] };
  const s = spec('find and watch', kit, { slots: 2, budget: 2 });
  assert.ok(s.equipped.some(e => e.id === 'w1'), 'the second finder ate the watcher slot');
});

test('a prerequisite named in the why is named by its display name, not left blank', () => {
  const kit = { gear: [
    gear({ id: 'needy', name: 'The Needy One', intents: [INTENT.find], needs: ['base'], does: 'needs a base' }),
    gear({ id: 'base', name: 'The Base', does: 'holds it up' }),
  ], gems: [], potions: [] };
  const base = spec('find', kit, { slots: 9, budget: 9 }).equipped.find(e => e.id === 'base');
  assert.ok(/The Needy One/.test(base.why), 'the why does not say who needed it: ' + base.why);
  assert.ok(/holds it up/.test(base.why), 'the why does not say what it does: ' + base.why);
});

test('intents with equal evidence sort by name so two identical jobs read identically', () => {
  const a = readTask('watch and build');
  const b = readTask('build and watch');
  assert.deepEqual(a.map(x => x.intent), b.map(x => x.intent));
  assert.deepEqual(a.map(x => x.intent), [INTENT.build, INTENT.watch]);
});


test('a spend landing exactly on the burn line still reads cool', () => {
  // KAPPA is the line, and the line belongs to the cool side. Reachable exactly, so it is tested
  // rather than waved away as a boundary nobody can hit.
  const kit = { gear: [gear({ id: 'a', intents: [INTENT.find], cost: KAPPA, does: 'finds' })], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 1 });
  assert.equal(s.heat, KAPPA, 'the run did not land on the line');
  assert.equal(s.status, 'cool');
});

test('the loudest intent is read first even when it sorts last alphabetically', () => {
  // Sorting on the tie-break alone reads the job alphabetically and calls it priority. It looks
  // right in every example where the strongest intent happens to start with an early letter.
  const w = readTask('push publish deploy and also find');
  assert.equal(w[0].intent, INTENT.move, 'read as ' + w.map(x => x.intent).join(',') + ' - alphabetical, not by evidence');
  assert.equal(w[0].weight, 3);
});

test('A SCARCE SLOT GOES TO THE ROLE THE JOB PRESSED HARDEST', () => {
  // If a refusal is mistaken for a covered role, the coverage pass abandons that role and the one
  // slot goes to whatever came next - so the job is specced for its quietest need.
  const kit = { gear: [
    gear({ id: 'dear-watch', intents: [INTENT.watch], cost: 9, does: 'watches, expensively', keys: ['page'] }),
    gear({ id: 'cheap-watch', intents: [INTENT.watch], cost: 1, does: 'watches' }),
    gear({ id: 'finder', intents: [INTENT.find], cost: 1, does: 'finds' }),
  ], gems: [], potions: [] };
  const s = spec('watch the live page and find something', kit, { slots: 1, budget: 2 });
  assert.deepEqual(s.equipped.map(e => e.id), ['cheap-watch'],
    'the one slot went to the quieter role: ' + s.equipped.map(e => e.id).join(','));
  assert.deepEqual(s.uncovered, [INTENT.find]);
});

test('one tool covering two roles covers both - the second role does not buy a duplicate', () => {
  const kit = { gear: [
    gear({ id: 'both', intents: [INTENT.find, INTENT.prove], cost: 1, does: 'finds and proves' }),
    gear({ id: 'finder', intents: [INTENT.find], cost: 1, does: 'only finds' }),
    gear({ id: 'prover', intents: [INTENT.prove], cost: 1, does: 'only proves' }),
  ], gems: [], potions: [] };
  const s = spec('find and gate', kit, { slots: 2, budget: 2 });
  const ids = s.equipped.map(e => e.id);
  assert.ok(ids.includes('both'), 'the dual-role tool went in first');
  assert.deepEqual(s.uncovered, []);
  assert.ok(ids.includes('finder'),
    'the spare slot went to a redundant role-filler instead of the next-best tool: ' + ids.join(','));
});


test('THE KERNEL IS TOTAL - garbage in every argument returns a reading, never an exception', () => {
  // Pure kernels do not throw on garbage. A speccer that dies on a malformed catalogue turns a bad
  // config into a blank cockpit, and the didy that exists to explain itself explains nothing.
  const toxic = { toString() { throw new Error('toxic toString'); } };
  const junk = [undefined, null, NaN, Infinity, '', '   ', 0, -1, [], {}, true, toxic,
                { gear: null }, { gear: [null, 7, {}] }, { gear: [{ id: 'x' }] }];
  for (const task of junk) {
    for (const cat of junk) {
      for (const lim of [undefined, null, {}, { slots: -1, budget: NaN, potionBudget: 'lots' }]) {
        const s = spec(task, cat, lim);
        assert.ok(Array.isArray(s.equipped), 'no loadout came back');
        assert.ok(Number.isFinite(s.spent) && Number.isFinite(s.heat), 'the readings are not numbers');
        assert.ok(typeof readout(s) === 'string' && readout(s).length > 0);
        assert.ok(Array.isArray(cannot(s, cat)));
      }
    }
  }
  assert.deepEqual(readTask(toxic), []);
  assert.equal(scoreGear(toxic, null, null).score, 0);
  assert.ok(typeof readout(undefined) === 'string');
  assert.ok(Array.isArray(cannot(undefined, undefined)));
});

test('a malformed limit falls back to the default rather than becoming no limit at all', () => {
  const kit = { gear: [gear({ id: 'a', intents: [INTENT.find], cost: 99, does: 'finds' })], gems: [], potions: [] };
  const s = spec('find', kit, { budget: 'unlimited', slots: 'loads' });
  assert.equal(s.budget, 6, 'a nonsense budget must not read as infinite');
  assert.equal(s.slots, 4);
  assert.deepEqual(s.equipped, [], 'and the default ceiling must still be enforced');
});


test('a nonsense ceiling falls back to the default, it does not become no ceiling', () => {
  // Every one of these guards, wrong, reads as "unlimited" - the one failure mode a budget must
  // never have. A negative slot count that survives is an agent with an unbounded loadout.
  const kit = { gear: [gear({ id: 'a', intents: [INTENT.find], cost: 99, does: 'finds' })], gems: [], potions: [] };
  for (const bad of [-1, NaN, Infinity, -Infinity, 'lots', null, {}, []]) {
    const s = spec('find', kit, { budget: bad, slots: bad, potionBudget: bad });
    assert.equal(s.budget, 6, 'budget ' + String(bad) + ' became ' + s.budget);
    assert.equal(s.slots, 4, 'slots ' + String(bad) + ' became ' + s.slots);
    assert.equal(s.potionBudget, 2);
    assert.deepEqual(s.equipped, [], 'and the ceiling still bites');
  }
});

test('a hand-written catalogue entry with impossible numbers is normalised, not trusted', () => {
  // Gear built by gear() is validated. Gear that arrives as raw JSON - from a saved loadout, an
  // import, a page - is not, and a negative cost would pay the run to equip it.
  const s = spec('find', { gear: [{ id: 'raw', intents: ['find'], cost: -5, sockets: -2, does: 'sneaks in' }] },
    { slots: 4, budget: 6 });
  assert.ok(s.spent >= 0, 'a negative cost refunded the budget: ' + s.spent);
  assert.equal(s.equipped[0].sockets, 0, 'negative sockets became ' + s.equipped[0].sockets);
});

test('scoreGear survives being handed rubbish where a tool or a reading should be', () => {
  for (const g of [null, undefined, 'gear', 7, []]) {
    assert.equal(scoreGear(g, [{ intent: INTENT.find, weight: 1, hit: ['find'] }], new Set()).score, 0);
  }
  const real = gear({ id: 'a', intents: [INTENT.find], does: 'finds' });
  for (const w of [null, undefined, 'find', 7, [null, 'find', 7, {}]]) {
    assert.equal(scoreGear(real, w, new Set()).score, 0, 'a rubbish reading scored above zero');
  }
  assert.equal(scoreGear(real, [{ intent: INTENT.find, weight: NaN, hit: [] }], new Set()).score, 0,
    'a NaN weight poisoned the score');
});

test('the shadow and the readout survive a malformed spec object', () => {
  // These two are what the cockpit calls to draw itself. If either dies on a half-built spec, the
  // screen goes blank at exactly the moment the user needs to see what went wrong.
  for (const bad of [null, undefined, 'spec', 7, [], {}, { equipped: null }, { equipped: [null], passed: [null] }]) {
    assert.ok(Array.isArray(cannot(bad, { gear: [gear({ id: 'a', does: 'x' })] })), 'cannot() died on ' + JSON.stringify(bad));
    assert.equal(typeof readout(bad), 'string', 'readout() died on ' + JSON.stringify(bad));
  }
  assert.equal(typeof readout({ equipped: [], understood: true }), 'string', 'a spec with no reads blanked the readout');
  assert.equal(typeof readout({ equipped: [{ name: 'Thing' }], spent: 1, budget: 6, slotsUsed: 1, slots: 4, status: 'cool' }), 'string',
    'gear with no gems array blanked the readout');
});


// ─────────────────────────── the rig, and what actually levels up ───────────────────────────

test('a tool needing more model than the rig owns is RENTED, and says which', () => {
  const kit = { gear: [
    gear({ id: 'code', intents: [INTENT.find], cost: 1, mind: 0, does: 'is plain code' }),
    gear({ id: 'small', intents: [INTENT.find], cost: 1, mind: 1, does: 'wants a small model' }),
    gear({ id: 'big', intents: [INTENT.find], cost: 1, mind: 2, does: 'wants a large model' }),
  ], gems: [], potions: [] };
  const at = (rig) => spec('find', kit, { slots: 9, budget: 9, rig }).rented.map(r => r.id).sort();
  assert.deepEqual(at(0), ['big', 'small'], 'renting rig must rent everything with a mind');
  assert.deepEqual(at(1), ['big'], 'a small local model brings the small work home');
  assert.deepEqual(at(2), [], 'a large local model rents nothing');
});

test('SOVEREIGNTY RISES BECAUSE YOU BUILT SOMETHING, NOT BECAUSE YOU SPENT SOMETHING', () => {
  const kit = { gear: [
    gear({ id: 'code', intents: [INTENT.find], cost: 1, mind: 0, does: 'is plain code' }),
    gear({ id: 'small', intents: [INTENT.find], cost: 1, mind: 1, does: 'wants a small model' }),
    gear({ id: 'big', intents: [INTENT.find], cost: 1, mind: 2, does: 'wants a large model' }),
  ], gems: [], potions: [] };
  const s0 = spec('find', kit, { slots: 9, budget: 9, rig: 0 });
  const s1 = spec('find', kit, { slots: 9, budget: 9, rig: 1 });
  const s2 = spec('find', kit, { slots: 9, budget: 9, rig: 2 });
  assert.ok(s0.sovereignty < s1.sovereignty, 'building a small model did not move the number');
  assert.ok(s1.sovereignty < s2.sovereignty, 'building a large model did not move the number');
  assert.equal(s2.sovereignty, 1);
  assert.ok(Math.abs(s0.sovereignty - 1 / 3) < 1e-9, 'day one is not the third that is really yours: ' + s0.sovereignty);
});

test('sovereignty is weighted by what it costs you, not by how many things there are', () => {
  // Counting heads says the opposite of the invoice: three free local tools next to one expensive
  // rented one is not 75% sovereign if the rented one is most of the bill.
  const kit = { gear: [
    gear({ id: 'a', intents: [INTENT.find], cost: 0, mind: 0, does: 'free and local' }),
    gear({ id: 'b', intents: [INTENT.find], cost: 0, mind: 0, does: 'also free and local' }),
    gear({ id: 'c', intents: [INTENT.find], cost: 0, mind: 0, does: 'free and local too' }),
    gear({ id: 'rent', intents: [INTENT.find], cost: 6, mind: 2, does: 'rented and dear' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 9, rig: 0 });
  assert.equal(s.rented.length, 1);
  assert.equal(s.sovereignty, 0, 'three free tools made a rented bill look sovereign: ' + s.sovereignty);
});

test('AN EMPTY LOADOUT IS NOT 100% SOVEREIGN - it is no claim at all', () => {
  // A badge that cannot fail is not a badge. Carrying nothing rents nothing, and reading that as a
  // perfect score is how every meaningless green in this estate got printed.
  const s = spec('xylophone', { gear: [], gems: [], potions: [] });
  assert.equal(s.sovereignty, null, 'an empty build claimed a score of ' + s.sovereignty);
});

test('the sheet says what building the next rig would actually reclaim', () => {
  const kit = { gear: [
    gear({ id: 'small', name: 'Small Thing', intents: [INTENT.find], cost: 1, mind: 1, does: 'wants a small model' }),
    gear({ id: 'big', name: 'Big Thing', intents: [INTENT.find], cost: 1, mind: 2, does: 'wants a large model' }),
  ], gems: [], potions: [] };
  const s = spec('find', kit, { slots: 9, budget: 9, rig: 0 });
  assert.equal(s.nextRig.level, 1);
  assert.deepEqual(s.nextRig.wouldReclaim, ['Small Thing'], 'the next rig promised the wrong pieces');
  assert.equal(spec('find', kit, { slots: 9, budget: 9, rig: 2 }).nextRig, null, 'a maxed rig must promise nothing');
});

test('a rig level nobody could have is clamped, not trusted', () => {
  const kit = { gear: [gear({ id: 'big', intents: [INTENT.find], cost: 1, mind: 2, does: 'wants a large model' })], gems: [], potions: [] };
  for (const bad of [-5, 99, NaN, 'sovereign', null, 1.5]) {
    const s = spec('find', kit, { slots: 9, budget: 9, rig: bad });
    assert.ok(RIG.includes(s.rig), 'rig ' + String(bad) + ' produced ' + JSON.stringify(s.rig));
    if (bad !== 99) assert.equal(s.rented.length, 1, 'a nonsense rig granted sovereignty for free');
  }
});

test('gear claiming a mind that is not on the ladder is refused at definition time', () => {
  for (const bad of [3, -1, 1.5, 'big', null]) assert.throws(() => gear({ id: 'x', mind: bad }), /mind/);
  assert.equal(gear({ id: 'x' }).mind, 0, 'gear that says nothing is plain code, which is the safe default');
});

test('every rung of the ladder is described in words somebody could argue with', () => {
  for (const r of RIG) {
    assert.ok(r.blurb.length > 25, r.name + ' describes itself in a shrug: ' + r.blurb);
    assert.ok(Number.isInteger(r.holds));
  }
  for (const m of MIND) assert.ok(MIND_NAME[m].length > 15, 'mind ' + m + ' has no readable meaning');
});


test('the next rung is the NEXT one, and only if it would actually take work back', () => {
  const kit = { gear: [
    gear({ id: 'plain', intents: [INTENT.find], cost: 1, mind: 0, does: 'is plain code' }),
    gear({ id: 'big', intents: [INTENT.prove], cost: 1, mind: 2, does: 'wants a large model' }),
  ], gems: [], potions: [] };
  const onlyPlain = { ...kit, gear: [kit.gear[0]] };

  // Nothing rented: there is nothing to sell you. A ladder that always shows a next rung is an
  // upsell, not a progression - and this estate does not print upgrades that buy you nothing.
  assert.equal(spec('find', onlyPlain, { slots: 9, budget: 9, rig: 0 }).nextRig, null);
  assert.equal(spec('find', onlyPlain, { slots: 9, budget: 9, rig: 1 }).nextRig, null);

  // Rented at mind 2 while standing on rig 1: the next rung is 2, never the rung already owned.
  const s = spec('find and gate', kit, { slots: 9, budget: 9, rig: 1 });
  assert.equal(s.rented.length, 1);
  assert.equal(s.nextRig.level, 2, 'offered rig ' + s.nextRig.level + ' to somebody already on rig 1');
  assert.ok(s.nextRig.level > s.rig.level);
});
