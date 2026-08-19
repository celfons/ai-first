#!/usr/bin/env node
// Trava de política do método ai-first — a CAMADA 4 do enforcement levada ao seu ponto cego
// (docs/governance/enforcement.md · ADR-0020). Zero dependências.
//
//   node scripts/policy-lock.mjs                     # --check (default): a régua não derivou nem afrouxou
//   node scripts/policy-lock.mjs --seal              # sela: reconhece um APERTO ou uma mudança neutra
//   node scripts/policy-lock.mjs --seal --allow-loosening="motivo"   # sela um AFROUXAMENTO (deixa trilha)
//
// O problema que resolve: um agente com auto-merge e `autonomy_level: autônomo` tem um caminho
// trivial para o verde — **baixar a própria régua**. Editar `ci.yml`, esvaziar uma fitness function,
// trocar `tdd_mode: estrito` por `off`, `verification_mode: panel` por `single`. Nada no método
// impedia isso: os hooks barram push em main/develop, não barram AFROUXAR o gate dentro do PR.
//
// O que a trava faz (as duas metades, inseparáveis):
//   1. LOCK  — `docs/governance/policy.lock.json` guarda o digest sha256 de cada superfície de
//              governança (hooks, workflows de CI/guard, scripts de gate, grafos contratados). Mudou
//              sem reselo ⇒ FALHA. O reselo é sempre uma linha de diff revisável — nunca silencioso.
//   2. SÓ APERTA — os knobs de RIGOR do genoma (§8) têm escala ordinal. Apertar passa (com reselo);
//              AFROUXAR é bloqueado e só sela com `--allow-loosening="motivo"`, que carimba data +
//              motivo no `loosenings[]` do lock (append-only, auditável).
//
// O limite, dito com todas as letras: isto torna o afrouxamento **explícito, declarado e revisável** —
// não fisicamente impossível. O que o torna impossível de MERGEAR é a branch protection + o CODEOWNERS
// sobre estes caminhos (templates/governance/CODEOWNERS). Trava é o sinal; o servidor é a força.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LOCK_REL = 'docs/governance/policy.lock.json';
const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Superfícies protegidas por default (a gênese pode estreitar/ampliar no lock do repo-alvo).
// Critério de inclusão: "se isto for editado, o gate pode passar a mentir".
export const DEFAULT_PATTERNS = [
  'hooks/*.sh',
  'hooks/hooks.json',
  '.ai-first/hooks/*.sh',
  '.github/workflows/ci.yml',
  '.github/workflows/ai-first-guard.yml',
  'templates/ci/*.yml',
  'scripts/ai-first-fitness.mjs',
  'scripts/policy-lock.mjs',
  'scripts/check-coherence.mjs',
  'scripts/check-workflows.mjs',
  'scripts/validate-plugin.mjs',
  '.claude/workflows/*.mjs',
  'templates/workflows/*.mjs',
];

// Knobs de RIGOR (genoma §8) em escala ordinal: índice MAIOR = mais rígido. Knob que é FORMA e não
// rigor (`bdd_style`, `orchestration_mode`, `slice_fanout`) fica de fora de propósito — travar forma
// só geraria atrito. Knob de VAZÃO (`features_per_day`, `parallelism`) idem: throughput não é régua.
export const KNOB_SCALES = {
  autonomy_level: ['autonomo', 'amplo', 'progressivo', 'conservador'],
  tdd_mode: ['off', 'pragmatico', 'estrito'],
  fast_path: ['on', 'off'],
  verification_mode: ['single', 'panel'],
  uncertainty_escalation: ['off', 'on'],
  eval_gate: ['off', 'on'],
};
// Knobs numéricos de rigor: 'higher' = maior é mais rígido; 'lower' = menor é mais rígido.
export const KNOB_NUMERIC = { adversarial_panel_size: 'higher', external_action_cap: 'lower' };
export const KNOB_NAMES = [...Object.keys(KNOB_SCALES), ...Object.keys(KNOB_NUMERIC)];

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const sha = (buf) => 'sha256:' + createHash('sha256').update(buf).digest('hex');

// ---- glob mínimo (só o que os patterns usam: **, *, ?) --------------------------------------------
function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
      else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function listFiles(root) {
  const out = [];
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      if (e === 'node_modules' || e === '.git' || e === 'dist' || e === 'fitness-fixtures') continue;
      const p = join(dir, e);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p);
      else out.push(relative(root, p).split(sep).join('/'));
    }
  })(root);
  return out;
}

export function matchPatterns(root, patterns) {
  const res = patterns.map(globToRe);
  return listFiles(root).filter((f) => res.some((re) => re.test(f))).sort();
}

// ---- genoma: extrai o valor DEFINIDO de um knob (§8) ----------------------------------------------
// Formato do genoma: "- **`knob`** (explicação): `valor` (default …)". Valor entre colchetes
// (`[A DEFINIR]`, `[single | panel]`) = knob NÃO definido → fica fora do lock (nada a travar ainda).
export function readGenomeKnobs(root) {
  const p = join(root, 'docs/ai-first/project.md');
  if (!existsSync(p)) return null;
  const txt = readFileSync(p, 'utf8');
  const knobs = {};
  for (const name of KNOB_NAMES) {
    const m = new RegExp('^\\s*-\\s+\\*\\*`' + name + '`\\*\\*[^\\n]*?:\\s*`([^`]+)`', 'm').exec(txt);
    if (!m) continue;
    const v = m[1].trim();
    if (v.startsWith('[')) continue; // ainda não definido pela gênese
    knobs[name] = v;
  }
  return knobs;
}

// Compara dois valores de knob. → 'igual' | 'aperto' | 'afrouxamento' | 'indeterminado'
export function compareKnob(name, locked, current) {
  if (norm(locked) === norm(current)) return 'igual';
  if (KNOB_SCALES[name]) {
    const scale = KNOB_SCALES[name];
    const a = scale.indexOf(norm(locked));
    const b = scale.indexOf(norm(current));
    if (a === -1 || b === -1) return 'indeterminado';
    return b > a ? 'aperto' : 'afrouxamento';
  }
  const dir = KNOB_NUMERIC[name];
  if (dir) {
    const a = Number(String(locked).replace(/[^\d.]/g, ''));
    const b = Number(String(current).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 'indeterminado';
    if (a === b) return 'igual';
    return (dir === 'higher' ? b > a : b < a) ? 'aperto' : 'afrouxamento';
  }
  return 'indeterminado';
}

export function loadLock(root) {
  const p = join(root, LOCK_REL);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { return { __erro: e.message }; }
}

async function checkIds(root) {
  // Os IDs das fitness functions vivem no registro do próprio script (import dinâmico evita ciclo).
  try {
    const mod = await import(pathToFileURL(join(root, 'scripts/ai-first-fitness.mjs')).href);
    return Array.isArray(mod.CHECKS) ? mod.CHECKS.map((c) => c.id) : null;
  } catch { return null; }
}

/**
 * Verifica a trava. Retorna { estado, findings } — `findings[].nivel`:
 *   'bloqueio' = AFROUXAMENTO (knob relaxado, check removido, superfície apagada) — exige humano.
 *   'reselo'   = derivou sem reselo (digest ≠) — o agente resolve com `--seal`, deixando diff.
 */
export async function checkPolicy(root = SELF_ROOT) {
  const lock = loadLock(root);
  if (!lock) return { estado: 'ausente', findings: [] };
  if (lock.__erro) return { estado: 'invalido', findings: [{ nivel: 'bloqueio', msg: `${LOCK_REL} ilegível: ${lock.__erro}` }] };

  const findings = [];
  const patterns = Array.isArray(lock.patterns) && lock.patterns.length ? lock.patterns : DEFAULT_PATTERNS;
  const surfaces = lock.surfaces || {};

  // 1 · toda superfície selada continua existindo e com o mesmo digest
  for (const [rel, digest] of Object.entries(surfaces)) {
    const p = join(root, rel);
    if (!existsSync(p)) {
      findings.push({ nivel: 'bloqueio', msg: `superfície de governança REMOVIDA: ${rel} (apagar a régua é o afrouxamento máximo)` });
      continue;
    }
    const atual = sha(readFileSync(p));
    if (atual !== digest) findings.push({ nivel: 'reselo', msg: `superfície ALTERADA sem reselo: ${rel} (${digest.slice(7, 15)} → ${atual.slice(7, 15)})` });
  }

  // 2 · superfície nova que casa com os patterns precisa entrar no lock (senão nasce fora da trava)
  for (const rel of matchPatterns(root, patterns)) {
    if (!(rel in surfaces)) findings.push({ nivel: 'reselo', msg: `superfície de governança NÃO SELADA: ${rel} (rode --seal)` });
  }

  // 3 · knobs de rigor: só apertam
  const atuais = readGenomeKnobs(root);
  if (atuais && lock.knobs) {
    for (const [name, locked] of Object.entries(lock.knobs)) {
      if (!(name in atuais)) {
        findings.push({ nivel: 'bloqueio', msg: `knob de rigor \`${name}\` SUMIU do genoma (estava travado em "${locked}")` });
        continue;
      }
      const veredito = compareKnob(name, locked, atuais[name]);
      if (veredito === 'afrouxamento')
        findings.push({ nivel: 'bloqueio', msg: `AFROUXAMENTO de \`${name}\`: "${locked}" → "${atuais[name]}" (só com --allow-loosening + revisão humana)` });
      else if (veredito === 'aperto')
        findings.push({ nivel: 'reselo', msg: `aperto de \`${name}\`: "${locked}" → "${atuais[name]}" — permitido, mas rode --seal para registrar` });
      else if (veredito === 'indeterminado')
        findings.push({ nivel: 'bloqueio', msg: `valor irreconhecível para \`${name}\`: "${locked}" → "${atuais[name]}" (fora da escala de rigor)` });
    }
  }

  // 4 · nenhuma fitness function selada pode desaparecer do registro
  const ids = await checkIds(root);
  if (ids && Array.isArray(lock.checks)) {
    for (const id of lock.checks)
      if (!ids.includes(id)) findings.push({ nivel: 'bloqueio', msg: `fitness function \`${id}\` REMOVIDA do registro (estava selada)` });
    const novos = ids.filter((id) => !lock.checks.includes(id));
    if (novos.length) findings.push({ nivel: 'reselo', msg: `fitness function nova não selada: ${novos.join(', ')} (rode --seal)` });
  }

  return { estado: findings.length ? 'divergente' : 'ok', findings };
}

export async function sealLock(root = SELF_ROOT, { allowLoosening = null, hoje = null } = {}) {
  const anterior = loadLock(root) || {};
  const { findings } = await checkPolicy(root);
  const afrouxa = findings.filter((f) => f.nivel === 'bloqueio');
  if (afrouxa.length && !allowLoosening) {
    const e = new Error(
      'reselo RECUSADO — a mudança AFROUXA a régua:\n' +
        afrouxa.map((f) => `    · ${f.msg}`).join('\n') +
        '\n  Se for deliberado, sele com --allow-loosening="motivo" (fica registrado no lock e vai para o diff).'
    );
    e.afrouxamentos = afrouxa;
    throw e;
  }

  const patterns = Array.isArray(anterior.patterns) && anterior.patterns.length ? anterior.patterns : DEFAULT_PATTERNS;
  const surfaces = {};
  for (const rel of matchPatterns(root, patterns)) surfaces[rel] = sha(readFileSync(join(root, rel)));
  const data = hoje || new Date().toISOString().slice(0, 10);
  const knobs = readGenomeKnobs(root) || {};
  const ids = (await checkIds(root)) || anterior.checks || [];

  const lock = {
    schema: 'ai-first/policy-lock@1',
    doc: 'Trava de política (ADR-0020) — superfícies de governança seladas + knobs de rigor que SÓ APERTAM. Regenerado por `node scripts/policy-lock.mjs --seal`; toda mudança aqui é diff revisável.',
    sealed_at: data,
    patterns,
    checks: ids,
    knobs,
    surfaces,
    loosenings: Array.isArray(anterior.loosenings) ? anterior.loosenings.slice() : [],
  };
  if (allowLoosening) lock.loosenings.push({ data, motivo: String(allowLoosening), itens: afrouxa.map((f) => f.msg) });

  writeFileSync(join(root, LOCK_REL), JSON.stringify(lock, null, 2) + '\n');
  return lock;
}

// ---- CLI ------------------------------------------------------------------------------------------
const invocadoDiretamente = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
// IIFE async (e NÃO top-level await): `checkIds` importa dinamicamente o registro de fitness, que por
// sua vez importa este módulo. Com TLA, a avaliação deste módulo ficaria pendente e o ciclo travaria.
if (invocadoDiretamente) void (async () => {
  const argv = process.argv.slice(2);
  const seal = argv.includes('--seal');
  const allow = (argv.find((a) => a.startsWith('--allow-loosening')) || '').split('=').slice(1).join('=') || null;
  const root = SELF_ROOT;

  if (seal) {
    try {
      const lock = await sealLock(root, { allowLoosening: allow });
      console.log(`✓ Política selada em ${LOCK_REL} — ${Object.keys(lock.surfaces).length} superfície(s), ${Object.keys(lock.knobs).length} knob(s) de rigor.`);
      if (allow) console.log(`  ⚠ afrouxamento registrado: "${allow}" (linha permanente no lock — revise no PR)`);
    } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
  } else {
    const { estado, findings } = await checkPolicy(root);
    if (estado === 'ausente') { console.log(`– Sem ${LOCK_REL} — trava não instalada (rode --seal para criar).`); process.exit(0); }
    for (const f of findings) console.log(`  ${f.nivel === 'bloqueio' ? '✗' : '!'} ${f.msg}`);
    if (!findings.length) console.log('✓ Trava de política íntegra (nenhuma superfície derivou, nenhum knob afrouxou).');
    process.exit(findings.length ? 1 : 0);
  }
})();
