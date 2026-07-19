#!/usr/bin/env node
// Lint de COERÊNCIA cruzada dos docs do método ai-first — combate o DRIFT (doc que contradiz a
// fonte de verdade). Zero dependências. Sai != 0 em qualquer ERRO (serve de gate no CI).
//   node scripts/check-coherence.mjs
//
// Checa (determinístico, baixo falso-positivo):
//   A. ADR ↔ índice   — todo docs/adr/NNNN-*.md tem linha no README de ADRs, e vice-versa.
//   B. ADR-NNNN resolve — toda menção "ADR-NNNN" no repo aponta para um arquivo de ADR existente.
//   C. Agente resolve  — `agents/x` (em crase) e "subagente `x`" apontam para um agents/x.md real.
//   D. Skill resolve   — `skills/x` (em crase) aponta para uma skill real.
//   E. Knobs críticos  — todo knob que o loop autônomo depende está DEFINIDO no genoma §8.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { errors.push(m); console.log(`  ✗ ${m}`); };

// Knobs que o loop autônomo depende — DEVEM existir no genoma §8 (guard de regressão, Insight #3).
const CRITICAL_KNOBS = [
  'features_per_day', 'parallelism', 'wip_limit', 'ready_backlog_cap', 'proposal_ttl',
  'autonomy_level', 'daily_budget', 'budget_per_feature', 'growth_experiments_per_cycle',
  'canary_pct', 'guardrail_metrics', 'external_action_cap', 'verification_mode',
  'uncertainty_escalation', 'bdd_style', 'fast_path',
];

// ---- coleta de markdown (exclui dist/, node_modules, .git) ----------------------------------------
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (e.endsWith('.md')) acc.push(p);
  }
  return acc;
}
const MD = walk(ROOT);
const rel = (p) => p.slice(ROOT.length + 1);

// ---- inventário autoritativo ----------------------------------------------------------------------
const AGENTS = new Set(
  readdirSync(join(ROOT, 'agents')).filter((f) => f.endsWith('.md')).map((f) => basename(f, '.md')));
const SKILLS = new Set(
  readdirSync(join(ROOT, 'skills')).filter((d) => existsSync(join(ROOT, 'skills', d, 'SKILL.md'))));
const ADR_FILES = new Set(
  readdirSync(join(ROOT, 'docs/adr')).filter((f) => /^\d{4}-.*\.md$/.test(f)).map((f) => f.slice(0, 4)));

// knobs do genoma: tokens snake_case em crase na §8 de project.md
const genome = readFileSync(join(ROOT, 'docs/ai-first/project.md'), 'utf8');
const KNOBS = new Set([...genome.matchAll(/`([a-z][a-z0-9_]*)`/g)].map((m) => m[1]));

// ---- A. ADR ↔ índice ------------------------------------------------------------------------------
console.log('== A. ADR ↔ índice ==');
const adrReadme = readFileSync(join(ROOT, 'docs/adr/README.md'), 'utf8');
const INDEXED = new Set([...adrReadme.matchAll(/\[(\d{4})\]\(\d{4}-[^)]+\)/g)].map((m) => m[1]));
for (const n of ADR_FILES) if (!INDEXED.has(n)) bad(`ADR-${n} existe em docs/adr/ mas NÃO está no índice README.md`);
for (const n of INDEXED) if (!ADR_FILES.has(n)) bad(`índice de ADRs lista ${n} mas não há arquivo docs/adr/${n}-*.md`);
if (ADR_FILES.size && [...ADR_FILES].every((n) => INDEXED.has(n))) ok(`${ADR_FILES.size} ADRs consistentes com o índice`);

// ---- varredura por arquivo (paths só DENTRO de crase → sem falso-positivo de prosa) ---------------
const seen = { adr: new Set(), agent: new Set(), skill: new Set() };
for (const file of MD) {
  const txt = readFileSync(file, 'utf8');
  const where = rel(file);

  // B. ADR-NNNN (em qualquer lugar)
  for (const m of txt.matchAll(/ADR-(\d{4})/g)) if (!ADR_FILES.has(m[1])) seen.adr.add(`${m[1]} @ ${where}`);

  // "subagente(s) `x`" — referência precisa de agente
  for (const m of txt.matchAll(/subagentes?\**\s+`([a-z0-9][a-z0-9-]*)`/gi))
    if (!AGENTS.has(m[1])) seen.agent.add(`${m[1]} @ ${where}`);

  // paths agents/x e skills/x — SÓ dentro de spans de crase (ignora prosa tipo "docs/agents/skills")
  for (const span of txt.matchAll(/`([^`]+)`/g)) {
    const s = span[1];
    const a = /^agents\/([a-z0-9][a-z0-9-]*)(?:\.md)?$/.exec(s);
    if (a && !AGENTS.has(a[1])) seen.agent.add(`${a[1]} @ ${where}`);
    const k = /^skills\/([a-z0-9][a-z0-9-]*)(?:\/.*)?$/.exec(s);
    if (k && !SKILLS.has(k[1])) seen.skill.add(`${k[1]} @ ${where}`);
  }
}

console.log('== B. menções ADR-NNNN resolvem ==');
if (!seen.adr.size) ok('toda menção ADR-NNNN aponta para um arquivo existente');
else for (const s of seen.adr) bad(`menção a ADR inexistente: ${s}`);

console.log('== C. referências de agente resolvem ==');
if (!seen.agent.size) ok('todo "subagente `x`" / `agents/x` aponta para um agente real');
else for (const s of seen.agent) bad(`referência a agente inexistente: ${s}`);

console.log('== D. referências de skill resolvem ==');
if (!seen.skill.size) ok('todo `skills/x` aponta para uma skill real');
else for (const s of seen.skill) bad(`referência a skill inexistente: ${s}`);

console.log('== E. knobs críticos definidos no genoma ==');
const missingKnobs = CRITICAL_KNOBS.filter((k) => !KNOBS.has(k));
if (!missingKnobs.length) ok(`${CRITICAL_KNOBS.length} knobs críticos presentes no genoma §8`);
else for (const k of missingKnobs) bad(`knob crítico ausente do genoma §8: \`${k}\` (skills/agentes dependem dele)`);

console.log('');
console.log(`Resumo: ${errors.length} erro(s). Docs varridos: ${MD.length}.`);
if (errors.length) { console.error(`✗ COERÊNCIA FALHOU: ${errors.length} contradição(ões) entre docs.`); process.exit(1); }
console.log('✓ Coerência dos docs ok (erros = 0).');
