// build-many-features — grafo PAI da rodada (Escala 2 do docs/token-efficiency.md §4 · ADR-0003/0019)
//
// Realiza NO MOTOR o que antes era só prosa nos drivers (`/daily-build`, `/kickoff`): construir N
// features na MESMA orquestração, compondo o subgrafo contratado `build-one-feature` (aninhamento
// pai→filho, o único nível permitido pelo ADR-0010 §3).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// POR QUE UM PAI, E NÃO N INVOCAÇÕES SOLTAS (§4 Escala 2)
//   (a) BUNDLE COMPARTILHADO derivado 1× — contexto base + índice de repo + audit de deps + digest de
//       market-scan. Passado read-through a cada feature: é FATO, não raciocínio, então o isolamento
//       (P-11/P-13) fica intacto e o prompt cache vale ENTRE features, não só entre etapas de uma.
//   (b) TETO POR FEATURE — `budget_per_feature` como guarda de borda (o filho mede o DELTA do próprio
//       gasto, ADR-0019 §2); `daily_budget` continua o teto global (`budget.total`).
//   (c) MERGE SERIALIZADO — paralelo na construção, serial no merge em `develop`. Este workflow NÃO
//       mergeia: devolve as features prontas e o driver mergeia uma a uma, rebaseando.
//   (d) AGENDAMENTO EM DUAS ETAPAS (ADR-0019 §4) — PLANEJA todas em paralelo, COLHE o footprint real
//       de cada `plan.md`, e só então agenda o IMPLEMENT em ondas de footprint disjunto. Antes o
//       agendador ciente de conflito (`scripts/plan-batch.mjs`) rodava ANTES da fase PLAN, lendo um
//       `plan.md` que ainda não existia: para issue nova o lote saía vazio ("sem footprint declarado")
//       e o paralelismo caía no "pega as N primeiras", exatamente o que o ADR-0007 quer evitar.
//
// CONTRATO
//   Entrada (args): {
//     features: [{ issue, contextMapLine?, routing?, footprint?, fastPathElegivel?, comportamento?,
//                  tier?, uiSignificativa?, efeitoDeAltoValor? }],
//     sharedBundle?, fanOut?, budgetPerFeature?, dailyBudget?, maxRerunAttempts?,
//     contextClearPolicy?, tddMode?, sliceFanout?, testCmd?, testScopedCmd?, testScope?,
//     fastPath?, verificationMode?, adversarialPanelSize?, uncertaintyEscalation?, autonomyLevel?,
//     schedule?,               // 'two-stage' (default) | 'off' (footprints já vêm prontos no args)
//   }
//   Saída: { rodada: [...resultado contratado de cada feature], prontasParaMerge: [...] }
//
// O QUE ESTE WORKFLOW NÃO FAZ (de propósito)
//   · Não escolhe features (o `product-owner` já decidiu o QUÊ).
//   · Não mergeia nem promove (P-10/ADR-0006: o fluxo git é do driver, com gate).
//   · Não fatia o gate: cada feature roda o seu adversarial + security UMA vez, dentro do filho.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'build-many-features',
  description: 'Grafo pai da rodada: bundle compartilhado 1×, PLANEJA todas em paralelo, agenda o implement por footprint disjunto e compõe build-one-feature por feature (ADR-0003/0010/0018/0019)',
  phases: [
    { title: 'Bundle' },
    { title: 'Plan' },
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
  tddMode = 'estrito',
  sliceFanout = 'on',
  testCmd = null,
  testScopedCmd = null,
  testScope = 'impacted',
  fastPath = 'on',
  verificationMode = 'single',
  adversarialPanelSize = 3,
  uncertaintyEscalation = 'on',
  autonomyLevel = 'conservador',
  schedule = 'two-stage',
} = args ?? {}

if (!features.length) return { rodada: [], nota: 'nenhuma feature elegível na rodada' }

// ── GEOMETRIA DE CONFLITO (espelha scripts/plan-batch.mjs — lá vive a especificação canônica) ────────
// Duplicada aqui porque o sandbox de workflow não importa módulos. Regra CONSERVADORA: na dúvida,
// sobrepõe (serializa) — a direção segura do ADR-0007. Footprint ausente ⇒ conflita com tudo.
const norm = (s0) => {
  const s = String(s0).trim().replace(/^\.\//, '').replace(/\/+$/, '')
  const star = s.indexOf('*')
  if (star !== -1) return { type: 'dir', base: s.slice(0, star).replace(/\/+$/, '') }
  const last = s.split('/').pop()
  return /\.[A-Za-z0-9]+$/.test(last) ? { type: 'file', base: s } : { type: 'dir', base: s }
}
const under = (p, base) => base === '' || p === base || p.startsWith(base + '/')
const overlap = (a, b) => {
  const x = norm(a), y = norm(b)
  if (x.type === 'file' && y.type === 'file') return x.base === y.base
  if (x.type === 'dir' && y.type === 'dir') return under(x.base, y.base) || under(y.base, x.base)
  const f = x.type === 'file' ? x : y, d = x.type === 'dir' ? x : y
  return under(f.base, d.base)
}
const conflita = (fa, fb) => {
  const A = fa.footprint ?? [], B = fb.footprint ?? []
  if (!A.length || !B.length) return true            // footprint ausente/ambíguo ⇒ trate como sobreposto
  return A.some(a => B.some(b => overlap(a, b)))
}
// Ondas de features: guloso, ordem estável, teto de `fanOut` por onda (o mais apertado de
// parallelism/wip_limit/orçamento, calculado pelo sdd-orchestrator).
const ondasDeFeatures = (fs, teto) => {
  const ondas = []
  let pend = [...fs]
  while (pend.length) {
    const onda = []
    const resto = []
    for (const f of pend) {
      if (onda.length >= teto || onda.some(g => conflita(f, g))) { resto.push(f); continue }
      onda.push(f)
    }
    ondas.push(onda)
    pend = resto
  }
  return ondas
}

const filhoArgs = (f) => ({
  issue: f.issue,
  fixedContext: `${typeof bundle === 'string' ? bundle : JSON.stringify(bundle)}\n\n## Contexto do domínio desta feature\n${f.contextMapLine ?? '(o orchestrator não citou linha — carregue a linha do context-map que casa por tag)'}`,
  routing: f.routing ?? {},
  budgetPerFeature, maxRerunAttempts, contextClearPolicy, tddMode, sliceFanout,
  testCmd, testScopedCmd, testScope,
  fastPath, fastPathElegivel: f.fastPathElegivel ?? false,
  comportamento: f.comportamento ?? 'cria',
  verificationMode, adversarialPanelSize, uncertaintyEscalation, autonomyLevel,
  tier: f.tier ?? 'medio',
  uiSignificativa: f.uiSignificativa ?? false,
  efeitoDeAltoValor: f.efeitoDeAltoValor ?? false,
})

// ── 1 · PRÉ-FASE: bundle de recursos compartilhado, derivado UMA vez ────────────────────────────────
// Barreira legítima: TODA feature depende deste resultado. Derivar N× o mesmo índice/audit seria pagar
// N× por um fato idêntico (§6).
phase('Bundle')
const bundle = sharedBundle ?? await agent(
  `Derive o BUNDLE COMPARTILHADO desta rodada — fato datado, sem julgamento nem raciocínio de decisão:\n` +
  `1. BLOCO DE CONTEXTO FIXO base: CLAUDE.md + docs/sdd/constitution.md (cite, não copie inteiro).\n` +
  `2. Índice de repo/símbolos dos módulos que as features tocam.\n` +
  `3. Audit de dependências (versões, CVEs conhecidas) — uma varredura serve a todas.\n` +
  `4. Digest de docs/product/market-scan.md, se existir e estiver fresco.\n` +
  `Retorno ENXUTO (§3): ponteiros, não conteúdo. Isto será lido read-through por TODAS as features.`,
  { phase: 'Bundle', label: 'bundle-compartilhado', model: 'haiku', effort: 'low' })

const rodada = []
const chamarFilho = async (f, stage) => {
  try { return await workflow('build-one-feature', { ...filhoArgs(f), stage }) }
  catch (e) {
    // Uma feature que morre NÃO derruba o lote (ADR-0003): vira achado triável, as vizinhas seguem.
    return { status: 'blocked', issue: String(f.issue), touched: [], reason: `subgrafo falhou (${stage}): ${String(e?.message ?? e)}` }
  }
}

// ── 2 · PLANEJAMENTO EM PARALELO → COLHEITA DO FOOTPRINT (ADR-0019 §4) ──────────────────────────────
// spec/plan escrevem só nos PRÓPRIOS docs (`docs/sdd/features/NNN-*`) ⇒ não há conflito de superfície,
// paralelizam sem restrição de WIP (ADR-0007). É desta fase que sai o footprint que agenda o implement.
let aConstruir = features
if (schedule === 'two-stage') {
  phase('Plan')
  const planejaveis = features.filter(f => !(f.fastPathElegivel && fastPath === 'on') && !(f.footprint?.length))
  if (planejaveis.length) {
    const planos = await parallel(planejaveis.map(f => () => chamarFilho(f, 'plan')))
    planejaveis.forEach((f, i) => {
      const p = planos[i]
      if (p?.status === 'plan-ready') { f.footprint = p.footprint ?? [] ; return }
      rodada.push(p ?? { status: 'blocked', issue: String(f.issue), touched: [], reason: 'planejamento sem retorno' })
      f.__parou = true                            // não segue ao implement; já tem veredito na rodada
    })
    const semFootprint = planejaveis.filter(f => !f.__parou && !f.footprint?.length).map(f => f.issue)
    if (semFootprint.length) log(`sem footprint declarado no plan.md (#${semFootprint.join(', #')}) — tratadas como SOBREPOSTAS e serializadas (ADR-0007, conservador)`)
  }
  aConstruir = features.filter(f => !f.__parou)
}

// ── 3 · IMPLEMENT EM ONDAS DE FOOTPRINT DISJUNTO ───────────────────────────────────────────────────
phase('Features')
const teto = fanOut != null ? Math.max(1, fanOut) : aConstruir.length
const ondas = schedule === 'two-stage' ? ondasDeFeatures(aConstruir, teto) : [aConstruir.slice(0, teto)]
log(`${aConstruir.length} feature(s) em ${ondas.length} onda(s) (teto de fan-out: ${teto}) — merge em develop SEMPRE serializado pelo driver`)

for (let i = 0; i < ondas.length; i++) {
  const onda = ondas[i]
  log(`onda ${i + 1}/${ondas.length}: #${onda.map(f => f.issue).join(' ‖ #')}`)
  const rs = await parallel(onda.map(f => () => {
    // GUARDA DE BORDA global: o pool é compartilhado, então checamos ANTES de abrir mais uma frente.
    if (budgetPerFeature != null && budget.total && budget.remaining() < budgetPerFeature) {
      log(`orçamento restante não cobre mais uma feature (#${f.issue}) — para aqui, sem estourar o teto global`)
      return Promise.resolve({ status: 'awaiting-human', issue: String(f.issue), touched: [], reason: 'orçamento da rodada esgotado antes de iniciar' })
    }
    return chamarFilho(f, schedule === 'two-stage' ? 'build' : 'full')
  }))
  onda.forEach((f, j) => rodada.push(rs[j] ?? { status: 'blocked', issue: String(f.issue), touched: [], reason: 'subgrafo sem retorno' }))
}

const prontas = rodada.filter(r => r.status === 'merged-ready')
log(`rodada: ${prontas.length}/${rodada.length} prontas para merge (o merge em develop é SERIALIZADO pelo driver)`)

// O pai devolve FATO; quem mergeia, promove e comenta no board é o driver (gate + fluxo git, P-10).
return { rodada, prontasParaMerge: prontas.map(r => r.issue) }
