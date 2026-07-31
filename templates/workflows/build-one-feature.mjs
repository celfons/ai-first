// build-one-feature — sub-workflow CONTRATADO (ADR-0010)
//
// Subgrafo canônico "construir uma feature" (Escala 1 do docs/token-efficiency.md §4), reusável por
// composição: os drivers /feature, /daily-build, /kickoff e /migrate CHAMAM este workflow via
// workflow('build-one-feature', args) em vez de recopiar a cadeia spec→…→docs.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONTRATO
//   Entrada (args):  { issue, fixedContext, routing, budgetPerFeature, maxRerunAttempts, contextClearPolicy }
//     · issue             — nº/refs da issue-alvo (requisito)
//     · fixedContext      — BLOCO DE CONTEXTO FIXO já montado pelo pai (§1): CLAUDE.md + constitution +
//                           linha(s) do context-map. Passado read-through; o filho NÃO relê (cache §1).
//     · routing           — plano de delegação do sdd-orchestrator: { etapa: {model, effort} } (§2).
//     · budgetPerFeature  — teto de token DESTA feature (ADR-0003). GUARDA DE BORDA: o pool de token é
//                           compartilhado (o aninhamento NÃO isola orçamento — ADR-0010 §3), então o
//                           teto é checado aqui, no código, antes de escalar profundidade.
//     · maxRerunAttempts  — teto de re-run do loop de verificação (ADR-0009). Terminação explícita.
//     · contextClearPolicy — higiene de contexto working (ADR-0012 §8): 'seam' (default) limpa o rabo
//                           variável nas costuras (fim de slice/feature, entre re-runs → passa só o
//                           veredito) preservando o prefixo fixo cacheado; 'off' arrasta tudo (caro).
//     · verificationParallelism — validação em dois tiers (ADR-0013): 'staged' (default) roda o tester
//                           barato PRIMEIRO (fail-fast) e, se verde, painel ‖ security em paralelo (diff
//                           congelado); 'flat' roda tester ‖ tier opus (mais wall-clock, mais token).
//     · tddMode           — laço INTERNO do implement (ADR-0015): 'estrito' (default) | 'pragmatico' |
//                           'off'. NÃO é etapa nem agente: o ciclo vermelho→verde→refatorar roda DENTRO
//                           da invocação do implementador, que devolve a `prova do vermelho`. O laço
//                           EXTERNO (bdd-author) permanece obrigatório p/ comportamento novo.
//     · sliceFanout       — fan-out por micro-slice (ADR-0017): 'on' (default) roda a fase DECOMPOSE e
//                           dá UMA INVOCAÇÃO POR SLICE (contexto estreito: só os arquivos dela); 'off'
//                           colapsa tudo numa invocação (comportamento anterior). O decompositor ainda
//                           pode responder `nao-decomposto` (feature pequena) — aí cai no caminho único.
//     · testCmd/testScopedCmd/testScope — escopo de teste escalado ao diff (ADR-0017, def. operacional
//                           do Tier 1 do ADR-0013). `impacted` (default): laço interno roda só o teste
//                           relacionado ao arquivo tocado, fim de slice roda a suíte do footprint, e o
//                           GATE roda a suíte COMPLETA — sempre. `full`: suíte completa em todo nível.
//   Saída (FEATURE_RESULT_SCHEMA): veredito estruturado que o pai trata como FATO validado, não texto.
//
// LIMITES QUE O DESENHO ASSUME (ADR-0010):
//   · Aninhamento é de 1 nível: este workflow NÃO chama outro workflow() (lançaria erro). O painel
//     adversarial roda aqui como parallel() de agent(), não como sub-workflow aninhado.
//   · Isolamento intacto (P-11/P-13): cada agent() é sessão limpa; adversarial/security cegos a quem
//     escreveu. Compartilha-se contrato/fato, nunca raciocínio.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'build-one-feature',
  description: 'Subgrafo canônico contratado: constrói UMA feature (spec→plan→implement→verificação→docs) — composto pelos drivers, não recopiado (ADR-0010)',
  phases: [
    { title: 'Specify' },
    { title: 'Plan' },
    { title: 'Decompose' },
    { title: 'Implement' },
    { title: 'Verify' },
    { title: 'Docs' },
  ],
}

// Contrato de saída — o pai consome isto como fato validado (schema in → schema out).
const FEATURE_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'issue', 'touched'],
  properties: {
    status: { enum: ['merged-ready', 'blocked', 'awaiting-human', 'budget-exceeded'] },
    issue: { type: 'string' },
    touched: { type: 'array', items: { type: 'string' } },      // ponteiros, não conteúdo (§3 token-eff)
    verdict: { type: 'string' },                                 // resumo do gate (adversarial+security)
    reason: { type: 'string' },                                  // preenchido quando status ≠ merged-ready
  },
}

// Contrato da DECOMPOSIÇÃO (ADR-0017) — o decompositor devolve DADO roteável, não prosa: é isto que
// permite ao script montar as ondas de execução. `arquivos` é o FOOTPRINT (base da paralelização, mesma
// regra do ADR-0007, agora intra-feature); `escopoDeTeste: full` marca a slice cujo diff derrota a
// seleção por impacto (migration/esquema/config/DI/fixture).
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
          arquivos: { type: 'array', items: { type: 'string' } },   // footprint declarado
          dependeDe: { type: 'array', items: { type: 'string' } },  // ids — arestas do DAG
          doneTest: { type: 'string' },                             // o teste que falha HOJE e passa ao fim
          rf: { type: 'string' },
          integracao: { type: 'boolean' },                          // a slice que agrega o valor (última)
          escopoDeTeste: { enum: ['impacted', 'full'] },
        },
      },
    },
  },
}

const { issue, fixedContext, routing = {}, budgetPerFeature = null, maxRerunAttempts = 2,
        contextClearPolicy = 'seam', verificationParallelism = 'staged', tddMode = 'estrito',
        sliceFanout = 'on', testCmd = null, testScopedCmd = null, testScope = 'impacted' } = args ?? {}
// Laço interno (ADR-0015): instrução anexada a TODA etapa de implementação. Custa ciclos, não hops.
const TDD = tddMode === 'off'
  ? 'tdd_mode: off — test-after permitido. PISO INEGOCIÁVEL: correção de bug reproduz em VERMELHO antes da correção.'
  : `tdd_mode: ${tddMode} — rode o laço interno VERMELHO → VERDE → REFATORAR por comportamento${tddMode === 'pragmatico' ? ' (obrigatório em invariante/dinheiro/PII/efeito e em TODA correção de bug)' : ''}. Devolva a PROVA DO VERMELHO: qual teste falhou primeiro e por quê.`
// Helper: prefixa SEMPRE o bloco de contexto fixo (idêntico, primeiro) para cache de prompt (§1).
// A limpeza de contexto working (ADR-0012 §8) PRESERVA este prefixo byte-a-byte — nunca o descarta.
const withContext = (role, body) => `${fixedContext ?? ''}\n\n## Papel: ${role}\n${body}`
const route = (etapa, fallback) => routing[etapa] ?? fallback
// GUARDA DE BORDA de orçamento — o aninhamento não isola o pool (ADR-0010 §3).
const overBudget = () => budgetPerFeature != null && budget.spent() >= budgetPerFeature
// ── ESCOPO DE TESTE ESCALADO AO DIFF (ADR-0017 · def. operacional do Tier 1 do ADR-0013) ────────────
// Três níveis: laço interno (só o relacionado) → fim de slice (suíte do footprint) → GATE (suíte
// COMPLETA, sempre). O estreito acelera o LAÇO; nunca substitui o gate.
const SUITE_COMPLETA = testCmd ? `\`${testCmd}\`` : 'a suíte completa do projeto (comando `test` do genoma §7)'
// Freios inegociáveis (ADR-0017 §E) — sem eles a seleção por impacto é perigosa: ela enxerga grafo de
// import estático e é CEGA a migration/config/DI/fixture/snapshot.
const FREIOS_DE_ESCOPO = `Freios (ADR-0017 §E, não relaxe): (a) se o diff toca migration/esquema, config, injeção de dependência, fixture ou snapshot ⇒ escopo FULL; (b) as suítes de invariante/segurança (P-3/P-5/P-6/P-7) entram no escopo mínimo SEMPRE, mesmo classificadas como "não relacionadas" — são as que quebram por acoplamento indireto; (c) sem comando de seleção disponível, degrade para a suíte do diretório do footprint e REPORTE a degradação (não finja que selecionou).`
// Instrução de teste do LAÇO INTERNO de uma slice. `full` (knob ou slice marcada) desliga o estreito.
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

// ── ONDAS DE EXECUÇÃO DO DAG DE SLICES (ADR-0017 §B) ────────────────────────────────────────────────
// Numa onda entram só as slices com dependências FECHADAS e FOOTPRINT DISJUNTO entre si (mesma regra de
// conflito do ADR-0007, aqui intra-feature). Footprint sobreposto serializa na onda seguinte. A slice de
// integração vai sempre por último, sozinha. DAG inválido FALHA — não degrada em silêncio.
const planWaves = (slices) => {
  const fechadas = new Set()
  const waves = []
  let pendentes = slices.filter(s => !s.integracao)
  while (pendentes.length) {
    const prontas = pendentes.filter(s => (s.dependeDe ?? []).every(d => fechadas.has(d)))
    if (!prontas.length) throw new Error(`DAG de slices inválido (ciclo ou dependência inexistente): ${pendentes.map(s => s.id).join(', ')}`)
    const onda = []
    const tomados = new Set()
    for (const s of prontas) {                          // guloso: a 1ª pronta sempre cabe ⇒ há progresso
      const arquivos = s.arquivos ?? []
      if (arquivos.some(f => tomados.has(f))) continue   // colide com uma já na onda → próxima onda
      arquivos.forEach(f => tomados.add(f))
      onda.push(s)
    }
    onda.forEach(s => fechadas.add(s.id))
    waves.push(onda)
    pendentes = pendentes.filter(s => !fechadas.has(s.id))
  }
  const integracao = slices.filter(s => s.integracao)
  if (integracao.length) waves.push(integracao)          // agrega o valor da feature — sempre por último
  return waves
}

// Destila o veredito bloqueante num FATO curto — é o que atravessa a costura de re-run (ADR-0012):
// o re-implement recebe ISTO, não o contexto inteiro da tentativa falha (menos token + menos ancoragem).
const blockingDigest = (results) => results.filter(r => /BLOQUEIA|bloqueado|blocked/i.test(String(r)))
  .map(r => String(r).slice(0, 600)).join('\n---\n') || 'verificação bloqueou (sem detalhe estruturado)'

// 1 · SPECIFY
phase('Specify')
if (overBudget()) return { status: 'budget-exceeded', issue: String(issue), touched: [], reason: 'teto por feature atingido antes da spec' }
const spec = await agent(withContext('feature-spec', `Escreva a spec.md da issue ${issue}. Gate constitucional.`),
  { phase: 'Specify', ...route('feature-spec', { model: 'sonnet', effort: 'medium' }) })

// 2 · PLAN
phase('Plan')
const plan = await agent(withContext('architect', `Com base na spec, escreva plan.md + tasks.md (+ADR se durável). Leia o índice de ADRs antes de decidir algo durável.`),
  { phase: 'Plan', ...route('architect', { model: 'opus', effort: 'high' }) })

// 2½ · DECOMPOSE (ADR-0017) — a decomposição vira DADO roteável. Sem isto o motor não tem como fatiar
// a execução, e o isolamento de contexto (ADR-0012) fica só na prosa da skill /feature: o caminho
// AUTÔNOMO — o de maior volume, sem humano observando — implementava tudo numa janela só.
// O decompositor mantém a régua de "quando NÃO quebrar": feature pequena volta `nao-decomposto`.
phase('Decompose')
if (overBudget()) return { status: 'budget-exceeded', issue: String(issue), touched: [], reason: 'teto por feature atingido antes da decomposição' }
const decomp = sliceFanout === 'on'
  ? await agent(withContext('task-decomposer', `Quebre o plano num GRAFO de micro-slices. Para CADA slice declare o footprint (\`arquivos\` — é o que decide o que paraleliza), \`dependeDe\`, o \`doneTest\` (o teste que falha HOJE e passa ao fim dela) e \`escopoDeTeste: full\` se o diff dela toca migration/esquema/config/DI/fixture. Marque \`integracao: true\` na slice que agrega o valor da feature. Feature pequena ⇒ status \`nao-decomposto\`.`),
      { phase: 'Decompose', schema: SLICES_SCHEMA, ...route('task-decomposer', { model: 'sonnet', effort: 'high' }) })
  : null
const slices = decomp?.status === 'decomposto' ? (decomp.slices ?? []) : []

// 3 · IMPLEMENT — fan-out por slice (ADR-0017) ‖ TIER 1 da validação (ADR-0013).
// · Cada slice = UMA invocação com contexto ESTREITO (só os seus arquivos) — janela menor, menos
//   alucinação. Ondas por DAG + footprint disjunto; integração por último.
// · O track CONTÍNUO barato corre ‖ ao implement: read-only E determinístico → seguro no alvo em
//   MOVIMENTO (re-run é barato). NÃO ponha aqui o gate de JULGAMENTO (opus) — esse exige diff congelado.
phase('Implement')
const implementaSlice = (slice) => agent(withContext('backend-engineer',
  `SLICE ${slice.id} — ${slice.titulo}\n` +
  `CONTEXTO ESTREITO (ADR-0012 §8): trabalhe SÓ em ${(slice.arquivos ?? []).join(', ') || 'os arquivos desta slice'}. Não carregue o tasks.md inteiro nem as outras slices — elas estão sendo feitas em contexto separado.\n` +
  `DONE (observável): ${slice.doneTest}${slice.rf ? ` · serve ${slice.rf}` : ''}\n` +
  `ÁRVORE VERDE (P-10): a branch não pode ficar quebrada ao fim da slice — comportamento parcial fica atrás de flag/stub.\n${TDD}\n${testeDaSlice(slice)}`),
  { phase: 'Implement', ...route('backend-engineer', { model: 'sonnet', effort: 'high' }) })

const rodarImplement = async () => {
  if (!slices.length) {   // `nao-decomposto` ou sliceFanout: 'off' — invocação única (caminho anterior)
    await agent(withContext('backend-engineer', `Implemente as slices do tasks.md. Árvore verde a cada slice.\n${TDD}\n${testeDaSlice(null)}`),
      { phase: 'Implement', ...route('backend-engineer', { model: 'sonnet', effort: 'high' }) })
    return { ok: true }
  }
  let ondas
  try { ondas = planWaves(slices) }                    // DAG inválido FALHA explícito, não em silêncio
  catch (e) { return { ok: false, status: 'blocked', reason: String(e.message ?? e) } }
  for (let i = 0; i < ondas.length; i++) {
    // O fan-out NÃO fura o teto por feature (ADR-0003): a guarda é reavaliada a cada onda.
    if (overBudget()) return { ok: false, status: 'budget-exceeded', reason: `teto por feature atingido na onda ${i + 1}/${ondas.length}` }
    log(`fan-out de slices: onda ${i + 1}/${ondas.length} — ${ondas[i].map(s => s.id).join(' ‖ ')}`)
    await parallel(ondas[i].map(s => () => implementaSlice(s)))   // footprint disjunto ⇒ seguro em ‖
  }
  return { ok: true }
}

const [implRun] = await parallel([
  () => rodarImplement(),
  () => agent(withContext('bdd-author', `Converta os critérios de aceite em cenários executáveis (oráculo do LAÇO EXTERNO — nascem vermelhos, antes do código).`),
    { phase: 'Implement', ...route('bdd-author', { model: 'sonnet', effort: 'medium' }) }),
  // Track contínuo determinístico — barato, sem julgamento. Bash de typecheck/lint, não um agente opus.
  () => agent(withContext('tester', `TRACK CONTÍNUO (Tier 1): rode typecheck + lint + ${testScopedCmd && testScope !== 'full' ? `os testes relacionados ao diff (\`${testScopedCmd} <arquivos do diff>\`)` : SUITE_COMPLETA} e reporte quebras cedo. Sem julgamento de mérito — só o sinal determinístico.`),
    { phase: 'Implement', ...route('track', { model: 'haiku', effort: 'low' }) }),
])
if (implRun && implRun.ok === false) {
  return { status: implRun.status, issue: String(issue), touched: [String(issue)], reason: implRun.reason }
}

// 4 · VERIFY — TIER 2 (ADR-0013): gate de JULGAMENTO sobre o DIFF CONGELADO (nunca alvo em movimento —
// verificar código que ainda muda queima o piso opus à toa). Loop com terminação explícita (ADR-0009):
// sucesso, teto de re-run OU teto de orçamento.
//   verificationParallelism: 'staged' (default) — tester barato PRIMEIRO (fail-fast: reprovou → re-implementa
//     sem pagar opus); verde → painel ‖ security em paralelo (ambos opus, ambos obrigatórios: paralelo é grátis).
//   'flat' — tester ‖ tier opus tudo junto: ganha wall-clock, MAS paga opus mesmo quando o tester reprovaria.
// O gate de julgamento roda UMA VEZ POR FEATURE, sobre o diff AGREGADO (depois da slice de integração)
// — nunca por slice (ADR-0017 §C): fatiar o Tier 2 multiplicaria o piso opus por N (P-14). O fan-out
// fatia a AUTORIA, não a VERIFICAÇÃO.
phase('Verify')
// [CONGELA O DIFF]: a partir daqui o input é estável — pré-condição do Tier 2.
const opusGate = (diffDigest) => parallel([
  // Painel adversarial (ADR-0005): N céticos de lentes distintas, piso opus/alto POR MEMBRO (P-14).
  ...['correção', 'invariante/segurança', 'reprodução/runtime'].map(lens => () =>
    agent(withContext('adversarial-reviewer', `Tente QUEBRAR a mudança pela lente "${lens}". Diff: ${diffDigest}. Conclua sozinho.`),
      { phase: 'Verify', model: 'opus', effort: 'high' })),
  // Security ‖ painel — gate mandatório independente; sequenciar não ganharia nada (ADR-0013).
  () => agent(withContext('security-reviewer', `Gate de segurança do diff: threat model, authz/escopo, injeção, segredo/PII, CVE. Diff: ${diffDigest}.`),
    { phase: 'Verify', model: 'opus', effort: 'high' }),
])
let attempt = 0
let verdict = null
while (attempt < maxRerunAttempts) {
  attempt++
  let results
  if (verificationParallelism === 'flat') {
    // urgência > custo: tester concorre com o tier opus (paga opus mesmo em reprovação barata).
    const [tested, ...opus] = await parallel([
      () => agent(withContext('tester', `Ligue os cenários ao runner + testes/evals (integração/invariante/runtime/regressão). AUDITE o laço interno: os micro-testes falhariam se o código regredisse? A prova do vermelho está declarada? Gate verde? ESCOPO AQUI É COMPLETO (ADR-0017): rode ${SUITE_COMPLETA} — o escopo estreito serve o laço, nunca o gate.`),
        { phase: 'Verify', ...route('tester', { model: 'sonnet', effort: 'medium' }) }),
      () => opusGate('diff congelado'),
    ])
    results = [tested, ...(opus[0] ?? [])]
  } else {
    // staged (default): fail-fast onde protege token, paralelo onde é grátis.
    const tested = await agent(withContext('tester', `Ligue os cenários ao runner + testes/evals (integração/invariante/runtime/regressão). AUDITE o laço interno: os micro-testes falhariam se o código regredisse? A prova do vermelho está declarada? Gate verde? ESCOPO AQUI É COMPLETO (ADR-0017): rode ${SUITE_COMPLETA} — o escopo estreito serve o laço, nunca o gate.`),
      { phase: 'Verify', ...route('tester', { model: 'sonnet', effort: 'medium' }) })
    if (/BLOQUEIA|bloqueado|blocked/i.test(String(tested))) {
      results = [tested]                                 // tester reprovou → NEM chama o tier opus (fail-fast)
    } else {
      const opus = await opusGate('diff congelado')      // verde → painel ‖ security concorrentes
      results = [tested, ...opus]
    }
  }
  const blocked = results.some(r => /BLOQUEIA|bloqueado|blocked/i.test(String(r)))
  if (!blocked) { verdict = { results }; break }         // sucesso verificável → sai do loop
  if (overBudget()) return { status: 'budget-exceeded', issue: String(issue), touched: [String(issue)], reason: `teto por feature atingido no re-run ${attempt}` }

  // COSTURA DE RE-RUN (ADR-0012 §8): o re-implement recebe o VEREDITO destilado (fato curto), NÃO o
  // contexto da tentativa falha. `withContext` mantém o prefixo fixo cacheado; o rabo variável do
  // attempt anterior (panel/tested/security completos) é DESCARTADO — não entra no próximo prompt.
  const fix = contextClearPolicy === 'off'
    ? `A verificação bloqueou:\n${results.join('\n')}`                  // sem limpeza: arrasta tudo (caro)
    : blockingDigest(results)                                          // seam/dynamic: só o veredito
  await agent(withContext('backend-engineer', `A verificação bloqueou. Reproduza cada achado num teste VERMELHO primeiro, então corrija o MÍNIMO apontado e mantenha a árvore verde.\n${TDD}\n${testeDaSlice(null)}\n\n## Veredito a corrigir\n${fix}`),
    { phase: 'Implement', ...route('backend-engineer', { model: 'sonnet', effort: 'high' }) })
}
if (!verdict) {
  // teto de re-run atingido sem verde → escala, não queima orçamento "até parecer bom" (ADR-0009).
  return { status: 'awaiting-human', issue: String(issue), touched: [String(issue)], reason: `verificação não passou em ${maxRerunAttempts} re-runs` }
}

// 5 · DOCS
phase('Docs')
await agent(withContext('docs-writer', `Atualize docs/CLAUDE.md/spec coerentes. Todo bug vira regressão + anti-padrão.`),
  { phase: 'Docs', ...route('docs-writer', { model: 'haiku', effort: 'low' }) })

// Retorno CONTRATADO — o pai (ex.: daily-build Escala 2) compõe isto por feature e serializa o merge.
return {
  status: 'merged-ready',
  issue: String(issue),
  touched: [String(issue)],
  verdict: 'CI verde + adversarial(panel) + security aprovados',
}
