# ADR-0019: O gate decide por **dado** — veredito estruturado, escalada por incerteza executável e telemetria de custo no motor

> Status: Accepted · Data: 2026-08-06
> Feature/Issue: método (fidelidade do gate + AIOps) · Princípios tocados: P-10 (gate), P-11/P-13 (verificação independente), P-14 (custo/piso opus) · Supersede: — (refina ADR-0013, ADR-0017; **executa** ADR-0005 §escalada e token-efficiency §5)

## Contexto

O ADR-0017 registrou a lição que definiu as duas últimas rodadas do método: **script não roteia
prosa**. A decomposição ganhou contrato estruturado (`SLICES_SCHEMA`), o retorno da feature ganhou
`FEATURE_RESULT_SCHEMA` — mas a lição parou **exatamente no ponto onde mais dói**: o loop de
verificação do `build-one-feature.mjs`, o gate que decide se uma feature vai ou não ao merge,
roteava por **regex sobre o texto livre** dos revisores:

```js
const blocked = results.some(r => /BLOQUEIA|bloqueado|blocked/i.test(String(r)))
```

Três falhas concretas nessa linha:

1. **Falso bloqueio.** Um revisor que escreve *"analisei as três lentes e **NÃO BLOQUEIA**"* casa com
   a regex — e dispara um re-run + re-implement inteiros (orçamento queimado, wall-clock perdido,
   e um "fix" solicitado sobre um veredito que era aprovação).
2. **Falso verde — o pior estado possível.** Um bloqueio fraseado de outro jeito (*"REPROVADO"*,
   *"não pode ir ao merge"*, *"rejeitado por violar P-3"*) **não casa** — e a feature segue ao
   `merged-ready` com um achado bloqueante vivo. No `autonomy_level: autônomo` não há humano depois
   para pegar: o gate automático **é** o gate.
3. **O sinal mais rico do pipeline era jogado fora.** O revisor produz achados, severidade e um grau
   de convicção — e tudo virava um `String(r).slice(0, 600)` no digest de re-run.

Duas dívidas do método ficavam em pé **por falta exatamente desse dado**:

- **A escalada por incerteza (ADR-0005) era knob sem motor.** `uncertainty_escalation` existe no
  genoma §8 (default **on**) e promete: *etapa de baixa confiança escala ao humano,
  independentemente do tier de risco*. Mas **nenhum ponto do motor media confiança** — o knob era
  prosa. Quando prosa e motor divergem, o motor é o que roda (lição do ADR-0017).
- **O loop de AIOps nascia cego.** `token-efficiency.md` §5 manda o `finops-steward` contabilizar
  custo por etapa "do `budget.spent()` do `Workflow` **quando houver**" — mas o motor, único lugar
  onde esse contador existe, **não emitia nada**. O `routing-policy.md` (a memória auto-evolutiva do
  roteamento) nasce vazio em todo projeto e dependia de medição heroica externa para encher.

## Decisão

**Os vereditos do Tier 2 viram dado estruturado, e o motor passa a se medir.** Três movimentos
acoplados — o primeiro habilita os outros dois:

1. **`VERDICT_SCHEMA` em todo membro do gate.** O `tester` do gate, **cada** cético do painel
   adversarial e o `security-reviewer` devolvem `{ veredito: aprova|bloqueia, confianca:
   alta|media|baixa, achados: [{severidade: bloqueante|aviso, resumo}] }`. O loop de re-run roteia
   por `r.veredito === 'bloqueia'` — campo, não fraseado. O digest que cruza a costura de re-run
   (ADR-0012 §8) passa a ser a lista dos `achados` bloqueantes, não um slice de prosa.
   **Estruturar a saída não fere o isolamento** (P-11/P-13): cada revisor continua concluindo
   sozinho, cego a quem escreveu; o schema padroniza o *formato* do veredito, não o *julgamento* —
   é o mesmo estatuto do `SLICES_SCHEMA` na decomposição.

2. **A escalada por incerteza roda no motor.** Gate **verde** com `confianca: baixa` de **qualquer**
   membro ⇒ `status: awaiting-human`, com os achados dos incertos no `reason` (arg
   `uncertaintyEscalation`, default `on`, espelho do knob do genoma). Não é re-run — o gate não
   reprovou, e re-implementar não compraria confiança; é **gate humano adicional**: risco OU
   incerteza, o maior (ADR-0005). O prompt diz ao revisor que declarar `baixa` escala, não pune —
   sem isso o campo viraria "alta" por pressão social.

3. **Telemetria de custo por etapa no retorno contratado.** O filho marca deltas de `budget.spent()`
   nas costuras de fase (`specify`/`plan`/`decompose`/`implement`/`verify#N`/`fix#N`/`docs`) e
   devolve `telemetria: { custoPorEtapa, reRuns, fidelidade }`; o pai da rodada devolve
   `custoDaRodada` (leitura exata do pool ao fim). **Honestidade declarada em vez de número
   inventado:** o pool de token é compartilhado (ADR-0010 §3), então com features concorrentes o
   delta do filho superconta — o pai informa `poolCompartilhado: alvo.length > 1` e o filho estampa
   `fidelidade: aproximada-pool-compartilhado` (teto honesto) em vez de fingir precisão. Os
   `reRuns` são exatamente a "taxa de re-run do modelo barato" que o §5 chama de *o sinal mais
   valioso*: o `finops-steward` deixa de estimá-la e passa a lê-la do fato.

## Alternativas consideradas

- **Manter a regex e "melhorar o padrão"** (`/^BLOQUEIA/m`, âncoras, negação) — regex sobre prosa é
  a classe do erro, não o padrão específico; todo fraseado novo é um furo novo. Descartada.
- **Um agente "juiz" que lê os vereditos em prosa e estrutura** — um hop a mais, um modelo a mais e
  um novo ponto de interpretação falível entre o revisor e a decisão. O revisor já sabe o próprio
  veredito; pedi-lo estruturado custa zero. Descartada.
- **Escalada por incerteza como re-run** (baixa confiança → re-implementa) — re-implementar não
  responde a pergunta que o revisor não soube responder; queima orçamento para re-julgar a mesma
  dúvida. `awaiting-human` é o destino correto (ADR-0005). Descartada.
- **Telemetria "exata" por feature na rodada concorrente** (isolar contadores) — a ferramenta não
  isola o pool por sub-workflow (ADR-0010 §3); qualquer número "exato" seria inventado. Adotada a
  alternativa honesta: medir o que é medível e **declarar a fidelidade**. (O `custoDaRodada` do pai
  é exato por construção.)
- **Confiança numérica (0–1)** em vez de `alta|media|baixa` — falsa precisão: um LLM não calibra
  0.73 vs 0.68, e o limiar do knob (ADR-0005) já é categórico (`baixa`). Descartada.

## Consequências

- **Positivas:** o ponto de decisão mais crítico do pipeline deixa de ser loteria de fraseado —
  falso bloqueio (custo) e falso verde (furo no gate, P-11) saem do espaço de falha por construção;
  a validação de schema faz o modelo re-tentar no formato certo em vez de o script adivinhar. O knob
  `uncertainty_escalation` passa de promessa a comportamento. O `routing-policy.md` ganha insumo do
  próprio motor a cada rodada — o loop de AIOps (§5) fecha com fato, não com heroísmo de medição.
- **Custos/limites:** `confianca` é auto-declarada — um revisor sistematicamente confiante e errado
  não é pego por este ADR (é pego pelo painel de lentes distintas e pelas rubricas do ADR-0011,
  que agora têm um campo objetivo a mais para auditar). A telemetria por etapa em rodada concorrente
  é teto, não medida — declarado no dado, e o `finops-steward` deve lê-la como tal. Prompts do gate
  ficam ~1 linha maiores (pedido do veredito estruturado).
- **Reversível?** Sim: `uncertaintyEscalation: 'off'` desliga a escalada; o schema do veredito é
  aditivo (quem lia o retorno antigo continua funcionando — `verdict`/`reason` permanecem); a
  telemetria é campo opcional do contrato. O caminho `orchestration_mode: sequencial` segue intacto.
