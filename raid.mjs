// ════════════════════════════════════════════════════════════════
// raid.mjs · the didy specs ITSELF for the job.
//
// You do not pick the kit. You say what the raid is, and the didy reads the whole estate, works out
// what the job actually needs, and equips for it — gear into slots, gems into sockets, potions if
// the run can afford them. Then it shows you the spec, and the other half: what this build CANNOT
// do, which is the part a character sheet never tells you.
//
// The three gaming words map onto real things, and the mapping is the design:
//
//   GEAR    an organ of the estate — witness, fall-remember, offramp. Slots are scarce, so equipping
//           one is a decision that costs something rather than a checkbox nobody reads.
//   GEM     a modifier socketed INTO a piece of gear. It changes how that tool behaves — deeper,
//           stricter, local-only — and it costs socket space the gear does not have much of.
//   POTION  a consumable spent for one run: a bigger budget, one escalation to a frontier model.
//           Consumed means gone, which is what makes a budget a budget.
//
// ⚑ EVERY EQUIPPED THING CARRIES WHY IT IS EQUIPPED. A loadout nobody can interrogate is a loadout
// nobody can correct — and an auto-specced one that cannot say why it chose is worse than a manual
// one, because you cannot even blame yourself. The `why` is not decoration; it is the whole reason
// this is trustworthy enough to let an agent do.
//
// Pure and total: no I/O, no clock, no randomness. The same task against the same catalogue always
// specs the same build, so a spec can be diffed, replayed, and argued with.
// ════════════════════════════════════════════════════════════════

export const KAPPA = (Math.sqrt(5) - 1) / 2;      // the burn line: spend past it and the run is hot

// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE THAT ACTUALLY LEVELS UP.
//
// Everybody starts renting. Day one every piece of thinking goes out to somebody else's frontier
// model on somebody else's electric, and the bill is the bill. What a player builds over months is
// not a bigger loadout — it is a RIG: their own models, on their own machine, good enough to take
// work back off the rented one. So the number that moves is the share of this raid that runs on
// your own electric, and it moves because you built something, not because you paid.
//
// MIND is what a tool takes to run. RIG is the biggest mind you own. Anything above your rig gets
// rented, and the sheet says exactly which pieces and exactly what fraction — a claim you can check
// against your own bill, which is the only reason to trust it.
export const MIND = Object.freeze([0, 1, 2]);
export const MIND_NAME = Object.freeze({
  0: 'no model — plain deterministic code, always yours',
  1: 'a small model — the kind that runs on a laptop',
  2: 'a large model — the reasoning a small one genuinely cannot do',
});
export const RIG = Object.freeze([
  { level: 0, name: 'Renting',   holds: 0, blurb: 'no model of your own yet — every piece of thinking is rented' },
  { level: 1, name: 'Own Forge', holds: 1, blurb: 'a small model running locally: the grunt work comes home' },
  { level: 2, name: 'Sovereign', holds: 2, blurb: 'a large model of your own: nothing has to leave unless you send it' },
]);
export const rigAt = (level) => RIG[Math.max(0, Math.min(RIG.length - 1, Number.isInteger(level) ? level : 0))];      // the burn line: spend past it and the run is hot

// What a piece of gear is FOR. A task names intents; gear declares them; the match is the spec.
export const INTENT = Object.freeze({
  find: 'find', prove: 'prove', remember: 'remember', build: 'build',
  watch: 'watch', judge: 'judge', move: 'move', explain: 'explain',
});
const INTENTS = new Set(Object.values(INTENT));

// The words that actually appear when somebody describes a job, mapped to what the job NEEDS.
// Deliberately small and readable: a matcher nobody can read is a matcher nobody can correct.
const CUES = Object.freeze({
  [INTENT.find]:     ['find', 'search', 'sweep', 'audit', 'scan', 'where', 'which', 'locate', 'survey'],
  [INTENT.prove]:    ['prove', 'gate', 'test', 'verify', 'check', 'clean', 'mutation', 'evidence'],
  [INTENT.remember]: ['remember', 'memory', 'recall', 'history', 'past', 'session', 'log', 'note'],
  [INTENT.build]:    ['build', 'make', 'write', 'ship', 'create', 'add', 'implement', 'fix'],
  [INTENT.watch]:    ['watch', 'monitor', 'live', 'browse', 'page', 'site', 'observe', 'screenshot'],
  [INTENT.judge]:    ['judge', 'review', 'grade', 'score', 'rank', 'assess', 'compare', 'critique'],
  [INTENT.move]:     ['push', 'publish', 'deploy', 'commit', 'release', 'send', 'move'],
  [INTENT.explain]:  ['explain', 'why', 'report', 'summarise', 'summarize', 'tell', 'describe'],
});

// A value can refuse to become a string: an object whose toString throws takes the whole reader
// down with it. Reading a job is the first thing that happens, so it has to survive anything.
const text = (v) => { try { return String(v ?? ''); } catch { return ''; } };
const words = (s) => text(s).toLowerCase().match(/[a-z0-9:+-]+/g) || [];

/**
 * What does this job need? Returns each intent with the cues that fired, so the didy can say WHY it
 * read the task that way — and so you can see immediately when it read it wrong.
 */
export function readTask(task) {
  const w = new Set(words(task));
  const wanted = [];
  for (const [intent, cues] of Object.entries(CUES)) {
    const hit = cues.filter(c => w.has(c));
    if (hit.length) wanted.push({ intent, hit, weight: hit.length });
  }
  wanted.sort((a, b) => b.weight - a.weight || a.intent.localeCompare(b.intent));
  return wanted;
}

/** Declare a piece of gear. `intents` is what it is for; `cost` is what a slot of it burns. */
export function gear({ id, name, intents = [], cost = 1, sockets = 0, does = '', needs = [], keys = [], mind = 0 } = {}) {
  if (typeof id !== 'string' || !id) throw new Error('gear needs an id');
  for (const i of intents) if (!INTENTS.has(i)) throw new Error(`${id}: ${JSON.stringify(i)} is not an intent`);
  if (!Number.isFinite(cost) || cost < 0) throw new Error(`${id}: cost must be a non-negative number`);
  if (!Number.isInteger(sockets) || sockets < 0) throw new Error(`${id}: sockets must be a whole number`);
  if (!MIND.includes(mind)) throw new Error(`${id}: mind must be one of ${MIND.join(', ')} — how much model it takes to run`);
  return Object.freeze({
    id, name: name || id, intents: Object.freeze([...intents]), cost, sockets,
    does: String(does || ''), needs: Object.freeze([...needs]),
    keys: Object.freeze(keys.map(k => String(k).toLowerCase())), mind,
  });
}

/** A gem modifies one piece of gear. `fits` limits which gear it can go into. */
export function gem({ id, name, fits = [], cost = 0, does = '' } = {}) {
  if (typeof id !== 'string' || !id) throw new Error('a gem needs an id');
  if (!Number.isFinite(cost) || cost < 0) throw new Error(`${id}: cost must be a non-negative number`);
  return Object.freeze({ id, name: name || id, fits: Object.freeze([...fits]), cost, does: String(does || '') });
}

/** A potion is spent for one run and then gone. That is what makes a budget mean anything. */
export function potion({ id, name, cost = 1, does = '', grants = [] } = {}) {
  if (typeof id !== 'string' || !id) throw new Error('a potion needs an id');
  if (!Number.isFinite(cost) || cost < 0) throw new Error(`${id}: cost must be a non-negative number`);
  return Object.freeze({ id, name: name || id, cost, does: String(does || ''), grants: Object.freeze([...grants]) });
}

/** How well this gear serves the job, and the reason — never a bare number. */
export const NAMED = 2;      // what a direct hit on the gear's own vocabulary is worth

/**
 * ⚑ A JOB THAT NAMES A TOOL OUTRANKS A JOB THAT MERELY IMPLIES ONE. Scoring on intent alone made
 * "which builds have no gate" equip the badge-stamper over the gate itself: both serve `prove`, and
 * the stamper was a slot cheaper. When the task uses a tool's own word, that is the strongest signal
 * in the sentence and it has to beat a tie-break on price.
 */
export function scoreGear(g, wanted, said) {
  if (!g || typeof g !== 'object') return { score: 0, why: '', matched: [], named: [] };
  const w = Array.isArray(wanted) ? wanted.filter(x => x && typeof x === 'object') : [];
  const heard = said instanceof Set ? said : new Set();
  const intents = Array.isArray(g.intents) ? g.intents : [];
  const keys = Array.isArray(g.keys) ? g.keys : [];
  const matched = w.filter(x => intents.includes(x.intent));
  const named = keys.filter(k => heard.has(k));
  if (!matched.length && !named.length) return { score: 0, why: '', matched: [], named: [] };
  const score = matched.reduce((s, m) => s + (Number.isFinite(m.weight) ? m.weight : 0), 0) + named.length * NAMED;
  const parts = [];
  if (matched.length) {
    parts.push(`the job asks to ${matched.map(m => m.intent).join(' and ')} `
      + `(${matched.flatMap(m => m.hit).join(', ')})`);
  }
  if (named.length) parts.push(`the job names it directly (${named.join(', ')})`);
  const why = `${parts.join(', and ')}, and this ${g.does || 'serves that'}`;
  return { score, why, matched: matched.map(m => m.intent), named };
}

/**
 * SPEC THE BUILD. The didy reads the task, scores every piece of gear against it, and fills the
 * slots it can afford — best first, and never past the budget.
 *
 * ⚑ GEAR WHOSE PREREQUISITE IS NOT EQUIPPED IS REFUSED, not quietly equipped. A tool that needs
 * another tool and does not get it is worse than absent: it looks equipped and does nothing, which
 * is the dead-control failure this estate keeps finding on its own pages.
 *
 * ⚑ AND THE BUDGET IS A HARD CEILING, not a suggestion. An auto-specced build that can talk itself
 * over budget is an agent choosing its own resource limit, which is not a limit.
 */
export function spec(task, catalogue, limits) {
  // Total on any input. A kernel that throws on a malformed catalogue turns a bad config into a
  // blank screen, and the didy that was supposed to explain itself explains nothing.
  const list = (v) => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && typeof x.id === 'string') : []);
  const num = (v, dflt) => (Number.isFinite(v) && v >= 0 ? v : dflt);
  const cat = (catalogue && typeof catalogue === 'object') ? catalogue : {};
  const l = (limits && typeof limits === 'object') ? limits : {};
  const slots = Number.isInteger(l.slots) ? num(l.slots, 4) : 4;
  const rig = rigAt(l.rig);
  const budget = num(l.budget, 6);
  const potionBudget = num(l.potionBudget, 2);

  const wanted = readTask(task);
  const said = new Set(words(task));
  const allGear = list(cat.gear).map(g => ({ ...g, intents: Array.isArray(g.intents) ? g.intents : [],
    needs: Array.isArray(g.needs) ? g.needs : [], keys: Array.isArray(g.keys) ? g.keys : [],
    cost: num(g.cost, 0), sockets: Number.isInteger(g.sockets) ? num(g.sockets, 0) : 0,
    mind: MIND.includes(g.mind) ? g.mind : 0 }));
  const allGems = list(cat.gems).map(j => ({ ...j, fits: Array.isArray(j.fits) ? j.fits : [], cost: num(j.cost, 0) }));
  const allPotions = list(cat.potions).map(p => ({ ...p, grants: Array.isArray(p.grants) ? p.grants : [], cost: num(p.cost, 0) }));

  const ranked = allGear
    .map(g => ({ g, ...scoreGear(g, wanted, said) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.g.cost - b.g.cost || a.g.id.localeCompare(b.g.id));

  const equipped = [];
  const passed = [];
  let spent = 0;

  const byId = new Map(allGear.map(g => [g.id, g]));

  /**
   * Everything that must go in for this one piece of gear to actually work: itself, plus any
   * prerequisite not already equipped, plus THEIR prerequisites. Returns null if the chain reaches
   * something the catalogue does not contain, or loops back on itself.
   */
  const closure = (g, seen = new Set()) => {
    if (seen.has(g.id)) return null;                       // a needs-cycle is a broken catalogue
    seen.add(g.id);
    const out = [];
    for (const n of g.needs) {
      if (equipped.some(e => e.id === n)) continue;
      const dep = byId.get(n);
      if (!dep) return null;                               // needs a tool nobody has
      const sub = closure(dep, seen);
      if (!sub) return null;
      out.push(...sub);
    }
    out.push(g);
    return out;
  };

  /**
   * ⚑ ALL-OR-NOTHING, AND COUNTED AFTER THE CHAIN IS KNOWN. The first version checked the slot and
   * budget ceilings against the one piece of gear asked for, and only then went looking for its
   * prerequisites — so a tool plus the tool it needs went two into one slot and the ceiling that
   * was supposed to be hard silently was not. A limit checked before you know the full cost is not
   * a limit. Nothing is committed until the whole chain is known to fit.
   */
  // One tool, one reason. The coverage pass and the fill pass both consider the same catalogue, so
  // without this a piece of gear appears twice in the shadow — the same refusal read as two.
  const refuse = (id, why, score) => { if (!passed.some(p => p.id === id)) passed.push({ id, why, score }); return false; };

  const take = (entry) => {
    const { g, score, why, matched } = entry;
    if (equipped.some(e => e.id === g.id)) return true;   // already in, and that is a covered role
    const chain = closure(g);
    if (!chain) return refuse(g.id, `needs ${g.needs.join(', ')}, which nothing here can supply`, score);
    if (equipped.length + chain.length > slots) {
      return refuse(g.id, chain.length > 1
        ? `it and the ${chain.length - 1} tool(s) it needs will not fit the slots left`
        : 'no slot left', score);
    }
    const price = chain.reduce((a, c) => a + c.cost, 0);
    if (spent + price > budget) {
      return refuse(g.id, chain.length > 1
        ? `it and what it needs would cost ${price}, and only ${budget - spent} is left`
        : `would cost ${g.cost}, and only ${budget - spent} is left`, score);
    }
    for (const c of chain) {
      const own = c.id === g.id;
      equipped.push({
        id: c.id, name: c.name, cost: c.cost, sockets: c.sockets,
        score: own ? score : 0,
        why: own ? why : `carried because ${g.name} needs it, and ${c.does || 'it is required'}`,
        serves: own ? matched : [], gems: [], mind: c.mind,
        // Rented means this piece needs more model than the rig owns, so it goes out to somebody
        // else's machine and somebody else's bill. Stated per piece, because "40% rented" that you
        // cannot break down into which parts is a number nobody can act on.
        rented: c.mind > rig.holds,
      });
      spent += c.cost;
    }
    return true;
  };

  for (const w of wanted) {
    // FALL DOWN THE LIST, DO NOT GIVE UP ON THE ROLE. Taking only the single best candidate meant
    // that if the strongest tool for a role could not fit the slots or the purse, the role went
    // uncovered, while a cheaper tool that would have covered it sat right underneath in the
    // ranking. A party missing a healer because the best healer was expensive is a bad party.
    for (const r of ranked) {
      if (!r.matched.includes(w.intent)) continue;
      // take() answers "is this role now covered" — including when the tool was already equipped for
      // an earlier role, since one tool covering two roles is a covered role, not a free slot.
      if (take(r)) break;
    }
  }

  for (const entry of ranked) take(entry);

  // Gems go into the gear already equipped, best fit first, still inside the same budget.
  for (const j of allGems) {
    const host = equipped.find(e => (j.fits.length === 0 || j.fits.includes(e.id)) && e.gems.length < e.sockets);
    if (!host) continue;
    if (spent + j.cost > budget) continue;
    host.gems.push({ id: j.id, name: j.name, does: j.does, cost: j.cost });
    spent += j.cost;
  }

  // Potions last, out of their own purse: a consumable must never eat the gear budget.
  const drunk = [];
  let potionSpent = 0;
  for (const p of allPotions) {
    const relevant = p.grants.some(gr => wanted.some(w => w.intent === gr));
    if (!relevant) continue;
    if (potionSpent + p.cost > potionBudget) continue;
    drunk.push({ id: p.id, name: p.name, does: p.does, cost: p.cost });
    potionSpent += p.cost;
  }

  const heat = budget > 0 ? spent / budget : 0;
  // ⚑ A SPEC THAT READ NOTHING MUST NOT REPORT 'COOL'. An empty loadout burns no budget, so a
  // spend-based reading calls it healthy — the didy walks in carrying nothing and the HUD shows
  // green. Not understanding the job and not needing much are opposite states and must never print
  // the same word.
  const understood = wanted.length > 0;
  // A role the job named that nothing in the loadout serves. Said plainly, because a build that
  // silently cannot do a third of the job is the failure this whole sheet exists to prevent.
  // ── the sovereignty read ──────────────────────────────────────────────────────────────────
  // Weighted by cost, not by count: one expensive rented organ is more of your bill than three
  // free local ones, and a headline that counts heads would say the opposite of the invoice.
  const rented = equipped.filter(e => e.rented);
  const weigh = (list) => list.reduce((a, e) => a + e.cost, 0);
  const totalWeight = weigh(equipped);
  const rentedWeight = weigh(rented);
  // Nothing equipped is not 100% sovereign — it is nothing, and saying "100%" there would be the
  // exact badge-that-cannot-fail this estate keeps finding. No loadout, no claim.
  const sovereignty = equipped.length === 0 ? null
    : totalWeight === 0 ? (rented.length ? 0 : 1)
    : 1 - rentedWeight / totalWeight;
  // No level comparison here on purpose: a piece is only "rented" when its mind is ABOVE what this
  // rig holds, so no rung at or below the current one can ever reclaim it. Testing for it as well
  // read like a safety check and was a condition that could never once decide anything.
  const nextRig = RIG.find(r => rented.some(e => e.mind <= r.holds)) || null;

  const served = new Set(equipped.flatMap(e => e.serves));
  const uncovered = wanted.map(w => w.intent).filter(i => !served.has(i));
  const status = !understood ? 'read nothing in the job'
    : !equipped.length ? 'nothing carried covers this job'
    : uncovered.length ? 'cannot ' + uncovered.join('/') + ' - nothing equipped serves it'
    : heat <= KAPPA ? 'cool' : heat < 1 ? 'hot' : 'at the ceiling';
  return {
    task: text(task),
    reads: wanted,
    equipped, gems: equipped.flatMap(e => e.gems.map(g => ({ ...g, in: e.id }))),
    potions: drunk,
    passed,
    spent, budget, potionSpent, potionBudget,
    slotsUsed: equipped.length, slots,
    heat, understood, uncovered,
    rig, sovereignty, rented: rented.map(e => ({ id: e.id, name: e.name, mind: e.mind, cost: e.cost })),
    // What building the next rig would actually buy you, in the only currency that matters here:
    // the pieces that would stop being rented. Null when nothing you own would change.
    nextRig: nextRig && { ...nextRig, wouldReclaim: rented.filter(e => e.mind <= nextRig.holds).map(e => e.name) },
    // Past κ the run is burning hot: it will finish, but there is no room left for a surprise.
    status,
  };
}

/**
 * THE OTHER HALF. Everything in the catalogue this build did NOT take, and why — the shadow of the
 * spec. A character sheet shows what you can do; this shows what this particular build cannot, which
 * is the thing you actually need before you walk into the raid.
 */
export function cannot(specced, catalogue) {
  const s = (specced && typeof specced === 'object') ? specced : {};
  const cat = (catalogue && typeof catalogue === 'object') ? catalogue : {};
  const on = new Set((Array.isArray(s.equipped) ? s.equipped : []).map(e => e && e.id));
  const reason = new Map((Array.isArray(s.passed) ? s.passed : []).map(p => [p && p.id, p && p.why]));
  return (Array.isArray(cat.gear) ? cat.gear : []).filter(g => g && typeof g.id === 'string')
    .filter(g => !on.has(g.id))
    .map(g => ({
      id: g.id, name: g.name, does: g.does,
      why: reason.get(g.id) || 'nothing in the job asked for it',
      kind: reason.has(g.id) ? 'left behind' : 'not needed',
    }));
}

/** One line a person can read, for the top of the HUD. */
export function readout(specced) {
  const s = (specced && typeof specced === 'object') ? specced : {};
  const on = (Array.isArray(s.equipped) ? s.equipped : []).filter(e => e && typeof e === 'object');
  if (!on.length) {
    return s.understood
      ? `nothing equipped — the job reads as ${(s.reads || []).map(r => r.intent).join('/')}, and nothing carried serves that`
      : `nothing equipped — nothing in the job read as a job this didy knows how to do`;
  }
  return `${on.map(e => text(e.name) + ((e.gems || []).length ? ` (${e.gems.filter(Boolean).map(g => text(g.name)).join(', ')})` : '')).join(' · ')}`
    + `  —  ${s.spent}/${s.budget} spent, ${s.slotsUsed}/${s.slots} slots, ${s.status}`;
}

export default { KAPPA, INTENT, readTask, gear, gem, potion, scoreGear, spec, cannot, readout };

// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE PARTY. Two didys hooking up for the same job.
//
// ⚑ WHAT POOLS IS THE RIG, NOT THE SLOTS. It would be easy — and wrong — to make a party simply add
// its members' slots and budgets together, because then partying up is just a bigger single player
// and nobody has a reason to bring anybody specific. What actually pools is whose machine the work
// runs on: if one member owns a large local model, the party can host the heavy thinking on THEIR
// electric instead of renting it, and everybody's rented share falls. That is a real reason to find
// somebody who built something you did not.
//
// ⚑ AND THE PARTY'S SHADOW IS COMPUTED, NEVER ASSUMED. A group that believes it is covered because
// somebody surely brought the gate is more dangerous than one person who knows they did not. So the
// roles the job named and nobody covered are named, out loud, before the party goes anywhere.

/** Who in the party can host a piece of work of this mind, cheapest rig first. */
export function hostFor(mind, members) {
  if (!MIND.includes(mind)) return null;
  const able = (Array.isArray(members) ? members : [])
    .filter(m => m && typeof m === 'object' && rigAt(m.rig && m.rig.level).holds >= mind);
  if (!able.length) return null;
  // The lightest rig that can carry it: a party should not put every job on its one big machine.
  return able.reduce((a, b) => (rigAt(a.rig && a.rig.level).holds <= rigAt(b.rig && b.rig.level).holds ? a : b));
}

/**
 * Form a party out of already-specced members. Each member is what spec() returned, plus a `who`.
 * Nothing here re-specs anybody: a party must not quietly change what somebody brought.
 */
export function party(members, catalogue, task) {
  const list = (Array.isArray(members) ? members : [])
    .filter(m => m && typeof m === 'object' && Array.isArray(m.equipped))
    .map((m, i) => ({ ...m, who: typeof m.who === 'string' && m.who ? m.who : `didy ${i + 1}` }));
  const cat = (catalogue && typeof catalogue === 'object') ? catalogue : {};
  const wanted = readTask(task !== undefined ? task : (list[0] && list[0].task));

  // Every role the job named, and every member who actually brought something serving it.
  const roles = wanted.map(w => ({
    intent: w.intent,
    by: list.filter(m => m.equipped.some(e => (e.serves || []).includes(w.intent))).map(m => m.who),
  }));
  const uncovered = roles.filter(r => !r.by.length).map(r => r.intent);

  // Overlap is not teamwork. Two people bringing the same organ for the same role is a slot the
  // party paid for twice, and saying so is how a group learns to complement instead of duplicate.
  const seen = new Map();
  for (const m of list) for (const e of m.equipped) {
    if (!seen.has(e.id)) seen.set(e.id, { id: e.id, name: e.name, by: [] });
    seen.get(e.id).by.push(m.who);
  }
  const doubled = [...seen.values()].filter(x => x.by.length > 1);

  // Who hosts what. A piece rented by its owner is reclaimed the moment somebody in the party owns
  // a rig big enough to run it — that is the whole point of standing next to each other.
  const hosted = [];
  let ownWeight = 0, rentWeight = 0, ownCount = 0, rentCount = 0;
  for (const m of list) for (const e of m.equipped) {
    const h = hostFor(e.mind, list);
    const w = Number.isFinite(e.cost) ? e.cost : 0;
    if (h) { ownWeight += w; ownCount += 1; if (e.rented) hosted.push({ id: e.id, name: e.name, from: m.who, host: h.who }); }
    else { rentWeight += w; rentCount += 1; }
  }
  const total = ownWeight + rentWeight;
  // ⚑ WHEN EVERYTHING IS FREE, WEIGHT CANNOT TELL YOU ANYTHING. Falling back on the weight of what
  // is rented reads a kit of free-but-rented tools as perfectly sovereign — a score that cannot
  // fail, on the one number this whole room is about. With no prices to weigh, count heads instead.
  const sovereignty = !seen.size ? null
    : total === 0 ? (ownCount + rentCount === 0 ? null : ownCount / (ownCount + rentCount))
    : ownWeight / total;

  const covered = new Set(list.flatMap(m => m.equipped.flatMap(e => e.serves || [])));
  const gear = Array.isArray(cat.gear) ? cat.gear.filter(g => g && typeof g.id === 'string') : [];
  return {
    members: list.map(m => ({ who: m.who, rig: m.rig, brought: m.equipped.map(e => e.name), sovereignty: m.sovereignty })),
    roles, uncovered, doubled, hosted, sovereignty,
    // Between them, still nobody's: the party's own shadow, not any one member's.
    cannot: gear.filter(g => !seen.has(g.id)).map(g => ({ id: g.id, name: g.name, does: g.does })),
    covered: [...covered],
    task: text(task !== undefined ? task : (list[0] && list[0].task)),
  };
}
