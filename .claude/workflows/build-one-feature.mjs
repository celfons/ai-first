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

const { issue, fixedContext, routing = {}, budgetPerFeature = null, maxRerunAttempts = 2,
        contextClearPolicy = 'seam', verificationParallelism = 'staged' } = args ?? {}
// Helper: prefixa SEMPRE o bloco de contexto fixo (idêntico, primeiro) para cache de prompt (§1).
// A limpeza de contexto working (ADR-0012 §8) PRESERVA este prefixo byte-a-byte — nunca o descarta.
const withContext = (role, body) => `${fixedContext ?? ''}\n\n## Papel: ${role}\n${body}`
const route = (etapa, fallback) => routing[etapa] ?? fallback
// GUARDA DE BORDA de orçamento — o aninhamento não isola o pool (ADR-0010 §3).
const overBudget = () => budgetPerFeature != null && budget.spent() >= budgetPerFeature
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

// 3 · IMPLEMENT — TIER 1 da validação (ADR-0013): o track CONTÍNUO barato (typecheck/lint/testes
// rápidos) corre ‖ ao implement. É read-only E determinístico → seguro no alvo em MOVIMENTO (re-run é
// barato); dá feedback vivo antes da fase de verify. bdd-author/ux-designer também correm ‖ (dependem
// só da spec/plan, §4). NÃO ponha aqui o gate de JULGAMENTO (opus) — esse exige diff congelado (Tier 2).
phase('Implement')
const [impl] = await parallel([
  () => agent(withContext('backend-engineer', `Implemente as slices do tasks.md. Árvore verde a cada slice.`),
    { phase: 'Implement', ...route('backend-engineer', { model: 'sonnet', effort: 'high' }) }),
  () => agent(withContext('bdd-author', `Converta os critérios de aceite em cenários executáveis (oráculo).`),
    { phase: 'Implement', ...route('bdd-author', { model: 'sonnet', effort: 'medium' }) }),
  // Track contínuo determinístico — barato, sem julgamento. Bash de typecheck/lint, não um agente opus.
  () => agent(withContext('tester', `TRACK CONTÍNUO (Tier 1): rode typecheck + lint + testes rápidos e reporte quebras cedo. Sem julgamento de mérito — só o sinal determinístico.`),
    { phase: 'Implement', ...route('track', { model: 'haiku', effort: 'low' }) }),
])

// 4 · VERIFY — TIER 2 (ADR-0013): gate de JULGAMENTO sobre o DIFF CONGELADO (nunca alvo em movimento —
// verificar código que ainda muda queima o piso opus à toa). Loop com terminação explícita (ADR-0009):
// sucesso, teto de re-run OU teto de orçamento.
//   verificationParallelism: 'staged' (default) — tester barato PRIMEIRO (fail-fast: reprovou → re-implementa
//     sem pagar opus); verde → painel ‖ security em paralelo (ambos opus, ambos obrigatórios: paralelo é grátis).
//   'flat' — tester ‖ tier opus tudo junto: ganha wall-clock, MAS paga opus mesmo quando o tester reprovaria.
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
      () => agent(withContext('tester', `Ligue os cenários ao runner + testes/evals. Gate verde?`),
        { phase: 'Verify', ...route('tester', { model: 'sonnet', effort: 'medium' }) }),
      () => opusGate('diff congelado'),
    ])
    results = [tested, ...(opus[0] ?? [])]
  } else {
    // staged (default): fail-fast onde protege token, paralelo onde é grátis.
    const tested = await agent(withContext('tester', `Ligue os cenários ao runner + testes/evals. Gate verde?`),
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
  await agent(withContext('backend-engineer', `A verificação bloqueou. Corrija o MÍNIMO apontado e mantenha a árvore verde.\n\n## Veredito a corrigir\n${fix}`),
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
