// build-one-feature — sub-workflow CONTRATADO (ADR-0010 · ADR-0019)
//
// Subgrafo canônico "construir uma feature" (Escala 1 do docs/token-efficiency.md §4), reusável por
// composição: os drivers /feature, /daily-build, /kickoff e /migrate CHAMAM este workflow via
// workflow('build-one-feature', args) em vez de recopiar a cadeia spec→…→docs.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONTRATO
//   Entrada (args):  { issue, fixedContext, routing, budgetPerFeature, maxRerunAttempts, … }
//     · issue             — nº/refs da issue-alvo (requisito)
//     · fixedContext      — BLOCO DE CONTEXTO FIXO já montado pelo pai (§1): CLAUDE.md + constitution +
//                           linha(s) do context-map. Passado read-through; o filho NÃO relê (cache §1).
//     · routing           — plano de delegação do sdd-orchestrator: { etapa: {model, effort} } (§2).
//                           O orquestrador emite este objeto em bloco ```routing json (ADR-0019) — o
//                           driver o repassa VERBATIM; não há mais tradução "no olho" de prosa.
//     · budgetPerFeature  — teto de token DESTA feature (ADR-0003). GUARDA DE BORDA: o pool de token é
//                           compartilhado (o aninhamento NÃO isola orçamento — ADR-0010 §3), então o
//                           teto é medido aqui como DELTA desde a entrada do subgrafo (ADR-0019 §2):
//                           `budget.spent()` é o gasto do TURNO inteiro (todas as features), e compará-lo
//                           direto ao teto abortaria a 2ª feature em diante.
//     · maxRerunAttempts  — teto de re-run do loop de verificação (ADR-0009). Terminação explícita.
//     · contextClearPolicy — higiene de contexto working (ADR-0012 §8): 'seam' (default) limpa o rabo
//                           variável nas costuras (fim de slice/feature, entre re-runs → passa só o
//                           veredito) preservando o prefixo fixo cacheado; 'off' arrasta tudo (caro).
//     · tddMode           — laço INTERNO do implement (ADR-0015): 'estrito' (default) | 'pragmatico' |
//                           'off'. NÃO é etapa nem agente: o ciclo vermelho→verde→refatorar roda DENTRO
//                           da invocação do implementador, que devolve a `prova do vermelho`.
//     · sliceFanout       — fan-out por micro-slice (ADR-0017): 'on' (default) roda a fase DECOMPOSE e
//                           dá UMA INVOCAÇÃO POR SLICE (contexto estreito: só os arquivos dela).
//     · testCmd/testScopedCmd/testScope — escopo de teste escalado ao diff (ADR-0017 · Tier 1 do 0013).
//     — KNOBS LIGADOS NO MOTOR (ADR-0019 §3) — antes existiam só na prosa das skills:
//     · fastPath/fastPathElegivel — cerimônia escalada ao risco (ADR-0008). Elegível ⇒ COLAPSA a autoria
//                           (spec/plan/decompose/BDD). Os GATES não mudam.
//     · comportamento     — 'cria'|'altera'|'nenhum' (classificação do sdd-orchestrator). 'nenhum' PULA
//                           o `bdd-author` (ADR-0015: não há comportamento a contratar).
//     · verificationMode / adversarialPanelSize — 'single' (1 cético) vs 'panel' (N lentes). Antes o
//                           painel de 3 opus rodava SEMPRE, ignorando o knob.
//     · uncertaintyEscalation / tier / autonomyLevel — escalada por INCERTEZA (ADR-0005): etapa que
//                           devolve `confidence: baixa` escala ao humano, independentemente do tier.
//     · uiSignificativa   — inclui o `ux-designer` na fase DESIGN (paralelo:sim).
//     · implementerDefault — papel do implementador quando a slice não declara (ADR-0019 §6).
//     · stage             — 'full' (default) | 'plan' | 'build'. Permite ao pai rodar o PLANEJAMENTO de
//                           todas as features primeiro (só escrevem os próprios docs ⇒ sempre paralelos),
//                           COLHER o footprint real e só então agendar o implement por conflito
//                           (ADR-0007/0019 §4). Sem isso o agendador ciente de conflito era inerte:
//                           ele lê o footprint do `plan.md`, que só existe DEPOIS da fase PLAN.
//   Saída (FEATURE_RESULT_SCHEMA): veredito estruturado que o pai trata como FATO validado, não texto.
//
// LIMITES QUE O DESENHO ASSUME (ADR-0010):
//   · Aninhamento é de 1 nível: este workflow NÃO chama outro workflow(). O painel adversarial roda
//     aqui como parallel() de agent(), não como sub-workflow aninhado.
//   · Isolamento intacto (P-11/P-13): cada agent() é sessão limpa; adversarial/security cegos a quem
//     escreveu. Compartilha-se contrato/fato, nunca raciocínio.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'build-one-feature',
  description: 'Subgrafo canônico contratado: constrói UMA feature (spec→plan→implement→verificação→docs) — composto pelos drivers, não recopiado (ADR-0010/0019)',
  phases: [
    { title: 'Specify' },
    { title: 'Plan' },
    { title: 'Design' },
    { title: 'Decompose' },
    { title: 'Acceptance' },
    { title: 'Implement' },
    { title: 'Verify' },
    { title: 'Docs' },
  ],
}

// ── CONTRATOS DE SAÍDA — schema in / schema out (ADR-0019 §1) ───────────────────────────────────────
// O gate NÃO é parseado por regex em texto livre. O regex anterior (/BLOQUEIA|bloqueado|blocked/i)
// falhava nos DOIS sentidos: casava com a seção obrigatória "## Bloqueadores" de um veredito APROVA
// (todo merge virava re-run até `awaiting-human`) e NÃO casava com o `status: bug-encontrado` do
// `tester`, cujo contrato não tem a palavra (bug de produção passava o gate como não-bloqueante).
const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['veredito', 'resumo'],
  properties: {
    veredito: { enum: ['APROVA', 'APROVA-COM-RESSALVAS', 'BLOQUEIA'] },
    resumo: { type: 'string' },                                   // 1 frase
    bloqueadores: {                                               // preenchido SÓ quando BLOQUEIA
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['onde', 'cenario'],
        properties: {
          tipo: { enum: ['correção', 'segurança', 'invariante', 'teste', 'runtime'] },
          onde: { type: 'string' },                               // arquivo:linha
          cenario: { type: 'string' },                            // entrada → saída errada/efeito
          regressao: { type: 'string' },                          // o teste que deve nascer
        },
      },
    },
    ressalvas: { type: 'array', items: { type: 'string' } },
    confidence: { enum: ['alta', 'media', 'baixa'] },
  },
}

// Etapa de AUTORIA (spec/plan/implement): devolve fato + CONFIANÇA — é o que liga o
// `uncertainty_escalation` (ADR-0005) ao motor. Antes o campo `confidence` só existia na prosa.
const STEP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'confidence'],
  properties: {
    status: { enum: ['ok', 'bloqueado', 'precisa-humano'] },
    confidence: { enum: ['alta', 'media', 'baixa'] },
    resumo: { type: 'string' },
    tdd: { type: 'string' },                                      // prova do vermelho (ADR-0015)
    touched: { type: 'array', items: { type: 'string' } },        // ponteiros, não conteúdo (§3)
    footprint: { type: 'array', items: { type: 'string' } },      // superfícies de ESCRITA (ADR-0007)
    motivo: { type: 'string' },
  },
}

const FEATURE_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'issue', 'touched'],
  properties: {
    status: { enum: ['merged-ready', 'plan-ready', 'blocked', 'awaiting-human', 'budget-exceeded'] },
    issue: { type: 'string' },
    touched: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string' },
    footprint: { type: 'array', items: { type: 'string' } },      // devolvido pelo stage 'plan'
    confidence: { enum: ['alta', 'media', 'baixa'] },
    reason: { type: 'string' },
  },
}

// Contrato da DECOMPOSIÇÃO (ADR-0017) — o decompositor devolve DADO roteável, não prosa. `arquivos` é o
// FOOTPRINT (base da paralelização); `escopoDeTeste: full` marca a slice cujo diff derrota a seleção por
// impacto; `papel` roteia a slice ao implementador CERTO (ADR-0019 §6) — antes toda slice, inclusive UI
// e migração, caía no `backend-engineer`.
const SLICES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'slices'],
  properties: {
    status: { enum: ['decomposto', 'nao-decomposto'] },
    slices: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'titulo', 'arquivos', 'dependeDe', 'doneTest'],
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string' },
          arquivos: { type: 'array', items: { type: 'string' } },
          dependeDe: { type: 'array', items: { type: 'string' } },
          doneTest: { type: 'string' },
          rf: { type: 'string' },
          integracao: { type: 'boolean' },
          escopoDeTeste: { enum: ['impacted', 'full'] },
          papel: { enum: ['backend', 'frontend', 'data', 'prompt', 'sre'] },
        },
      },
    },
  },
}

const { issue, fixedContext, routing = {}, budgetPerFeature = null, maxRerunAttempts = 2,
        contextClearPolicy = 'seam', tddMode = 'estrito',
        sliceFanout = 'on', testCmd = null, testScopedCmd = null, testScope = 'impacted',
        // knobs ligados no motor (ADR-0019 §3)
        fastPath = 'on', fastPathElegivel = false, comportamento = 'cria',
        verificationMode = 'single', adversarialPanelSize = 3, uncertaintyEscalation = 'on',
        tier = 'medio', autonomyLevel = 'conservador', uiSignificativa = false,
        implementerDefault = 'backend-engineer', stage = 'full',
        verificationParallelism = 'staged' } = args ?? {}

// `flat` foi descontinuado (ADR-0019 §5): pagava o piso opus mesmo quando o tester reprovaria, num
// caminho alternativo dentro do gate mais crítico do método. Aceito por compatibilidade, ignorado.
if (verificationParallelism === 'flat') log('verification_parallelism: `flat` descontinuado (ADR-0019) — rodando `staged`')

const FAST = fastPath === 'on' && fastPathElegivel === true
const PLANEJA = stage === 'full' || stage === 'plan'   // 'build' entra direto na decomposição/implement
// Piso de risco: 🔴 e o modo sem gate humano forçam painel, mesmo com `verification_mode: single`.
const RISCO_ALTO = ['alto', '🔴', 'red'].includes(String(tier).toLowerCase())
const USA_PAINEL = verificationMode === 'panel' || RISCO_ALTO || autonomyLevel === 'autônomo' || autonomyLevel === 'autonomo'
// `fast_path` implica `comportamento: nenhum` por definição de elegibilidade (ADR-0008).
const RODA_BDD = !FAST && (comportamento === 'cria' || comportamento === 'altera')

// Laço interno (ADR-0015): instrução anexada a TODA etapa de implementação. Custa ciclos, não hops.
const TDD = tddMode === 'off'
  ? 'tdd_mode: off — test-after permitido. PISO INEGOCIÁVEL: correção de bug reproduz em VERMELHO antes da correção.'
  : `tdd_mode: ${tddMode} — rode o laço interno VERMELHO → VERDE → REFATORAR por comportamento${tddMode === 'pragmatico' ? ' (obrigatório em invariante/dinheiro/PII/efeito e em TODA correção de bug)' : ''}. Devolva a PROVA DO VERMELHO no campo \`tdd\`: qual teste falhou primeiro e por quê.`
// Helper: prefixa SEMPRE o bloco de contexto fixo (idêntico, primeiro) para cache de prompt (§1).
const withContext = (role, body) => `${fixedContext ?? ''}\n\n## Papel: ${role}\n${body}`
const route = (etapa, fallback) => routing[etapa] ?? fallback

// ── GUARDA DE BORDA DE ORÇAMENTO (ADR-0019 §2) ──────────────────────────────────────────────────────
// `budget.spent()` conta o TURNO inteiro — main loop + todos os workflows. Medimos o DELTA desde a
// entrada deste subgrafo; senão, assim que a 1ª feature consumisse o teto, a #2 e todas as seguintes
// abortariam com `budget-exceeded` já antes da spec.
const SPENT_AT_START = budget.spent()
const featureSpent = () => budget.spent() - SPENT_AT_START
const overBudget = () => budgetPerFeature != null && featureSpent() >= budgetPerFeature
const stop = (status, reason, extra = {}) => ({ status, issue: String(issue), touched: [String(issue)], reason, ...extra })

// ── ESCOPO DE TESTE ESCALADO AO DIFF (ADR-0017 · def. operacional do Tier 1 do ADR-0013) ────────────
const SUITE_COMPLETA = testCmd ? `\`${testCmd}\`` : 'a suíte completa do projeto (comando `test` do genoma §7)'
const FREIOS_DE_ESCOPO = `Freios (ADR-0017 §E, não relaxe): (a) se o diff toca migration/esquema, config, injeção de dependência, fixture ou snapshot ⇒ escopo FULL; (b) as suítes de invariante/segurança (P-3/P-5/P-6/P-7) entram no escopo mínimo SEMPRE, mesmo classificadas como "não relacionadas" — são as que quebram por acoplamento indireto; (c) sem comando de seleção disponível, degrade para a suíte do diretório do footprint e REPORTE a degradação (não finja que selecionou).`
const testeDaSlice = (slice) => {
  const forcaFull = testScope === 'full' || slice?.escopoDeTeste === 'full' || !testScopedCmd
  if (forcaFull) {
    const razao = testScope === 'full' ? 'knob test_scope: full'
      : slice?.escopoDeTeste === 'full' ? 'o diff desta slice derrota a seleção por impacto (migration/config/DI/fixture)'
      : 'o genoma não declara comando de seleção (`test (escopo)`) — modo DEGRADADO, reporte isso'
    return `ESCOPO DE TESTE: rode ${SUITE_COMPLETA} nos ciclos e ao fechar a slice — motivo: ${razao}. ${FREIOS_DE_ESCOPO}`
  }
  return `ESCOPO DE TESTE (ADR-0017): no laço interno vermelho→verde rode SÓ o teste relacionado aos arquivos que você tocou (\`${testScopedCmd} <arquivos>\`) — é o loop que roda dezenas de vezes. AO FECHAR a slice: typecheck + lint + a suíte do(s) módulo(s) do footprint (árvore verde, P-10). A suíte COMPLETA é do gate, não sua. ${FREIOS_DE_ESCOPO}`
}

// ── ESCALADA POR INCERTEZA (ADR-0005 · knob `uncertainty_escalation`) ───────────────────────────────
// Risco OU confiança, o maior. Uma etapa de autoria que volta `confidence: baixa` escala ao humano
// INDEPENDENTEMENTE do tier — rebaixa a 🟢 que o pipeline "quase não entendeu".
const incerta = (r) => uncertaintyEscalation === 'on' && r && (r.confidence === 'baixa' || r.status === 'precisa-humano')

// ── ONDAS DE EXECUÇÃO DO DAG DE SLICES (ADR-0017 §B) ────────────────────────────────────────────────
const planWaves = (slices) => {
  const fechadas = new Set()
  const waves = []
  let pendentes = slices.filter(s => !s.integracao)
  while (pendentes.length) {
    const prontas = pendentes.filter(s => (s.dependeDe ?? []).every(d => fechadas.has(d)))
    if (!prontas.length) throw new Error(`DAG de slices inválido (ciclo ou dependência inexistente): ${pendentes.map(s => s.id).join(', ')}`)
    const onda = []
    const tomados = new Set()
    for (const s of prontas) {
      const arquivos = s.arquivos ?? []
      if (arquivos.some(f => tomados.has(f))) continue
      arquivos.forEach(f => tomados.add(f))
      onda.push(s)
    }
    onda.forEach(s => fechadas.add(s.id))
    waves.push(onda)
    pendentes = pendentes.filter(s => !fechadas.has(s.id))
  }
  const integracao = slices.filter(s => s.integracao)
  if (integracao.length) waves.push(integracao)
  return waves
}

// ── VEREDITO ESTRUTURADO (ADR-0019 §1) ──────────────────────────────────────────────────────────────
// FAIL-CLOSED: agente morto/sem schema conta como BLOQUEIA. O gate nunca é aprovado por ausência.
const isBlocking = (v) => {
  if (v == null) return true
  if (typeof v === 'object') return v.veredito === 'BLOQUEIA'
  return /\bBLOQUEIA\b/.test(String(v))     // degradação: token exato, nunca substring de "Bloqueadores"
}
// Destila os bloqueios num FATO curto — é o que atravessa a costura de re-run (ADR-0012): o
// re-implement recebe ISTO, não o contexto inteiro da tentativa falha.
const blockingDigest = (results) => results.filter(isBlocking).flatMap(v => {
  if (v == null) return ['— um verificador não retornou veredito (tratado como BLOQUEIA, fail-closed)']
  if (typeof v !== 'object') return [String(v).slice(0, 600)]
  const itens = (v.bloqueadores ?? []).map(b => `— [${b.tipo ?? 'correção'}] ${b.onde}: ${b.cenario}${b.regressao ? ` · regressão: ${b.regressao}` : ''}`)
  return itens.length ? itens : [`— ${v.resumo ?? 'bloqueio sem detalhe estruturado'}`]
}).join('\n') || '— verificação bloqueou (sem detalhe estruturado)'

// ═══ 1 · SPECIFY ════════════════════════════════════════════════════════════════════════════════════
let footprint = []
if (PLANEJA && !FAST) {
  phase('Specify')
  if (overBudget()) return stop('budget-exceeded', 'teto por feature atingido antes da spec')
  const spec = await agent(withContext('feature-spec', `Escreva a spec.md da issue ${issue}. Gate constitucional. Devolva \`confidence\` — baixa se restou [NEEDS CLARIFICATION] material.`),
    { phase: 'Specify', schema: STEP_SCHEMA, ...route('feature-spec', { model: 'sonnet', effort: 'medium' }) })
  if (incerta(spec)) return stop('awaiting-human', `spec com baixa confiança: ${spec.motivo ?? spec.resumo ?? 'sem detalhe'}`, { confidence: 'baixa' })

  // 2 · PLAN
  phase('Plan')
  const plan = await agent(withContext('architect', `Com base na spec, escreva plan.md + tasks.md (+ADR se durável). Leia o índice de ADRs antes de decidir algo durável. DECLARE o bloco \`\`\`footprint (superfícies de ESCRITA) — é o que o agendador ciente de conflito consome (ADR-0007) — e repita-o no campo \`footprint\`.`),
    { phase: 'Plan', schema: STEP_SCHEMA, ...route('architect', { model: 'opus', effort: 'high' }) })
  if (incerta(plan)) return stop('awaiting-human', `plano com baixa confiança: ${plan.motivo ?? plan.resumo ?? 'sem detalhe'}`, { confidence: 'baixa' })
  footprint = plan.footprint ?? []

  // 2¼ · DESIGN (UI) — só quando a feature tem superfície de interface significativa (ADR-0019 §6).
  if (uiSignificativa) {
    phase('Design')
    await agent(withContext('ux-designer', `Brief de UI/UX da feature: estrutura, hierarquia, estados (vazio/carregando/erro), microcópia e acessibilidade. Não escreva código de produção.`),
      { phase: 'Design', ...route('ux-designer', { model: 'fable', effort: 'medium' }) })
  }
}

// O stage 'plan' devolve o FOOTPRINT ao pai, que só então agenda o implement por conflito (ADR-0007).
if (stage === 'plan') {
  return { status: 'plan-ready', issue: String(issue), touched: [String(issue)], footprint, confidence: 'alta' }
}
if (FAST) log(`fast_path (ADR-0008): autoria colapsada (spec/plan/decompose/BDD) — os GATES não mudam`)

// ═══ 2½ · DECOMPOSE (ADR-0017) ══════════════════════════════════════════════════════════════════════
phase('Decompose')
if (overBudget()) return stop('budget-exceeded', 'teto por feature atingido antes da decomposição')
const decomp = (sliceFanout === 'on' && !FAST)
  ? await agent(withContext('task-decomposer', `Quebre o plano num GRAFO de micro-slices. Para CADA slice declare o footprint (\`arquivos\` — é o que decide o que paraleliza), \`dependeDe\`, o \`doneTest\` (o teste que falha HOJE e passa ao fim dela), o \`papel\` do implementador (\`backend\`|\`frontend\`|\`data\`|\`prompt\`|\`sre\` — quem tem o ofício da slice) e \`escopoDeTeste: full\` se o diff dela toca migration/esquema/config/DI/fixture. Marque \`integracao: true\` na slice que agrega o valor da feature. Feature pequena ⇒ status \`nao-decomposto\`.`),
      { phase: 'Decompose', schema: SLICES_SCHEMA, ...route('task-decomposer', { model: 'sonnet', effort: 'high' }) })
  : null
const slices = decomp?.status === 'decomposto' ? (decomp.slices ?? []) : []

// ═══ 3 · ACCEPTANCE (BDD — laço EXTERNO) ════════════════════════════════════════════════════════════
// ADR-0015: o cenário nasce VERMELHO, ANTES do código. Rodá-lo concorrente ao implement (como antes)
// tornava a invariante inverificável — o implementador podia fechar antes de o oráculo existir.
// Condicionado à classificação `comportamento` (ADR-0019 §3): refactor puro não contrata comportamento.
if (RODA_BDD) {
  phase('Acceptance')
  await agent(withContext('bdd-author', `Converta os critérios de aceite em cenários executáveis (oráculo do LAÇO EXTERNO — nascem VERMELHOS, antes do código). Comportamento classificado como \`${comportamento}\`.`),
    { phase: 'Acceptance', ...route('bdd-author', { model: 'sonnet', effort: 'medium' }) })
} else {
  log(`bdd-author pulado — ${FAST ? 'fast_path (ADR-0008)' : `comportamento:${comportamento} (ADR-0015: nada a contratar; o tester cobre com regressão)`}`)
}

// ═══ 4 · IMPLEMENT ══════════════════════════════════════════════════════════════════════════════════
// · Cada slice = UMA invocação com contexto ESTREITO, roteada ao OFÍCIO certo (ADR-0019 §6).
// · O track CONTÍNUO barato corre ‖ ao implement: read-only E determinístico → seguro no alvo em
//   MOVIMENTO. NÃO ponha aqui o gate de JULGAMENTO (opus) — esse exige diff congelado.
phase('Implement')
const AGENTE_DO_PAPEL = {
  backend: 'backend-engineer', frontend: 'frontend-engineer',
  data: 'data-engineer', prompt: 'prompt-engineer', sre: 'sre-engineer',
}
const agenteDaSlice = (slice) => AGENTE_DO_PAPEL[slice?.papel] ?? implementerDefault
const implementaSlice = (slice) => {
  const papel = agenteDaSlice(slice)
  return agent(withContext(papel,
    `SLICE ${slice.id} — ${slice.titulo}\n` +
    `CONTEXTO ESTREITO (ADR-0012 §8): trabalhe SÓ em ${(slice.arquivos ?? []).join(', ') || 'os arquivos desta slice'}. Não carregue o tasks.md inteiro nem as outras slices — elas estão sendo feitas em contexto separado.\n` +
    `DONE (observável): ${slice.doneTest}${slice.rf ? ` · serve ${slice.rf}` : ''}\n` +
    `ÁRVORE VERDE (P-10): a branch não pode ficar quebrada ao fim da slice — comportamento parcial fica atrás de flag/stub.\n${TDD}\n${testeDaSlice(slice)}`),
    { phase: 'Implement', label: `${papel}:${slice.id}`, schema: STEP_SCHEMA, ...route(papel, { model: 'sonnet', effort: 'high' }) })
}

const rodarImplement = async () => {
  if (!slices.length) {   // `nao-decomposto`, `slice_fanout: off` ou fast_path — invocação única
    const r = await agent(withContext(implementerDefault, `${FAST ? `Implemente a demanda da issue ${issue} DIRETO (fast_path — sem spec/plan: o escopo é o corpo da issue).` : 'Implemente as slices do tasks.md.'} Árvore verde a cada passo.\n${TDD}\n${testeDaSlice(null)}`),
      { phase: 'Implement', schema: STEP_SCHEMA, ...route(implementerDefault, { model: 'sonnet', effort: 'high' }) })
    if (incerta(r)) return { ok: false, status: 'awaiting-human', reason: `implementação com baixa confiança: ${r.motivo ?? r.resumo ?? 'sem detalhe'}` }
    return { ok: true }
  }
  let ondas
  try { ondas = planWaves(slices) }                    // DAG inválido FALHA explícito, não em silêncio
  catch (e) { return { ok: false, status: 'blocked', reason: String(e.message ?? e) } }
  for (let i = 0; i < ondas.length; i++) {
    if (overBudget()) return { ok: false, status: 'budget-exceeded', reason: `teto por feature atingido na onda ${i + 1}/${ondas.length}` }
    log(`fan-out de slices: onda ${i + 1}/${ondas.length} — ${ondas[i].map(s => `${s.id}(${agenteDaSlice(s)})`).join(' ‖ ')}`)
    const rs = await parallel(ondas[i].map(s => () => implementaSlice(s)))
    // Slice que morre NÃO segue em silêncio (antes: parallel() devolvia null e a onda seguinte rodava).
    const mortas = ondas[i].filter((s, j) => rs[j] == null).map(s => s.id)
    if (mortas.length) return { ok: false, status: 'blocked', reason: `slice(s) sem retorno na onda ${i + 1}: ${mortas.join(', ')}` }
    const fraca = rs.find(r => incerta(r))
    if (fraca) return { ok: false, status: 'awaiting-human', reason: `slice com baixa confiança: ${fraca.motivo ?? fraca.resumo ?? 'sem detalhe'}` }
  }
  return { ok: true }
}

const [implRun] = await parallel([
  () => rodarImplement(),
  // Track contínuo determinístico — barato, sem julgamento. typecheck/lint, não um agente opus.
  () => agent(withContext('tester', `TRACK CONTÍNUO (Tier 1): rode typecheck + lint + ${testScopedCmd && testScope !== 'full' ? `os testes relacionados ao diff (\`${testScopedCmd} <arquivos do diff>\`)` : SUITE_COMPLETA} e reporte quebras cedo. Sem julgamento de mérito — só o sinal determinístico.`),
    { phase: 'Implement', label: 'track-continuo', ...route('track', { model: 'haiku', effort: 'low' }) }),
])
if (implRun && implRun.ok === false) return stop(implRun.status, implRun.reason)

// ═══ 5 · VERIFY — TIER 2 (ADR-0013) ═════════════════════════════════════════════════════════════════
// Gate de JULGAMENTO sobre o DIFF CONGELADO. Loop com terminação explícita (ADR-0009): sucesso, teto de
// re-run OU teto de orçamento. `staged`: tester barato PRIMEIRO (fail-fast — reprovou, re-implementa sem
// pagar opus); verde → adversarial ‖ security (ambos opus, ambos obrigatórios: paralelo é grátis).
// O gate roda UMA VEZ POR FEATURE, sobre o diff AGREGADO — nunca por slice (ADR-0017 §C).
phase('Verify')
const LENTES = ['correção-vs-spec', 'invariante/segurança', 'reprodução/runtime', 'concorrência/idempotência', 'dados/migração']
const nPainel = Math.max(1, Math.min(Number(adversarialPanelSize) || 3, LENTES.length))
const opusGate = (diffDigest) => parallel([
  // `single` (default do genoma) = 1 cético com as lentes num prompt só. `panel` = N céticos
  // independentes, piso opus/alto POR MEMBRO (P-14). Antes o painel de 3 rodava SEMPRE — o knob
  // `verification_mode` não existia no motor, e toda feature 🟢 pagava 3 opus (ADR-0019 §3).
  ...(USA_PAINEL
    ? LENTES.slice(0, nPainel).map(lente => () =>
        agent(withContext('adversarial-reviewer', `Tente QUEBRAR a mudança pela lente "${lente}". Diff: ${diffDigest}. Conclua sozinho — não negocie com os outros membros do painel.`),
          { phase: 'Verify', label: `adversarial:${lente}`, schema: VERDICT_SCHEMA, model: 'opus', effort: 'high' }))
    : [() => agent(withContext('adversarial-reviewer', `Tente QUEBRAR a mudança pelas lentes ${LENTES.slice(0, 3).join(' · ')}. Diff: ${diffDigest}.`),
          { phase: 'Verify', label: 'adversarial:single', schema: VERDICT_SCHEMA, model: 'opus', effort: 'high' })]),
  // Security ‖ adversarial — gate mandatório independente; sequenciar não ganharia nada (ADR-0013).
  () => agent(withContext('security-reviewer', `Gate de segurança do diff: threat model, authz/escopo, injeção, segredo/PII, CVE. Diff: ${diffDigest}.`),
    { phase: 'Verify', label: 'security', schema: VERDICT_SCHEMA, model: 'opus', effort: 'high' }),
])
if (USA_PAINEL) log(`verificação em PAINEL — ${nPainel} céticos + security (motivo: ${verificationMode === 'panel' ? 'verification_mode: panel' : RISCO_ALTO ? 'tier de risco 🔴' : 'autonomy_level: autônomo'})`)

const promptTester = `Ligue os cenários ao runner + testes/evals (integração/invariante/runtime/regressão). AUDITE o laço interno: os micro-testes falhariam se o código regredisse? A prova do vermelho está declarada? ESCOPO AQUI É COMPLETO (ADR-0017): rode ${SUITE_COMPLETA} — o escopo estreito serve o laço, nunca o gate.${FAST ? ' FAST-PATH: não houve fase BDD — cubra a demanda com teste de REGRESSÃO (ADR-0008).' : ''} Devolva \`veredito: BLOQUEIA\` se achou bug de produção — é o seu voto no gate, não um comentário.`
let attempt = 0
let verdict = null
while (attempt < maxRerunAttempts) {
  attempt++
  // `.catch(() => null)` + fail-closed: um verificador que MORRE não derruba a feature inteira nem passa
  // batido — vira voto ausente, que `isBlocking` conta como BLOQUEIA (dentro de `parallel` isso já é o
  // comportamento nativo; aqui a chamada é direta e precisa do mesmo tratamento).
  const tested = await agent(withContext('tester', promptTester),
    { phase: 'Verify', label: 'tester', schema: VERDICT_SCHEMA, ...route('tester', { model: 'sonnet', effort: 'medium' }) })
    .catch(() => null)
  // fail-fast: tester reprovou → NEM chama o tier opus. Agora funciona de verdade: o veredito é um
  // campo do schema, não uma palavra a caçar no texto (antes o contrato do tester nem a continha).
  const results = isBlocking(tested) ? [tested] : [tested, ...await opusGate('diff congelado')]
  if (!results.some(isBlocking)) { verdict = results; break }
  if (overBudget()) return stop('budget-exceeded', `teto por feature atingido no re-run ${attempt}`)

  // COSTURA DE RE-RUN (ADR-0012 §8): o re-implement recebe o VEREDITO destilado (fato curto), NÃO o
  // contexto da tentativa falha. `withContext` mantém o prefixo fixo cacheado.
  const fix = contextClearPolicy === 'off' ? JSON.stringify(results) : blockingDigest(results)
  const r = await agent(withContext(implementerDefault, `A verificação bloqueou. Reproduza cada achado num teste VERMELHO primeiro, então corrija o MÍNIMO apontado e mantenha a árvore verde.\n${TDD}\n${testeDaSlice(null)}\n\n## Veredito a corrigir\n${fix}`),
    { phase: 'Implement', label: 'reimplement', schema: STEP_SCHEMA, ...route(implementerDefault, { model: 'sonnet', effort: 'high' }) })
  if (incerta(r)) return stop('awaiting-human', `correção com baixa confiança após bloqueio: ${r.motivo ?? r.resumo ?? 'sem detalhe'}`, { confidence: 'baixa' })
}
if (!verdict) return stop('awaiting-human', `verificação não passou em ${maxRerunAttempts} re-runs`)

// ═══ 6 · DOCS ═══════════════════════════════════════════════════════════════════════════════════════
phase('Docs')
await agent(withContext('docs-writer', `Atualize docs/CLAUDE.md/spec coerentes. Todo bug vira regressão + anti-padrão.`),
  { phase: 'Docs', ...route('docs-writer', { model: 'haiku', effort: 'low' }) })

const ressalvas = verdict.flatMap(v => (typeof v === 'object' ? v.ressalvas ?? [] : []))
return {
  status: 'merged-ready',
  issue: String(issue),
  touched: [String(issue)],
  footprint,
  confidence: 'alta',
  verdict: `CI verde + adversarial(${USA_PAINEL ? `painel×${nPainel}` : 'single'}) + security aprovados${ressalvas.length ? ` · ressalvas: ${ressalvas.join(' | ')}` : ''}`,
}
