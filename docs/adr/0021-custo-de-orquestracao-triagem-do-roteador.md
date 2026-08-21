# ADR-0021: Custo de orquestração — triagem do roteador, painel por risco (não por autonomia) e piso de granularidade de slice

> Status: Accepted · Data: 2026-08-21
> Feature/Issue: método (economia de token da própria orquestração) · Princípios tocados: P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O ADR-0019 estabeleceu que **o motor executa a doutrina** — knob que o grafo não lê não existe. Uma
auditoria do gasto real do pipeline mostrou que o inverso também vale: **cerimônia que o motor executa
sem ninguém ter escolhido também não existe como decisão** — existe como imposto.

O método já era maduro em custo: bloco de contexto fixo montado 1× e passado read-through
(`docs/token-efficiency.md` §1), roteamento explícito por fase, diff-digest compartilhado entre os dois
verificadores (§6), verificação `staged` com o tester barato primeiro (ADR-0013), teto por feature medido
por delta (ADR-0019 §2). Sobraram três pontos em que o gasto **não** compra corretude:

1. **O roteador era o único agente de modelo fixo — opus/alto, o prompt mais longo do roster, uma
   invocação por feature.** Só que o grafo contratado já traz um default para **cada** fase e a tabela de
   overrides vigentes (`docs/ai-first/routing-policy.md`) nasce vazia. Em feature 🟢 repetitiva, o método
   pagava o modelo mais caro que tem para reproduzir o default que já está no código.
2. **`autonomy_level: autônomo` ligava o painel adversarial sozinho.** Uma feature 🟢 sem efeito de valor
   pagava N céticos opus **+** security opus só porque o projeto não tem gate humano na promoção. Quem
   aprova a promoção (P-10) e quantos céticos julgam o diff (P-11) são eixos distintos; acoplá-los
   multiplicava o piso opus por N onde não havia risco nenhum.
3. **O fan-out por slice não tinha piso.** Cada slice é uma invocação com contexto próprio e um custo de
   setup ~constante (prefixo fixo + plano + instrução de TDD/escopo). Uma slice de um arquivo trivial paga
   quase o mesmo overhead de uma slice real: abaixo de certo tamanho, fatiar deixa de comprar isolamento
   (ADR-0012/0017) e passa a comprar só hop.

## Decisão

**1 · O roteador é triado, não fixo.** `scripts/router-tier.mjs` é uma triagem **determinística** (zero
LLM, zero dependências) que devolve `opus/alto` **ou** `sonnet/médio` para o `sdd-orchestrator`. Escala a
opus/alto em: tier 🔴, efeito de alto valor (dinheiro/PII/authz/dependência nova), `comportamento: cria`
numa classe **sem linha vigente** na `routing-policy.md` (não há custo real aprendido para herdar),
ambiguidade declarada (`confidence: baixa`) e migração (ADR-0002). **A direção do erro é escalar:** sinal
ausente ou ilegível cai em opus/alto, porque um roteamento ruim contamina todas as etapas seguintes.
Knob `router_escalation` (`on` default · `off` = piso legado).

**2 · O painel adversarial aciona por RISCO, nunca por autonomia.** No motor,
`USA_PAINEL = verification_mode === 'panel' || tier 🔴 || efeitoDeAltoValor`. O gatilho por
`autonomy_level` sai; entra `efeitoDeAltoValor` — que já elevava o `GATE_EFFORT` a `xhigh` e agora
**também** liga o painel. O eixo de risco não encolheu: **ficou mais preciso**, porque dinheiro/PII/authz
em tier 🟡 passou a ser julgado em painel, coisa que o acoplamento antigo não garantia. Quem quiser
painel por autonomia declara `verification_mode: panel` no genoma — explícito, selado pela trava de
política (ADR-0020), não implícito.

**3 · A decomposição tem piso de granularidade.** Knob `slice_min_files` (default **2**). Slice cujo
footprint fica abaixo do piso é **fundida no motor** com uma irmã **equivalente**: mesmo `papel`, mesmas
dependências, nenhuma de integração. "Equivalente" é o que preserva o DAG por construção — irmãs de mesmo
`dependeDe` já estavam na mesma onda, logo fundir não cria aresta nem serializa o que era paralelo. Três
recusas deliberadas: não funde **através de ofício** (perderia o roteamento por `papel`, ADR-0019 §6), não
funde a **slice de integração** (agrega a feature, é a última por contrato) e não deixa uma fusão passar
do **dobro** do piso (fundir demais recria a janela larga que a decomposição existe para evitar). O piso é
**aplicado no motor**, não só pedido no prompt do `task-decomposer` — pedir é sugestão, aplicar é regra
(ADR-0019).

## Consequências

**Positivas.** O custo fixo por feature cai onde não comprava corretude: uma feature 🟢 repetitiva deixa de
pagar opus no roteador e, em projeto `autônomo`, deixa de pagar N+1 opus no gate. O fan-out passa a ser
limitado pelo trabalho real, não pela vontade do decompositor. A cobertura do painel **melhora** em 🟡 com
efeito de alto valor.

**Negativas / risco aceito.** (a) O roteador em sonnet pode produzir um plano de delegação pior numa
feature que a triagem classificou como fácil e não era — mitigado pela direção do erro (na dúvida escala) e
pelo fato de o grafo ter default por fase, então um plano ausente ou parcial cai no fallback campo a campo,
nunca no vazio. (b) Um projeto em `autonomy_level: autônomo` que **contava** com o painel implícito passa a
rodar `single` em features 🟢 — é um **afrouxamento**, foi selado como tal na trava de política
(`--allow-loosening`), e a recuperação é uma linha no genoma. (c) A fusão de slices produz slices com
`titulo`/`doneTest` compostos, um pouco menos legíveis no log.

**O que este ADR NÃO toca.** Nenhum piso de gate: `adversarial-reviewer` e `security-reviewer` continuam
**opus, nunca abaixo de `high`**, subindo a `xhigh` em risco alto/efeito de alto valor (P-14, cravado no
motor e fora do alcance do plano de delegação). O `fail-closed` do veredito, o duplo laço BDD/TDD, o fluxo
git e os gates humanos ficam idênticos.

## Alternativas consideradas

- **Eliminar o `sdd-orchestrator` e usar só os defaults do grafo.** Rejeitada: em feature ambígua ou 🔴 o
  plano de delegação é exatamente onde o método ganha; matar o roteador economizaria no caso em que ele se
  paga.
- **Baixar o piso opus do gate.** Rejeitada frontalmente — é a troca token↔corretude que o método existe
  para fazer, e a trava de política (ADR-0020) a protege por desenho.
- **Piso de slice só como instrução no prompt do decompositor.** Rejeitada pelo ADR-0019: instrução sem
  execução no motor é doutrina que ninguém verifica.
- **Fundir slices ignorando `papel`.** Rejeitada: economizaria mais hops e quebraria o roteamento por
  ofício — UI implementada por `backend-engineer` é regressão de qualidade, não economia.
