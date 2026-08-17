#!/usr/bin/env node
// plan-batch — agendador CIENTE DE CONFLITO (ADR-0007, item de alavancagem 1). Lê o FOOTPRINT de
// escrita declarado em cada `docs/sdd/features/NNN-*/plan.md` e devolve o MAIOR lote de features cujas
// superfícies são DISJUNTAS (podem rodar em paralelo sem colidir), respeitando o `wip_limit`. As que
// sobrepõem ficam para uma próxima rodada. Zero dependências. Determinístico (não é palpite de IA).
//
//   node scripts/plan-batch.mjs [--wip N] [--only 001,003] [--json] [--self-test]
//
// O `/daily-build` chama isto ANTES de fanar out: em vez de pegar as N primeiras por prioridade (FIFO,
// que pode juntar duas que brigam pelo mesmo arquivo), pega o maior subconjunto que NÃO briga. É a
// diferença entre "sortear tarefas" e "agrupar para ninguém ficar na mesma parede ao mesmo tempo".
//
// QUANDO CHAMAR (ADR-0019 §4): DEPOIS da fase PLAN das demandas da rodada — o footprint vive no
// `plan.md`, que só existe quando o `architect` já rodou. Chamar antes (issue recém-criada pelo PO)
// devolvia lote VAZIO e o paralelismo caía no "pega as N primeiras", justamente o que o ADR-0007 evita.
// Por isso o grafo pai (`build-many-features.mjs`) planeja todas em paralelo e só então agenda; este
// script continua sendo a ESPECIFICAÇÃO CANÔNICA da regra de conflito (e a checagem offline/CI dela).
// Demanda pedida em `--only` que ainda NÃO tem `plan.md` sai em `unplanned` — sinal explícito de
// "planeje antes", nunca omissão silenciosa.
//
// Formato do footprint (bloco ```footprint no plan.md, ver docs/sdd/templates/plan-template.md):
//   ```footprint
//   issue: 42            # opcional — permite casar --only por NÚMERO DE ISSUE, não só pelo id SDD
//   writes:
//     - src/api/orders/**
//     - src/domain/order.ts
//   backend-frontend: disjunto
//   ```

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- args -----------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return def;
  const eq = argv[i].indexOf('=');
  return eq !== -1 ? argv[i].slice(eq + 1) : (argv[i + 1] ?? def);
};
const WIP = Math.max(1, parseInt(getArg('wip', '2'), 10) || 2);
const ONLY = (getArg('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const AS_JSON = argv.includes('--json');

// ---- geometria de superfícies (a regra de sobreposição) -------------------------------------------
// Normaliza uma superfície para {type:'file'|'dir', base}. Regra CONSERVADORA (na dúvida, sobrepõe →
// serializa — a direção segura do ADR-0007): globs viram o diretório-prefixo antes do 1º `*`; caminho
// com extensão no último segmento é arquivo; o resto é diretório (subárvore inteira).
function norm(surface) {
  let s = String(surface).trim().replace(/^\.\//, '').replace(/\/+$/, '');
  const star = s.indexOf('*');
  if (star !== -1) return { type: 'dir', base: s.slice(0, star).replace(/\/+$/, '') };
  const last = s.split('/').pop();
  if (/\.[A-Za-z0-9]+$/.test(last)) return { type: 'file', base: s };
  return { type: 'dir', base: s };
}
// `p` está sob `base`? base vazia ('' de um glob `**`) cobre tudo.
const under = (p, base) => base === '' || p === base || p.startsWith(base + '/');

function overlap(a, b) {
  const x = norm(a), y = norm(b);
  if (x.type === 'file' && y.type === 'file') return x.base === y.base;      // arquivos distintos NÃO brigam
  if (x.type === 'dir' && y.type === 'dir') return under(x.base, y.base) || under(y.base, x.base);
  const f = x.type === 'file' ? x : y;                                       // um arquivo, um diretório
  const d = x.type === 'dir' ? x : y;
  return under(f.base, d.base);
}
function conflict(fa, fb) {
  for (const a of fa.writes) for (const b of fb.writes) if (overlap(a, b)) return { a, b };
  return null;
}

// ---- parse dos footprints dos planos --------------------------------------------------------------
function parseFootprint(planText) {
  const m = /```footprint\s*([\s\S]*?)```/.exec(planText);
  if (!m) return null;
  const body = m[1];
  const writes = [];
  const issueM = /^\s*issue:\s*#?(\d+)\s*$/m.exec(body);   // casamento por nº de issue (opcional)
  let inWrites = false;
  for (const raw of body.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();          // tira comentário
    if (/^\s*writes:\s*$/.test(line)) { inWrites = true; continue; }
    if (inWrites) {
      const item = /^\s*-\s+(.+)$/.exec(line);
      if (item) { writes.push(item[1].trim()); continue; }
      if (line.trim() && !/^\s/.test(raw)) inWrites = false;  // saiu do bloco writes
    }
  }
  return { writes, issue: issueM ? issueM[1] : null };
}

function loadFeatures() {
  const base = join(ROOT, 'docs/sdd/features');
  if (!existsSync(base)) return [];
  const feats = [];
  for (const d of readdirSync(base)) {
    const dir = join(base, d);
    const plan = join(dir, 'plan.md');
    if (!statSync(dir).isDirectory() || !existsSync(plan)) continue;
    const id = (/^(\d+)/.exec(d) || [, d])[1];
    const fp = parseFootprint(readFileSync(plan, 'utf8'));
    // `--only` casa pelo id SDD, pelo nome do diretório OU pelo `issue:` declarado no footprint — o
    // driver raciocina em número de ISSUE, o diretório é numerado por feature; sem esta ponte o filtro
    // silenciosamente não casava nada.
    if (ONLY.length && !ONLY.includes(id) && !ONLY.includes(d) && !(fp?.issue && ONLY.includes(fp.issue))) continue;
    feats.push({ id, issue: fp?.issue ?? null, dir: `docs/sdd/features/${d}`, writes: fp ? fp.writes : null });
  }
  return feats.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// O que o chamador pediu em `--only` e NÃO existe como plano — a demanda ainda não passou pela fase
// PLAN. Não é "adiada por conflito": é "ainda não planejada" (ADR-0019 §4). Buckets distintos porque a
// ação do driver é distinta — uma volta na próxima rodada, a outra precisa PLANEJAR antes.
function unplanned(found) {
  if (!ONLY.length) return [];
  const known = new Set(found.flatMap((f) => [f.id, f.issue].filter(Boolean)));
  return ONLY.filter((o) => !known.has(o));
}

// ---- agendamento: maior conjunto disjunto sob o WIP (guloso, ordem estável) ------------------------
function schedule(features, wip) {
  const batch = [], deferred = [];
  for (const f of features) {
    if (!f.writes || !f.writes.length) { deferred.push({ id: f.id, reason: 'sem footprint declarado (trate como sobreposto — ADR-0007)' }); continue; }
    if (batch.length >= wip) { deferred.push({ id: f.id, reason: `WIP cheio (${wip})` }); continue; }
    let clash = null;
    for (const g of batch) { const c = conflict(f, g); if (c) { clash = { g, c }; break; } }
    if (clash) deferred.push({ id: f.id, reason: `footprint sobreposto com ${clash.g.id} (${clash.c.a} ~ ${clash.c.b})` });
    else batch.push(f);
  }
  return { batch, deferred };
}

// ---- self-test (validação da regra de sobreposição; não roda no fluxo normal) ---------------------
function selfTest() {
  const cases = [
    ['src/api/**', 'src/api/orders.ts', true, 'dir contém arquivo'],
    ['src/domain/order.ts', 'src/domain/customer.ts', false, 'arquivos distintos no mesmo dir NÃO brigam'],
    ['src/api/**', 'src/web/**', false, 'árvores irmãs disjuntas'],
    ['src/api/orders/**', 'src/api/**', true, 'dirs aninhados'],
    ['a/*.ts', 'a/b.ts', true, 'glob do dir a vs arquivo em a'],
    ['docs/x.md', 'docs/x.md', true, 'mesmo arquivo'],
    ['**', 'qualquer/x.ts', true, 'glob total cobre tudo'],
    ['src/domain/', 'src/domain/order.ts', true, 'dir concreto contém arquivo'],
  ];
  let fails = 0;
  for (const [a, b, exp, desc] of cases) {
    const got = overlap(a, b);
    const ok = got === exp;
    if (!ok) fails++;
    console.log(`  ${ok ? '✓' : '✗'} overlap(${a}, ${b}) = ${got} (esperado ${exp}) — ${desc}`);
  }
  // agendamento sintético: 3 features, A e C brigam, B disjunta
  const feats = [
    { id: 'A', writes: ['src/api/**'] },
    { id: 'B', writes: ['web/ui/**'] },
    { id: 'C', writes: ['src/api/orders.ts'] },
  ];
  const { batch } = schedule(feats, 3);
  const ids = batch.map((f) => f.id).join(',');
  const okSched = ids === 'A,B';   // C é adiada por brigar com A; WIP=3 mas conflito manda
  if (!okSched) fails++;
  console.log(`  ${okSched ? '✓' : '✗'} lote disjunto = [${ids}] (esperado [A,B]; C serializa por brigar com A)`);
  console.log(fails ? `\n✗ SELF-TEST FALHOU: ${fails} caso(s).` : '\n✓ self-test ok.');
  process.exit(fails ? 1 : 0);
}

// ---- main -----------------------------------------------------------------------------------------
if (argv.includes('--self-test')) selfTest();

const features = loadFeatures();
const { batch, deferred } = schedule(features, WIP);
const naoPlanejadas = unplanned(features);

if (AS_JSON) {
  console.log(JSON.stringify({ wip: WIP, batch: batch.map((f) => f.id), deferred, unplanned: naoPlanejadas }, null, 2));
} else {
  console.log(`== Lote paralelo (wip_limit=${WIP}) — footprints disjuntos ==`);
  if (!features.length) console.log('  (nenhuma feature com plan.md encontrada)');
  for (const f of batch) console.log(`  ▶ ${f.id}  [${f.writes.join(', ')}]`);
  if (deferred.length) {
    console.log('\n== Adiadas para a próxima rodada ==');
    for (const d of deferred) console.log(`  ⏸ ${d.id} — ${d.reason}`);
  }
  if (naoPlanejadas.length) {
    console.log('\nAinda SEM plano (rode a fase PLAN antes de agendar — ADR-0019 §4):');
    for (const id of naoPlanejadas) console.log(`  ✎ ${id} — sem docs/sdd/features/*/plan.md`);
  }
  console.log(`\nResumo: ${batch.length} em paralelo, ${deferred.length} adiada(s), ${naoPlanejadas.length} não planejada(s).`);
}
