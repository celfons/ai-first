#!/usr/bin/env node
// Fitness functions do método ai-first — a CAMADA 4 do enforcement (docs/governance/enforcement.md):
// invariante durável = teste que QUEBRA o build quando a arquitetura/governança desvia. Zero
// dependências. Sai != 0 em qualquer violação (serve de gate no CI e no job `fitness` do guard).
//
//   node scripts/ai-first-fitness.mjs            # CHECK  — roda as invariantes contra este repo
//   node scripts/ai-first-fitness.mjs --verify   # VERIFY — prova que cada regra DISPARA (ADR-0020)
//   node scripts/ai-first-fitness.mjs --verify --rule F3
//
// Desenho: um REGISTRO de checagens, cada uma com um GUARDA de aplicabilidade (repo do método vs.
// repo de produto, pré-gênese vs. armado). Uma check só roda onde faz sentido — assim o mesmo
// script serve o repo do plugin (aqui) E os repos de produto que adotam o método, sem falso-positivo.
//
// PROVA DE MUTAÇÃO (ADR-0020): cada check declara `fixtures` — o menor repo que a VIOLA, em
// `scripts/fitness-fixtures/<id>/`. `--verify` roda a check contra cada fixture e exige ≥1 violação.
// Uma regra com regex furado, glob que não casa nada ou guarda invertida passa silenciosa no `--check`
// e o gate vira teatro; no `--verify` ela REPROVA. É a "prova do vermelho" do ADR-0015 aplicada ao
// gate, não ao código: a checagem que nunca falhou não é uma checagem. Check sem fixture = regra não
// provada ⇒ `--verify` falha. O CI roda `--verify` ANTES do `--check`.
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
//   F6 · Footprint declarado em todo plano de feature (ADR-0007).
//   F7 · Trava de política íntegra (ADR-0020) — nenhuma superfície de governança derivou sem reselo e
//        nenhum knob de rigor AFROUXOU. É o freio contra o caminho fácil do verde: baixar a régua.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkPolicy, LOCK_REL } from './policy-lock.mjs';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(SELF_ROOT, 'scripts/fitness-fixtures');

// ---- contexto do repo (decide quais checks aplicam) -----------------------------------------------
function contexto(root) {
  const has = (rel) => existsSync(join(root, rel));
  const read = (rel) => readFileSync(join(root, rel), 'utf8');
  const ctx = {
    root,
    has,
    read,
    isPluginRepo: has('.claude-plugin/plugin.json'),
    hasSrc: has('src'),
    hasRepoLayer: has('src/repositories'),
    hasGenome: has('docs/ai-first/project.md'),
    hasAdr: has('docs/adr'),
  };
  // Armado = o checklist "Organismo armado ✅" do genoma está MARCADO ([x]).
  ctx.isArmed = ctx.hasGenome && /-\s*\[[xX]\]\s*\**\s*Organismo armado/.test(read('docs/ai-first/project.md'));
  return ctx;
}

// ---- F1 · Trilha de ADR append-only ---------------------------------------------------------------
function f1_adrTrail({ ctx, ok, bad, skip }) {
  if (!ctx.hasAdr) return skip('sem docs/adr/');
  const files = readdirSync(join(ctx.root, 'docs/adr')).filter((f) => /^\d{4}-.*\.md$/.test(f));
  const nums = new Set(files.map((f) => f.slice(0, 4)));
  const KNOWN = /^(Proposed|Accepted|Deprecated|Rejected|Superseded\b)/i;
  let checked = 0;
  let ruins = 0;
  for (const f of files) {
    const txt = readFileSync(join(ctx.root, 'docs/adr', f), 'utf8');
    // Linha de status: "> Status: X · Data: ..." (primeira menção de Status: no arquivo).
    const m = /Status:\s*([^·\n]+)/i.exec(txt);
    if (!m) { bad(`docs/adr/${f}: sem linha "Status:" reconhecível`); ruins++; continue; }
    const status = m[1].trim();
    if (!KNOWN.test(status)) { bad(`docs/adr/${f}: status desconhecido "${status}"`); ruins++; continue; }
    const sup = /Superseded by\s*(\d{4})/i.exec(status);
    if (sup && !nums.has(sup[1])) { bad(`docs/adr/${f}: "Superseded by ${sup[1]}" mas não há docs/adr/${sup[1]}-*.md`); ruins++; }
    checked++;
  }
  if (checked && !ruins) ok(`${checked} ADRs com status válido e supersessão resolvível`);
  else if (checked) ok(`${checked} ADRs varridos`);
}

// ---- F2 · Versão do plugin coerente ---------------------------------------------------------------
function f2_pluginVersion({ ctx, ok, bad, skip }) {
  if (!ctx.isPluginRepo) return skip('sem .claude-plugin/plugin.json');
  let plugin;
  try { plugin = JSON.parse(ctx.read('.claude-plugin/plugin.json')); }
  catch (e) { return bad(`plugin.json ilegível: ${e.message}`); }
  const v = plugin.version;
  if (!v || !/^\d+\.\d+\.\d+/.test(v)) return bad(`plugin.json: version ausente ou não-semver: ${v}`);
  ok(`plugin.json version = ${v} (semver)`);
  if (ctx.has('.claude-plugin/marketplace.json')) {
    let mkt;
    try { mkt = JSON.parse(ctx.read('.claude-plugin/marketplace.json')); } catch { mkt = null; }
    const entry = mkt && Array.isArray(mkt.plugins) && mkt.plugins.find((p) => p.name === plugin.name);
    if (entry && entry.version && entry.version !== v)
      bad(`marketplace declara version "${entry.version}" para "${plugin.name}", diverge de plugin.json "${v}"`);
    else ok('marketplace coerente com a versão do plugin');
  }
}

// ---- F3 · Genoma armado é consistente -------------------------------------------------------------
function f3_genomeArmed({ ctx, ok, bad, skip }) {
  if (!ctx.hasGenome) return skip('sem docs/ai-first/project.md');
  if (!ctx.isArmed) return skip('genoma pré-gênese (organismo não armado) — rode /ai-first-init');
  const genome = ctx.read('docs/ai-first/project.md');
  const n = (genome.match(/\[A DEFINIR\]/g) || []).length;
  if (n) bad(`genoma declara "Organismo armado" mas ainda tem ${n} campo(s) [A DEFINIR] — armado deve ser afirmação verificável`);
  else ok('genoma armado e totalmente preenchido (0 [A DEFINIR])');
}

// ---- F4 · Acesso a dados atrás da porta (P-5) -----------------------------------------------------
function f4_dataBehindPort({ ctx, ok, bad, skip }) {
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
        if (DRIVER.test(txt)) violations.push(`${p.slice(ctx.root.length + 1)}: import de driver de dados`);
        else if (RAWSQL.test(txt)) violations.push(`${p.slice(ctx.root.length + 1)}: SQL cru`);
      }
    }
  })(join(ctx.root, 'src'));
  if (violations.length) for (const v of violations) bad(`P-5 furado — ${v} (mova para src/repositories/)`);
  else ok('nenhum driver/SQL fora de src/repositories/');
}

// ---- F5 · Sub-workflow contratado materializado (ADR-0010) ----------------------------------------
// Cobre os DOIS grafos que o método executa por default (ADR-0018): o subgrafo contratado de UMA
// feature (Escala 1, ADR-0010) e o pai da rodada (Escala 2, ADR-0003). Com `Workflow` como caminho
// default, a ausência de qualquer um deles deixa de ser "modo opcional indisponível" e passa a ser o
// caminho quente quebrado — por isso vira fitness function, não observação.
function f5_contractedWorkflow({ ctx, ok, bad, skip }) {
  const GRAFOS = [
    { name: 'build-one-feature', adr: 'ADR-0010' },
    { name: 'build-many-features', adr: 'ADR-0003/0018' },
  ];
  const isWorkflow = (txt, name) => /export\s+const\s+meta\s*=/.test(txt) && new RegExp(`['"]${name}['"]`).test(txt);

  for (const { name, adr } of GRAFOS) {
    const TEMPLATE = `templates/workflows/${name}.mjs`;
    const INSTALLED = `.claude/workflows/${name}.mjs`;

    if (ctx.isPluginRepo) {
      // Repo do plugin/método: o template é a fonte de verdade; a cópia instalada não diverge.
      if (!ctx.has(TEMPLATE)) { bad(`${TEMPLATE} ausente — o grafo contratado (${adr}) precisa existir no plugin`); continue; }
      if (!isWorkflow(ctx.read(TEMPLATE), name)) { bad(`${TEMPLATE} não parece um workflow (falta export const meta / name ${name})`); continue; }
      ok(`template ${name} presente e bem-formado`);
      if (ctx.has(INSTALLED)) {
        if (ctx.read(INSTALLED) === ctx.read(TEMPLATE)) ok(`cópia instalada de ${name} em sincronia com o template`);
        else bad(`${INSTALLED} DIVERGE de ${TEMPLATE} — a cópia resolvível derivou do template (drift)`);
      }
      continue;
    }
    // Repo de produto ARMADO: o named workflow precisa RESOLVER (.claude/workflows/) — a gênese instala.
    if (ctx.isArmed) {
      if (!ctx.has(INSTALLED)) bad(`${INSTALLED} ausente — workflow('${name}') não resolveria (a gênese deveria instalá-lo)`);
      else if (!isWorkflow(ctx.read(INSTALLED), name)) bad(`${INSTALLED} não é um workflow válido`);
      else ok(`grafo contratado ${name} instalado e resolvível`);
    } else {
      skip(`repo de produto não armado (${name})`);
    }
  }
}

// ---- F6 · Footprint declarado em todo plano de feature (ADR-0007) ---------------------------------
// Torna executável a restrição "todo plano de feature declara footprint" (ADR-0007). Sem footprint
// bem-formado, o agendador ciente de conflito (scripts/plan-batch.mjs) trata a demanda como sobreposta
// e serializa à toa — ou pior, duas demandas colidem no merge. É a pré-condição da concorrência segura.
function f6_footprintDeclared({ ctx, ok, bad, skip }) {
  const base = join(ctx.root, 'docs/sdd/features');
  if (!existsSync(base)) return skip('sem docs/sdd/features/');
  const dirs = readdirSync(base).filter((d) => existsSync(join(base, d, 'plan.md')));
  if (!dirs.length) return skip('nenhum plan.md de feature');
  let good = 0;
  let ruins = 0;
  for (const d of dirs) {
    const txt = readFileSync(join(base, d, 'plan.md'), 'utf8');
    const m = /```footprint\s*([\s\S]*?)```/.exec(txt);
    if (!m) { bad(`docs/sdd/features/${d}/plan.md: sem bloco \`\`\`footprint (ADR-0007 exige footprint de escrita)`); ruins++; continue; }
    // ≥1 entrada sob writes:
    const writes = [];
    let inW = false;
    for (const raw of m[1].split('\n')) {
      const line = raw.replace(/#.*$/, '');
      if (/^\s*writes:\s*$/.test(line)) { inW = true; continue; }
      if (inW) { const it = /^\s*-\s+(.+)$/.exec(line); if (it) writes.push(it[1].trim()); else if (line.trim() && !/^\s/.test(raw)) inW = false; }
    }
    if (!writes.length) { bad(`docs/sdd/features/${d}/plan.md: bloco footprint sem nenhuma superfície sob \`writes:\``); ruins++; }
    else good++;
  }
  if (good && !ruins) ok(`${good} plano(s) com footprint de escrita bem-formado`);
  else if (good) ok(`${good} plano(s) com footprint`);
}

// ---- F7 · Trava de política íntegra (ADR-0020) ----------------------------------------------------
// O ponto cego que a trava fecha: com auto-merge, o caminho mais barato para o verde é BAIXAR A RÉGUA
// (esvaziar uma fitness function, afrouxar `tdd_mode`/`verification_mode`/`autonomy_level`, editar o
// `ci.yml`). Os hooks barram push em main/develop; não barram afrouxar o gate DENTRO do PR. Aqui, sim.
async function f7_policyLock({ ctx, ok, bad, skip }) {
  const { estado, findings } = await checkPolicy(ctx.root);
  if (estado === 'ausente') return skip(`sem ${LOCK_REL} (rode: node scripts/policy-lock.mjs --seal)`);
  for (const f of findings) bad(f.nivel === 'bloqueio' ? `AFROUXAMENTO — ${f.msg}` : `drift de política — ${f.msg}`);
  if (!findings.length) ok('trava de política íntegra (superfícies seladas · knobs de rigor só apertaram)');
}

// ---- registro -------------------------------------------------------------------------------------
export const CHECKS = [
  { id: 'F1', titulo: 'Trilha de ADR append-only', run: f1_adrTrail, fixtures: ['F1'] },
  { id: 'F2', titulo: 'Versão do plugin declarada e coerente', run: f2_pluginVersion, fixtures: ['F2'] },
  { id: 'F3', titulo: 'Genoma armado sem [A DEFINIR]', run: f3_genomeArmed, fixtures: ['F3'] },
  { id: 'F4', titulo: 'Acesso a dados atrás da porta (P-5)', run: f4_dataBehindPort, fixtures: ['F4'] },
  { id: 'F5', titulo: 'Grafos contratados (build-one-feature · build-many-features)', run: f5_contractedWorkflow, fixtures: ['F5'] },
  { id: 'F6', titulo: 'Footprint declarado em todo plano de feature (ADR-0007)', run: f6_footprintDeclared, fixtures: ['F6'] },
  { id: 'F7', titulo: 'Trava de política íntegra (ADR-0020)', run: f7_policyLock, fixtures: ['F7-digest', 'F7-knob'] },
];

// ---- execução -------------------------------------------------------------------------------------
async function runCheck(check, root, { quiet = false } = {}) {
  const errors = [];
  const say = (m) => { if (!quiet) console.log(m); };
  const api = {
    ctx: contexto(root),
    ok: (m) => say(`  ✓ ${m}`),
    bad: (m) => { errors.push(m); say(`  ✗ ${m}`); },
    skip: (m) => say(`  – ${m} (não se aplica a este repo)`),
  };
  try { await check.run(api); }
  catch (e) { errors.push(`check ${check.id} lançou: ${e.message}`); say(`  ✗ check ${check.id} lançou: ${e.message}`); }
  return errors;
}

async function modoCheck(root) {
  const errors = [];
  for (const check of CHECKS) {
    console.log(`== ${check.id} · ${check.titulo} ==`);
    errors.push(...(await runCheck(check, root)));
  }
  console.log('');
  if (errors.length) {
    console.error(`✗ FITNESS FALHOU: ${errors.length} invariante(s) violada(s).`);
    return 1;
  }
  console.log('✓ Fitness functions ok (invariantes preservadas).');
  return 0;
}

// VERIFY (ADR-0020): a regra tem de DISPARAR contra o menor repo que a viola. Silêncio = regra morta.
async function modoVerify(soRegra) {
  const alvo = CHECKS.filter((c) => !soRegra || c.id === soRegra);
  if (!alvo.length) { console.error(`✗ regra desconhecida: ${soRegra}`); return 1; }
  const falhas = [];
  for (const check of alvo) {
    if (!check.fixtures || !check.fixtures.length) {
      falhas.push(`${check.id}: sem fixture de mutação — regra NÃO PROVADA (ADR-0020)`);
      console.log(`  ✗ ${check.id} · ${check.titulo} — sem fixture de mutação`);
      continue;
    }
    for (const fx of check.fixtures) {
      const dir = join(FIXTURES, fx);
      if (!existsSync(dir)) {
        falhas.push(`${check.id}: fixture ausente em scripts/fitness-fixtures/${fx}/`);
        console.log(`  ✗ ${check.id} ← ${fx} — fixture ausente`);
        continue;
      }
      const errors = await runCheck(check, dir, { quiet: true });
      if (errors.length) console.log(`  ✓ ${check.id} ← ${fx} — disparou: ${errors[0]}`);
      else {
        falhas.push(`${check.id}: NÃO DISPAROU contra a mutação ${fx} — regra inerte (glob que não casa, regex furado, guarda invertida)`);
        console.log(`  ✗ ${check.id} ← ${fx} — NÃO DISPAROU (regra inerte)`);
      }
    }
  }
  console.log('');
  if (falhas.length) {
    console.error(`✗ VERIFY FALHOU: ${falhas.length} regra(s) sem prova de que disparam.`);
    for (const f of falhas) console.error(`   · ${f}`);
    return 1;
  }
  console.log(`✓ Verify ok — ${alvo.length} regra(s) provada(s) contra suas mutações.`);
  return 0;
}

const invocadoDiretamente = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
// IIFE async (e NÃO top-level await): a F7 importa este registro de volta via `policy-lock.mjs`. Com
// TLA, a avaliação deste módulo ficaria pendente e o ciclo travaria em silêncio.
if (invocadoDiretamente) void (async () => {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--rule');
  const code = argv.includes('--verify')
    ? await modoVerify(i !== -1 ? argv[i + 1] : null)
    : await modoCheck(SELF_ROOT);
  process.exit(code);
})();
