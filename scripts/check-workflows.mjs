#!/usr/bin/env node
// check-workflows — TESTE DE COMPORTAMENTO dos grafos contratados (ADR-0019). Zero dependências.
// Sai != 0 em qualquer cenário reprovado (serve de gate no CI, ao lado de validate/coherence/fitness).
//   node scripts/check-workflows.mjs
//
// Por que existe: os grafos de `.claude/workflows/` são o CAMINHO QUENTE do método (ADR-0018) e não
// tinham nenhum teste — três defeitos graves conviveram com CI verde por versões inteiras (gate que
// aprovava BLOQUEIA e reprovava APROVA; teto por feature medido no contador global; knobs que o motor
// não lia). Cada cenário aqui é a REGRESSÃO de um desses bugs (P-11: todo bug vira teste eterno).
//
// Como funciona: simula o runtime de `Workflow` (agent/parallel/pipeline/budget/log/phase/workflow) com
// dublês determinísticos e roda os grafos DE VERDADE, afirmando sobre o que eles chamam e devolvem.
// Não chama modelo, não toca rede, não escreve no repo.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '.claude/workflows/');
const TMP = mkdtempSync(join(tmpdir(), 'ai-first-wf-'));

// O grafo é um script de topo (usa `return`/`args`/`agent` livres): envelopamos numa função para
// poder importá-lo e injetar os dublês — é a mesma forma que o runtime real lhe dá.
function load(name) {
  const body = readFileSync(SRC + name + '.mjs', 'utf8').replace(/^export const meta/m, 'const meta');
  const f = join(TMP, name + '.mjs');
  writeFileSync(f, `export default async function(args, budget, agent, parallel, pipeline, log, phase, workflow){\n${body}\n}`);
  return import(f).then((m) => m.default);
}

let spent = 0, calls = [];
const mk = (cfg) => {
  const budget = { total: cfg.total ?? null, spent: () => spent, remaining: () => (cfg.total ?? Infinity) - spent };
  const agent = async (prompt, opts = {}) => {
    spent += cfg.cost ?? 10;
    const label = opts.label || (/## Papel: ([a-z-]+)/.exec(prompt)?.[1]) || 'anon';
    calls.push({ label, model: opts.model, schema: !!opts.schema });
    return cfg.reply(label, prompt, opts);
  };
  const parallel = (thunks) => Promise.all(thunks.map(t => t().catch(() => null)));
  const pipeline = async (items, ...stages) => { const out = []; for (const it of items) { let v = it; for (const s of stages) v = await s(v, it, items.indexOf(it)); out.push(v); } return out; };
  const log = (m) => cfg.verbose && console.log('   log:', m);
  const phase = () => {};
  return { budget, agent, parallel, pipeline, log, phase };
};

const one = await load('build-one-feature');
const many = await load('build-many-features');
let fails = 0;
console.log('== Grafos contratados (.claude/workflows) ==');
const check = (name, cond, extra='') => { console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) fails++; };

// ── 1 · Veredito estruturado: APROVA com seção "Bloqueadores" NÃO bloqueia (o bug antigo) ──────────
spent = 0; calls = [];
let rt = mk({ reply: (label) => {
  if (label === 'tester' || label.startsWith('adversarial') || label === 'security')
    return { veredito: 'APROVA', resumo: '## Bloqueadores (se houver) — nenhum. bloqueado? não.', ressalvas: [] };
  if (label === 'task-decomposer') return { status: 'nao-decomposto', slices: [] };
  return { status: 'ok', confidence: 'alta', footprint: ['src/a/**'] };
}});
let r = await one({ issue: 7, comportamento: 'cria' }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('APROVA cujo texto contém "Bloqueadores/bloqueado" NÃO bloqueia', r.status === 'merged-ready', r.status + ': ' + (r.reason ?? ''));

// ── 1b · tester que acha bug BLOQUEIA (e faz fail-fast: não chama opus) ────────────────────────────
spent = 0; calls = [];
rt = mk({ reply: (label) => {
  if (label === 'tester') return { veredito: 'BLOQUEIA', resumo: 'bug', bloqueadores: [{ tipo: 'correção', onde: 'a.ts:1', cenario: 'x→y' }] };
  if (label === 'task-decomposer') return { status: 'nao-decomposto', slices: [] };
  return { status: 'ok', confidence: 'alta' };
}});
r = await one({ issue: 8, maxRerunAttempts: 1 }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('tester com bug de produção BARRA o merge', r.status === 'awaiting-human', r.status);
check('fail-fast: gate opus (adversarial/security) NÃO é pago quando o tester reprova', !calls.some(c => c.label.startsWith('adversarial') || c.label === 'security'), calls.map(c=>c.label).join(','));

// ── 1c · fail-closed: verificador sem retorno = BLOQUEIA ───────────────────────────────────────────
spent = 0; calls = [];
rt = mk({ reply: (label) => {
  if (label === 'tester') throw new Error('morreu');
  if (label === 'task-decomposer') return { status: 'nao-decomposto', slices: [] };
  return { status: 'ok', confidence: 'alta' };
}});
r = await one({ issue: 9, maxRerunAttempts: 1 }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('verificador morto conta como BLOQUEIA (fail-closed)', r.status === 'awaiting-human', r.status);

// ── 2 · Orçamento por feature medido por DELTA (a 2ª feature não morre por causa da 1ª) ────────────
spent = 500;   // uma feature anterior já queimou o pool do turno
rt = mk({ total: 10000, cost: 5, reply: (label) => {
  if (label === 'task-decomposer') return { status: 'nao-decomposto', slices: [] };
  if (['tester','security'].includes(label) || label.startsWith('adversarial')) return { veredito: 'APROVA', resumo: 'ok' };
  return { status: 'ok', confidence: 'alta' };
}});
r = await one({ issue: 10, budgetPerFeature: 200 }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('teto por feature usa DELTA, não o contador global do turno', r.status === 'merged-ready', r.status + ': ' + (r.reason ?? ''));

// ── 3 · fast_path colapsa a autoria; comportamento:nenhum pula o BDD; single = 1 opus adversarial ──
spent = 0; calls = [];
rt = mk({ reply: (label) => {
  if (['tester','security'].includes(label) || label.startsWith('adversarial')) return { veredito: 'APROVA', resumo: 'ok' };
  return { status: 'ok', confidence: 'alta' };
}});
r = await one({ issue: 11, fastPath: 'on', fastPathElegivel: true }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
const usados = calls.map(c => c.label);
check('fast_path pula spec/plan/decompose/bdd', !usados.some(l => ['feature-spec','architect','task-decomposer','bdd-author'].includes(l)), usados.join(','));
check('fast_path mantém os gates (tester+adversarial+security)', ['tester','adversarial:single','security'].every(l => usados.includes(l)));
check('verification_mode single = 1 cético (não 3)', usados.filter(l => l.startsWith('adversarial')).length === 1);
check('custo total do fast-path 🟢 = 2 opus (adversarial+security), não 4', calls.filter(c => c.model === 'opus').length === 2);

spent = 0; calls = [];
r = await one({ issue: 12, comportamento: 'nenhum' }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('comportamento:nenhum pula o bdd-author', !calls.some(c => c.label === 'bdd-author'));
spent = 0; calls = [];
r = await one({ issue: 13, comportamento: 'cria', verificationMode: 'panel', adversarialPanelSize: 3 }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('panel = N céticos de lentes distintas', calls.filter(c => c.label.startsWith('adversarial:')).length === 3);
check('bdd-author roda ANTES do implement (ADR-0015)', calls.findIndex(c => c.label === 'bdd-author') < calls.findIndex(c => c.label.startsWith('backend-engineer') || c.label === 'backend-engineer'));
spent = 0; calls = [];
r = await one({ issue: 14, tier: 'alto' }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('tier 🔴 força painel mesmo com verification_mode single', calls.filter(c => c.label.startsWith('adversarial:')).length === 3);

// ── 3b · uncertainty_escalation: confidence baixa escala ao humano ────────────────────────────────
spent = 0;
rt = mk({ reply: (label) => label === 'feature-spec' ? { status: 'ok', confidence: 'baixa', motivo: 'requisito vago' } : { status: 'ok', confidence: 'alta' } });
r = await one({ issue: 15 }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
check('confidence baixa escala ao humano (uncertainty_escalation)', r.status === 'awaiting-human' && r.confidence === 'baixa', r.status);

// ── 6 · slice roteada ao ofício certo ─────────────────────────────────────────────────────────────
spent = 0; calls = [];
rt = mk({ reply: (label) => {
  if (label === 'task-decomposer') return { status: 'decomposto', slices: [
    { id: 's1', titulo: 'migração', arquivos: ['db/x.sql'], dependeDe: [], doneTest: 't', papel: 'data' },
    { id: 's2', titulo: 'tela', arquivos: ['web/y.tsx'], dependeDe: [], doneTest: 't', papel: 'frontend' },
    { id: 's3', titulo: 'integra', arquivos: ['src/z.ts'], dependeDe: ['s1','s2'], doneTest: 't', integracao: true, papel: 'backend' } ] };
  if (['tester','security'].includes(label) || label.startsWith('adversarial')) return { veredito: 'APROVA', resumo: 'ok' };
  return { status: 'ok', confidence: 'alta' };
}});
r = await one({ issue: 16, uiSignificativa: true }, rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase);
const labels = calls.map(c => c.label);
check('slice de dado → data-engineer', labels.includes('data-engineer:s1'), labels.join(','));
check('slice de UI → frontend-engineer', labels.includes('frontend-engineer:s2'));
check('ux-designer entra quando há UI significativa', labels.includes('ux-designer'));

// ── 4 · pai: planeja em paralelo, agenda por footprint disjunto, serializa quem colide ─────────────
spent = 0; calls = [];
const fps = { 20: ['src/api/**'], 21: ['web/**'], 22: ['src/api/orders.ts'] };
let ordem = [];
rt = mk({ verbose: false, reply: () => ({ status: 'ok', confidence: 'alta' }) });
const wfStub = async (name, a) => {
  if (a.stage === 'plan') return { status: 'plan-ready', issue: String(a.issue), touched: [], footprint: fps[a.issue] };
  ordem.push(a.issue);
  return { status: 'merged-ready', issue: String(a.issue), touched: [] };
};
const res = await many({ features: [{ issue: 20 }, { issue: 21 }, { issue: 22 }], sharedBundle: 'b', fanOut: 3 },
  rt.budget, rt.agent, rt.parallel, rt.pipeline, rt.log, rt.phase, wfStub);
check('pai devolve as 3 features', res.rodada.length === 3, JSON.stringify(res.prontasParaMerge));
check('features de footprint sobreposto NÃO entram na mesma onda', ordem.slice(0,2).sort().join() === '20,21', 'ordem: ' + ordem.join('→'));
check('footprint colhido do PLAN alimenta o agendamento', ordem.length === 3 && ordem[2] === 22);

console.log('');
if (fails) { console.error(`✗ GRAFOS FALHARAM: ${fails} cenário(s) reprovado(s).`); process.exit(1); }
console.log('✓ Grafos contratados ok (comportamento preservado).');
