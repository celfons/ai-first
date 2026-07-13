#!/usr/bin/env node
// Valida o manifesto do plugin ai-first e o inventário de componentes — COMO TESTE.
// Zero dependências. Sai com código != 0 em qualquer falha (serve de gate no CI).
//   node scripts/validate-plugin.mjs
//
// Checa:
//  1. .claude-plugin/plugin.json      — campos obrigatórios, name kebab-case, version semver.
//  2. .claude-plugin/marketplace.json — name/owner.name/plugins[], source, e o plugin resolve.
//  3. agents/*.md                     — TODO arquivo é um subagente válido (frontmatter name+description);
//                                       pega "componente-fantasma" (ex.: um README sem frontmatter).
//  4. skills/*/SKILL.md               — TODA skill válida (frontmatter name+description).
//  5. Autoritativo (se o CLI `claude` existir): `claude --plugin-dir . plugin details <name>` carrega
//     o plugin e não lista nenhum agente inválido.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { errors.push(m); console.log(`  ✗ ${m}`); };
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { bad(`${rel} não existe`); return null; }
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { bad(`${rel} não é JSON válido: ${e.message}`); return null; }
}

// Extrai as chaves escalares de topo do frontmatter YAML (entre a 1ª e a 2ª linha `---`).
function frontmatterKeys(file) {
  const txt = readFileSync(file, 'utf8');
  if (!txt.startsWith('---')) return null;
  const end = txt.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = txt.slice(3, end);
  const keys = {};
  for (const line of block.split('\n')) {
    const m = /^([A-Za-z0-9_-]+):(.*)$/.exec(line); // só chaves de topo (sem indentação)
    if (m) keys[m[1]] = m[2].trim();
  }
  return keys;
}

console.log('== 1. plugin.json ==');
const plugin = readJson('.claude-plugin/plugin.json');
let pluginName = null;
if (plugin) {
  if (!plugin.name) bad('plugin.json: falta "name" (obrigatório)');
  else if (!KEBAB.test(plugin.name)) bad(`plugin.json: "name" não é kebab-case: ${plugin.name}`);
  else { pluginName = plugin.name; ok(`name = ${plugin.name}`); }
  if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) bad(`plugin.json: "version" não é semver: ${plugin.version}`);
  else if (plugin.version) ok(`version = ${plugin.version}`);
  if (!plugin.description) bad('plugin.json: falta "description" (recomendado)');
  if (plugin.author && !plugin.author.name) bad('plugin.json: "author" presente sem "author.name"');
}

console.log('== 2. marketplace.json ==');
const mkt = readJson('.claude-plugin/marketplace.json');
if (mkt) {
  if (!mkt.name || !KEBAB.test(mkt.name)) bad(`marketplace.json: "name" ausente ou não-kebab: ${mkt.name}`);
  else ok(`marketplace = ${mkt.name}`);
  if (!mkt.owner || !mkt.owner.name) bad('marketplace.json: falta "owner.name"');
  if (!Array.isArray(mkt.plugins) || mkt.plugins.length === 0) bad('marketplace.json: "plugins" vazio/ausente');
  else {
    for (const p of mkt.plugins) {
      if (!p.name || !KEBAB.test(p.name)) bad(`marketplace: plugin com "name" inválido: ${p.name}`);
      if (!p.source) bad(`marketplace: plugin ${p.name} sem "source"`);
      if (typeof p.source === 'string' && p.source.startsWith('.')) {
        const dir = join(ROOT, p.source);
        if (!existsSync(dir)) bad(`marketplace: source "${p.source}" não existe`);
        else ok(`plugin "${p.name}" · source ${p.source}`);
      }
    }
    if (pluginName && !mkt.plugins.some((p) => p.name === pluginName))
      bad(`marketplace: nenhum plugin com name "${pluginName}" (bate com plugin.json)`);
  }
}

console.log('== 3. agents/ (todo .md é um subagente válido) ==');
const agentsDir = join(ROOT, 'agents');
let nAgents = 0;
if (!existsSync(agentsDir)) bad('agents/ não existe (o plugin precisa dele na raiz)');
else for (const f of readdirSync(agentsDir)) {
  if (!f.endsWith('.md')) continue;
  const fm = frontmatterKeys(join(agentsDir, f));
  const nm = basename(f, '.md');
  if (!fm) { bad(`agents/${f}: sem frontmatter — NÃO é um subagente (mova docs para fora de agents/)`); continue; }
  if (!fm.name) bad(`agents/${f}: frontmatter sem "name"`);
  else if (fm.name !== nm) bad(`agents/${f}: name "${fm.name}" != arquivo "${nm}"`);
  if (!fm.description) bad(`agents/${f}: frontmatter sem "description"`);
  if (fm.name && fm.description && fm.name === nm) nAgents++;
}
if (!errors.length || nAgents) ok(`${nAgents} subagentes válidos`);

console.log('== 4. skills/*/SKILL.md ==');
const skillsDir = join(ROOT, 'skills');
let nSkills = 0;
if (!existsSync(skillsDir)) bad('skills/ não existe');
else for (const d of readdirSync(skillsDir)) {
  const skillFile = join(skillsDir, d, 'SKILL.md');
  if (!statSync(join(skillsDir, d)).isDirectory()) continue;
  if (!existsSync(skillFile)) { bad(`skills/${d}: falta SKILL.md`); continue; }
  const fm = frontmatterKeys(skillFile);
  if (!fm || !fm.name) bad(`skills/${d}/SKILL.md: frontmatter sem "name"`);
  else if (fm.name !== d) bad(`skills/${d}: name "${fm.name}" != pasta "${d}"`);
  if (!fm || !fm.description) bad(`skills/${d}/SKILL.md: frontmatter sem "description"`);
  if (fm && fm.name === d && fm.description) nSkills++;
}
ok(`${nSkills} skills válidas`);

console.log('== 5. validação autoritativa (CLI claude, se disponível) ==');
try {
  execFileSync('claude', ['--version'], { stdio: 'ignore' });
  const out = execFileSync('claude', ['--plugin-dir', ROOT, 'plugin', 'details', pluginName || 'ai-first'],
    { encoding: 'utf8' });
  const line = (out.split('\n').find((l) => l.trim().startsWith('Agents')) || '');
  if (/\bREADME\b/.test(line)) bad('CLI: "README" aparece como agente (componente-fantasma em agents/)');
  else ok(`CLI carregou o plugin · ${line.trim()}`);
} catch (e) {
  console.log('  – CLI `claude` indisponível aqui; validação estrutural acima é o gate.');
}

console.log('');
if (errors.length) {
  console.error(`✗ FALHOU: ${errors.length} problema(s) no manifesto/plugin.`);
  process.exit(1);
}
console.log('✓ Plugin ai-first válido (manifesto + componentes).');
