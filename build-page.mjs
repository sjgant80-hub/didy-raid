// Builds index.html by INLINING the real kernel — not a copy of it, not a stub that looks like it.
//
// ⚑ The page must run the code the gate proved. A hand-written second implementation on the page is
// how a build ships green and behaves differently in front of a person: the gate marks the kernel,
// the visitor uses the twin, and nothing connects the two. So the page is generated, and CI checks
// that regenerating it produces no diff — which is the check that catches the other half of the
// trap, editing the kernel and forgetting the page.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');

// Strip the import/export wire so two modules can live in one inline script, and nothing else.
const inline = (src) => src
  .replace(/^\s*import\s[^\n]*\n/gm, '')
  .replace(/^export\s+(const|function|class|let|async)\s/gm, '$1 ')
  // `export default { ... }` can span a whole object literal, so a line-anchored strip leaves the
  // keyword behind and the entire page stops parsing — one dead token, and the app is a screenshot.
  .replace(/^export\s+default\s[^\n]*\n/gm, '')
  .replace(/^export\s*\{[^}]*\};?[^\n]*\n/gm, '');

const kernel = inline(read('raid.mjs'));
const kit = inline(read('estate-kit.mjs'));
const shell = read('page.html');

const out = shell.replace('/*__KERNEL__*/', () => kernel + '\n\n' + kit);
if (out.includes('/*__KERNEL__*/')) throw new Error('the kernel never went in — the page would ship inert');
if (!out.includes('function spec(')) throw new Error('spec() is not in the page — the cockpit would have nothing to run');

// ⚑ THE PAGE MUST PARSE, AND THE BUILD IS WHERE THAT IS DECIDED. A single surviving module keyword
// is a SyntaxError, and a SyntaxError in the only script means the page loads, renders the shell,
// and does nothing at all — which looks exactly like a working page in a screenshot.
const script = out.slice(out.indexOf('<script type="module">'), out.lastIndexOf('</script>'));
const stray = script.match(/^\s*(export|import)\s/m);
if (stray) throw new Error(`a module keyword survived inlining: ${JSON.stringify(stray[0].trim())} — the page would not parse`);
try { new (await import('node:vm')).Script(script.replace('<script type="module">', '')); }
catch (e) { throw new Error(`the page script does not parse: ${e.message}`); }
writeFileSync(join(here, 'index.html'), out);
console.log(`index.html built — ${(out.length / 1024).toFixed(1)}kb, kernel inlined from raid.mjs + estate-kit.mjs`);
