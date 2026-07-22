#!/usr/bin/env node
// Fitness functions do método ai-first — a CAMADA 4 do enforcement (docs/governance/enforcement.md):
// invariante durável = teste que QUEBRA o build quando a arquitetura/governança desvia. Zero
// dependências. Sai != 0 em qualquer violação (serve de gate no CI e no job `fitness` do guard).
//   node scripts/ai-first-fitness.mjs
//
// Desenho: um REGISTRO de checagens, cada uma com um GUARDA de aplicabilidade (repo do método vs.
// repo de produto, pré-gênese vs. armado). Uma check só roda onde faz sentido — assim o mesmo
// script serve o repo do plugin (aqui) E os repos de produto que adotam o método, sem falso-positivo.
//
// Checks (baixo falso-positivo, determinísticas):
//   F1 · Trilha de ADR append-only  — todo ADR `Superseded by NNNN` aponta para um ADR existente;
//        status é um valor conhecido. (enforcement §4: "nenhum ADR Accepted contradito sem Superseded by")
//   F2 · Versão do plugin coerente   — plugin.json.version é semver; se o marketplace declara versão,
//        ela bate. (enforcement §4: "versão do plugin declarada e não-defasada")
//   F3 · Genoma armado é consistente — se o organismo se declara armado, não sobra `[A DEFINIR]`.
//        Torna "armado" uma AFIRMAÇÃO VERIFICÁVEL, não fé. (pré-gênese: pulado.)
//   F4 · Acesso a dados atrás da porta (P-5) — nenhum driver/SQL fora de `repositories/`. Só roda em
//        repo de produto com a convenção `src/repositories/`. (aqui: pulado — repo do método.)
//   F5 · Sub-workflow contratado materializado (ADR-0010) — o `build-one-feature` resolve como named
//        workflow (`.claude/workflows/`) e, no plugin, a cópia instalada não DIVERGE do template.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { errors.push(m); console.log(`  ✗ ${m}`); };
const skip = (m) => console.log(`  – ${m} (não se aplica a este repo)`);
const has = (rel) => existsSync(join(ROOT, rel));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ---- contexto do repo (decide quais checks aplicam) -----------------------------------------------
const ctx = {
  isPluginRepo: has('.claude-plugin/plugin.json'),
  hasSrc: has('src'),
  hasRepoLayer: has('src/repositories'),
  hasGenome: has('docs/ai-first/project.md'),
  hasAdr: has('docs/adr'),
};
// Armado = o checklist "Organismo armado ✅" do genoma está MARCADO ([x]).
ctx.isArmed = ctx.hasGenome && /-\s*\[[xX]\]\s*\**\s*Organismo armado/.test(read('docs/ai-first/project.md'));

// ---- F1 · Trilha de ADR append-only ---------------------------------------------------------------
function f1_adrTrail() {
  console.log('== F1 · Trilha de ADR append-only ==');
  if (!ctx.hasAdr) return skip('sem docs/adr/');
  const files = readdirSync(join(ROOT, 'docs/adr')).filter((f) => /^\d{4}-.*\.md$/.test(f));
  const nums = new Set(files.map((f) => f.slice(0, 4)));
  const KNOWN = /^(Proposed|Accepted|Deprecated|Rejected|Superseded\b)/i;
  let checked = 0;
  for (const f of files) {
    const txt = readFileSync(join(ROOT, 'docs/adr', f), 'utf8');
    // Linha de status: "> Status: X · Data: ..." (primeira menção de Status: no arquivo).
    const m = /Status:\s*([^·\n]+)/i.exec(txt);
    if (!m) { bad(`docs/adr/${f}: sem linha "Status:" reconhecível`); continue; }
    const status = m[1].trim();
    if (!KNOWN.test(status)) { bad(`docs/adr/${f}: status desconhecido "${status}"`); continue; }
    const sup = /Superseded by\s*(\d{4})/i.exec(status);
    if (sup && !nums.has(sup[1])) bad(`docs/adr/${f}: "Superseded by ${sup[1]}" mas não há docs/adr/${sup[1]}-*.md`);
    checked++;
  }
  if (checked && !errors.length) ok(`${checked} ADRs com status válido e supersessão resolvível`);
  else if (checked) ok(`${checked} ADRs varridos`);
}

// ---- F2 · Versão do plugin coerente ---------------------------------------------------------------
function f2_pluginVersion() {
  console.log('== F2 · Versão do plugin declarada e coerente ==');
  if (!ctx.isPluginRepo) return skip('sem .claude-plugin/plugin.json');
  let plugin;
  try { plugin = JSON.parse(read('.claude-plugin/plugin.json')); }
  catch (e) { return bad(`plugin.json ilegível: ${e.message}`); }
  const v = plugin.version;
  if (!v || !/^\d+\.\d+\.\d+/.test(v)) return bad(`plugin.json: version ausente ou não-semver: ${v}`);
  ok(`plugin.json version = ${v} (semver)`);
  if (has('.claude-plugin/marketplace.json')) {
    let mkt;
    try { mkt = JSON.parse(read('.claude-plugin/marketplace.json')); } catch { mkt = null; }
    const entry = mkt && Array.isArray(mkt.plugins) && mkt.plugins.find((p) => p.name === plugin.name);
    if (entry && entry.version && entry.version !== v)
      bad(`marketplace declara version "${entry.version}" para "${plugin.name}", diverge de plugin.json "${v}"`);
    else ok('marketplace coerente com a versão do plugin');
  }
}

// ---- F3 · Genoma armado é consistente -------------------------------------------------------------
function f3_genomeArmed() {
  console.log('== F3 · Genoma armado sem [A DEFINIR] ==');
  if (!ctx.hasGenome) return skip('sem docs/ai-first/project.md');
  if (!ctx.isArmed) return skip('genoma pré-gênese (organismo não armado) — rode /ai-first-init');
  const genome = read('docs/ai-first/project.md');
  const n = (genome.match(/\[A DEFINIR\]/g) || []).length;
  if (n) bad(`genoma declara "Organismo armado" mas ainda tem ${n} campo(s) [A DEFINIR] — armado deve ser afirmação verificável`);
  else ok('genoma armado e totalmente preenchido (0 [A DEFINIR])');
}

// ---- F4 · Acesso a dados atrás da porta (P-5) -----------------------------------------------------
function f4_dataBehindPort() {
  console.log('== F4 · Acesso a dados atrás da porta (P-5) ==');
  if (!ctx.hasSrc || !ctx.hasRepoLayer) return skip('sem src/repositories/ (convenção P-5)');
  // Denylist seminal — a gênese ajusta ao driver real do genoma §5. Import de driver de dados ou SQL
  // cru FORA de src/repositories/ viola P-5 (acesso a dados só atrás da porta).
  const DRIVER = /\b(from|require\()\s*['"](pg|mysql2?|mongodb|mongoose|better-sqlite3|sqlite3|knex|typeorm|sequelize|@prisma\/client|redis|ioredis)['"]/;
  const RAWSQL = /\b(SELECT\b[\s\S]{0,200}\bFROM\b|INSERT\s+INTO\b|UPDATE\b[\s\S]{0,80}\bSET\b|DELETE\s+FROM\b)/i;
  const CODE = /\.(m?[jt]sx?|cjs)$/;
  const violations = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === '.git' || e === 'dist' || e === 'repositories') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (CODE.test(e)) {
        const txt = readFileSync(p, 'utf8');
        if (DRIVER.test(txt)) violations.push(`${p.slice(ROOT.length + 1)}: import de driver de dados`);
        else if (RAWSQL.test(txt)) violations.push(`${p.slice(ROOT.length + 1)}: SQL cru`);
      }
    }
  })(join(ROOT, 'src'));
  if (violations.length) for (const v of violations) bad(`P-5 furado — ${v} (mova para src/repositories/)`);
  else ok('nenhum driver/SQL fora de src/repositories/');
}

// ---- F5 · Sub-workflow contratado materializado (ADR-0010) ----------------------------------------
function f5_contractedWorkflow() {
  console.log('== F5 · Sub-workflow contratado build-one-feature ==');
  const TEMPLATE = 'templates/workflows/build-one-feature.mjs';
  const INSTALLED = '.claude/workflows/build-one-feature.mjs';
  const isWorkflow = (txt) => /export\s+const\s+meta\s*=/.test(txt) && /['"]build-one-feature['"]/.test(txt);

  if (ctx.isPluginRepo) {
    // Repo do plugin/método: o template é a fonte de verdade; a cópia instalada (se existir) não diverge.
    if (!has(TEMPLATE)) return bad(`${TEMPLATE} ausente — o subgrafo contratado (ADR-0010) precisa existir no plugin`);
    if (!isWorkflow(read(TEMPLATE))) return bad(`${TEMPLATE} não parece um workflow (falta export const meta / name build-one-feature)`);
    ok('template do subgrafo presente e bem-formado');
    if (has(INSTALLED)) {
      if (read(INSTALLED) === read(TEMPLATE)) ok('cópia instalada em .claude/workflows/ em sincronia com o template');
      else bad(`${INSTALLED} DIVERGE de ${TEMPLATE} — a cópia resolvível derivou do template (drift)`);
    }
    return;
  }
  // Repo de produto ARMADO: o named workflow precisa RESOLVER (.claude/workflows/) — a gênese o instala.
  if (ctx.isArmed) {
    if (!has(INSTALLED)) bad(`${INSTALLED} ausente — workflow('build-one-feature') não resolveria (a gênese deveria instalá-lo)`);
    else if (!isWorkflow(read(INSTALLED))) bad(`${INSTALLED} não é um workflow válido`);
    else ok('sub-workflow contratado instalado e resolvível');
  } else {
    skip('repo de produto não armado');
  }
}

// ---- runner ---------------------------------------------------------------------------------------
for (const check of [f1_adrTrail, f2_pluginVersion, f3_genomeArmed, f4_dataBehindPort, f5_contractedWorkflow]) {
  try { check(); } catch (e) { bad(`check ${check.name} lançou: ${e.message}`); }
}

console.log('');
if (errors.length) {
  console.error(`✗ FITNESS FALHOU: ${errors.length} invariante(s) violada(s).`);
  process.exit(1);
}
console.log('✓ Fitness functions ok (invariantes preservadas).');
