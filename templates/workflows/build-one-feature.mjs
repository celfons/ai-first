// build-one-feature — sub-workflow CONTRATADO (ADR-0010)
//
// Subgrafo canônico "construir uma feature" (Escala 1 do docs/token-efficiency.md §4), reusável por
// composição: os drivers /feature, /daily-build, /kickoff e /migrate CHAMAM este workflow via
// workflow('build-one-feature', args) em vez de recopiar a cadeia spec→…→docs.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONTRATO
//   Entrada (args):  { issue, fixedContext, routing, budgetPerFeature, maxRerunAttempts }
//     · issue             — nº/refs da issue-alvo (requisito)
//     · fixedContext      — BLOCO DE CONTEXTO FIXO já montado pelo pai (§1): CLAUDE.md + constitution +
//                           linha(s) do context-map. Passado read-through; o filho NÃO relê (cache §1).
//     · routing           — plano de delegação do sdd-orchestrator: { etapa: {model, effort} } (§2).
//     · budgetPerFeature  — teto de token DESTA feature (ADR-0003). GUARDA DE BORDA: o pool de token é
//                           compartilhado (o aninhamento NÃO isola orçamento — ADR-0010 §3), então o
//                           teto é checado aqui, no código, antes de escalar profundidade.
//     · maxRerunAttempts  — teto de re-run do loop de verificação (ADR-0009). Terminação explícita.
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

const { issue, fixedContext, routing = {}, budgetPerFeature = null, maxRerunAttempts = 2 } = args ?? {}
// Helper: prefixa SEMPRE o bloco de contexto fixo (idêntico, primeiro) para cache de prompt (§1).
const withContext = (role, body) => `${fixedContext ?? ''}\n\n## Papel: ${role}\n${body}`
const route = (etapa, fallback) => routing[etapa] ?? fallback
// GUARDA DE BORDA de orçamento — o aninhamento não isola o pool (ADR-0010 §3).
const overBudget = () => budgetPerFeature != null && budget.spent() >= budgetPerFeature

// 1 · SPECIFY
phase('Specify')
if (overBudget()) return { status: 'budget-exceeded', issue: String(issue), touched: [], reason: 'teto por feature atingido antes da spec' }
const spec = await agent(withContext('feature-spec', `Escreva a spec.md da issue ${issue}. Gate constitucional.`),
  { phase: 'Specify', ...route('feature-spec', { model: 'sonnet', effort: 'medium' }) })

// 2 · PLAN
phase('Plan')
const plan = await agent(withContext('architect', `Com base na spec, escreva plan.md + tasks.md (+ADR se durável). Leia o índice de ADRs antes de decidir algo durável.`),
  { phase: 'Plan', ...route('architect', { model: 'opus', effort: 'high' }) })

// 3 · IMPLEMENT (+ bdd-author e ux-designer podem correr em paralelo — dependem só da spec/plan, §4)
phase('Implement')
const [impl] = await parallel([
  () => agent(withContext('backend-engineer', `Implemente as slices do tasks.md. Árvore verde a cada slice.`),
    { phase: 'Implement', ...route('backend-engineer', { model: 'sonnet', effort: 'high' }) }),
  () => agent(withContext('bdd-author', `Converta os critérios de aceite em cenários executáveis (oráculo).`),
    { phase: 'Implement', ...route('bdd-author', { model: 'sonnet', effort: 'medium' }) }),
])

// 4 · VERIFY — loop com terminação explícita (ADR-0009): sucesso, teto de re-run OU teto de orçamento.
phase('Verify')
let attempt = 0
let verdict = null
while (attempt < maxRerunAttempts) {
  attempt++
  const tested = await agent(withContext('tester', `Ligue os cenários ao runner + testes/evals. Gate verde?`),
    { phase: 'Verify', ...route('tester', { model: 'sonnet', effort: 'medium' }) })

  // Piso opus/alto POR MEMBRO na verificação independente (P-14) — não desce por custo-benefício.
  // Painel adversarial (ADR-0005): N céticos de lentes distintas, barreira só na agregação.
  const panel = await parallel(['correção', 'invariante/segurança', 'reprodução/runtime'].map(lens => () =>
    agent(withContext('adversarial-reviewer', `Tente QUEBRAR a mudança pela lente "${lens}". Receba o diff-digest como fato; conclua o veredito sozinho.`),
      { phase: 'Verify', model: 'opus', effort: 'high' })))
  const security = await agent(withContext('security-reviewer', `Gate de segurança do diff: threat model, authz/escopo, injeção, segredo/PII, CVE.`),
    { phase: 'Verify', model: 'opus', effort: 'high' })

  const blocked = [tested, ...panel, security].some(r => /BLOQUEIA|bloqueado|blocked/i.test(String(r)))
  if (!blocked) { verdict = { tested, panel, security }; break }        // sucesso verificável → sai do loop
  if (overBudget()) return { status: 'budget-exceeded', issue: String(issue), touched: [String(issue)], reason: `teto por feature atingido no re-run ${attempt}` }
  // senão: re-implementa e tenta de novo (até maxRerunAttempts)
  await agent(withContext('backend-engineer', `A verificação bloqueou. Corrija o mínimo apontado e mantenha a árvore verde.`),
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
