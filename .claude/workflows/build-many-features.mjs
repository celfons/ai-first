// build-many-features — grafo PAI da rodada (Escala 2 do docs/token-efficiency.md §4 · ADR-0003)
//
// Realiza NO MOTOR o que antes era só prosa nos drivers (`/daily-build`, `/kickoff`): construir N
// features na MESMA orquestração, compondo o subgrafo contratado `build-one-feature` uma vez por
// feature (aninhamento pai→filho, o único nível permitido pelo ADR-0010 §3).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// POR QUE UM PAI, E NÃO N INVOCAÇÕES SOLTAS (§4 Escala 2)
//   (a) BUNDLE COMPARTILHADO derivado 1× — contexto base + índice de repo + audit de deps + digest de
//       market-scan. Passado read-through a cada feature: é FATO, não raciocínio, então o isolamento
//       (P-11/P-13) fica intacto e o prompt cache vale ENTRE features, não só entre etapas de uma.
//   (b) TETO POR FEATURE — `budget_per_feature` como guarda de borda: o pool de token é COMPARTILHADO
//       (o aninhamento não isola orçamento — ADR-0010 §3), então quem estoura PARA sozinha e as
//       vizinhas seguem. `daily_budget` continua o teto global (`budget.total`).
//   (c) MERGE SERIALIZADO — paralelo na construção, serial no merge em `develop`. Este workflow NÃO
//       mergeia: devolve as features prontas em ORDEM e o driver mergeia uma a uma, rebaseando.
//
// CONTRATO
//   Entrada (args): {
//     features: [{ issue, contextMapLine?, routing?, ... }],   // já filtradas/priorizadas pelo driver
//     sharedBundle?,            // se o driver já derivou o bundle, passa pronto (pula a pré-fase)
//     fanOut?,                  // min(parallelism, wip_limit, floor(budget/budget_per_feature))
//     budgetPerFeature?, dailyBudget?, maxRerunAttempts?,
//     contextClearPolicy?, verificationParallelism?, tddMode?, sliceFanout?,
//     testCmd?, testScopedCmd?, testScope?,
//   }
//   Saída (ROUND_RESULT_SCHEMA-shaped): { rodada: [...resultado contratado de cada feature] } —
//   o driver trata como FATO validado e decide o merge.
//
// O QUE ESTE WORKFLOW NÃO FAZ (de propósito)
//   · Não escolhe features (o `product-owner` e o `plan-batch.mjs` já decidiram — footprint disjunto).
//   · Não mergeia nem promove (P-10/ADR-0006: o fluxo git é do driver, com gate).
//   · Não fatia o gate: cada feature roda o seu painel + security UMA vez, dentro do filho.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'build-many-features',
  description: 'Grafo pai da rodada: deriva o bundle compartilhado 1× e compõe build-one-feature por feature, com teto por feature e merge deixado ao driver (ADR-0003/0010/0018)',
  phases: [
    { title: 'Bundle' },
    { title: 'Features' },
  ],
}

const {
  features = [],
  sharedBundle = null,
  fanOut = null,
  budgetPerFeature = null,
  maxRerunAttempts = 2,
  contextClearPolicy = 'seam',
  verificationParallelism = 'staged',
  tddMode = 'estrito',
  sliceFanout = 'on',
  testCmd = null,
  testScopedCmd = null,
  testScope = 'impacted',
} = args ?? {}

if (!features.length) return { rodada: [], nota: 'nenhuma feature elegível na rodada' }

// ── 1 · PRÉ-FASE: bundle de recursos compartilhado, derivado UMA vez ────────────────────────────────
// Barreira legítima: TODA feature depende deste resultado. É o único ponto do grafo onde a barreira
// paga — derivar N× o mesmo índice/audit seria pagar N× por um fato idêntico (§6).
phase('Bundle')
const bundle = sharedBundle ?? await agent(
  `Derive o BUNDLE COMPARTILHADO desta rodada — fato datado, sem julgamento nem raciocínio de decisão:\n` +
  `1. BLOCO DE CONTEXTO FIXO base: CLAUDE.md + docs/sdd/constitution.md (cite, não copie inteiro).\n` +
  `2. Índice de repo/símbolos dos módulos que as features tocam.\n` +
  `3. Audit de dependências (versões, CVEs conhecidas) — uma varredura serve a todas.\n` +
  `4. Digest de docs/product/market-scan.md, se existir e estiver fresco.\n` +
  `Retorno ENXUTO (§3): ponteiros, não conteúdo. Isto será lido read-through por TODAS as features.`,
  { phase: 'Bundle', label: 'bundle-compartilhado', model: 'haiku', effort: 'low' })

// ── 2 · FAN-OUT DE FEATURES ────────────────────────────────────────────────────────────────────────
// A `feature` é a dimensão externa. Cada uma é o subgrafo contratado inteiro, isolado, com o bundle
// injetado e o teto próprio. `pipeline()` (sem barreira): uma feature pode estar no gate enquanto
// outra ainda implementa — o wall-clock é o da feature mais lenta, não a soma.
phase('Features')
const alvo = fanOut != null ? features.slice(0, Math.max(0, fanOut)) : features
if (alvo.length < features.length) {
  log(`fan-out limitado a ${alvo.length}/${features.length} features (parallelism/wip_limit/orçamento) — as demais voltam à próxima rodada`)
}

const resultados = await pipeline(alvo, async (f, _orig, i) => {
  // GUARDA DE BORDA global: o pool é compartilhado, então checamos ANTES de abrir mais uma frente.
  // Sem isto, N features abertas em paralelo furariam o `daily_budget` juntas (ADR-0009 §3).
  if (budgetPerFeature != null && budget.total && budget.remaining() < budgetPerFeature) {
    log(`orçamento restante não cobre mais uma feature (${f.issue}) — para aqui, sem estourar o teto global`)
    return { status: 'awaiting-human', issue: String(f.issue), touched: [], reason: 'orçamento da rodada esgotado antes de iniciar' }
  }
  log(`feature ${i + 1}/${alvo.length}: #${f.issue}`)
  try {
    // Aninhamento pai→filho (1 nível — ADR-0010 §3): o filho é o subgrafo CONTRATADO; consumimos o
    // retorno como fato validado, nunca como texto solto.
    return await workflow('build-one-feature', {
      issue: f.issue,
      // O bloco fixo da feature = bundle compartilhado + a linha do context-map DELA (o que varia).
      fixedContext: `${typeof bundle === 'string' ? bundle : JSON.stringify(bundle)}\n\n## Contexto do domínio desta feature\n${f.contextMapLine ?? '(o orchestrator não citou linha — carregue a linha do context-map que casa por tag)'}`,
      routing: f.routing ?? {},
      budgetPerFeature,
      maxRerunAttempts,
      contextClearPolicy,
      verificationParallelism,
      tddMode,
      sliceFanout,
      testCmd,
      testScopedCmd,
      testScope,
    })
  } catch (e) {
    // Uma feature que morre NÃO derruba o lote (ADR-0003): vira achado triável, as vizinhas seguem.
    return { status: 'blocked', issue: String(f.issue), touched: [], reason: `subgrafo falhou: ${String(e?.message ?? e)}` }
  }
})

const rodada = resultados.filter(Boolean)
const prontas = rodada.filter(r => r.status === 'merged-ready')
log(`rodada: ${prontas.length}/${rodada.length} prontas para merge (o merge em develop é SERIALIZADO pelo driver)`)

// O pai devolve FATO; quem mergeia, promove e comenta no board é o driver (gate + fluxo git, P-10).
return { rodada, prontasParaMerge: prontas.map(r => r.issue) }
