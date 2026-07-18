# 🧭 Princípios de Produto & Growth (agnósticos)

Catálogo **destilado e desacoplado** das boas práticas de descoberta, priorização, experimentação e
medição de produto/growth — independente de domínio, mapeado aos benchmarks canônicos do mercado
(SVPG/Cagan, Teresa Torres, Christensen/JTBD, McClure/AARRR, Kohavi et al., Ries/Lean Startup).

> **Para quem é:** os subagentes que decidem **o quê** e **por quê** — `product-owner`,
> `growth-strategist`, `experiment-designer`, `growth-analyst`, `outcome-analyst`. É o análogo do
> `docs/engineering-principles.md` (que serve os agentes de implementação), aplicado à disciplina de
> produto. Não substitui a constituição (invariantes) nem o `docs/knowledge.md` (padrões de código);
> é o **piso de padrão-de-mercado** da decisão de produto.

---

## O núcleo — as cinco leis

1. **Ame o problema, não a solução.** A unidade de valor é o **resultado** na persona (*outcome*), nunca
   a feature entregue (*output*). *(SVPG/Cagan · JTBD)*
2. **Toda aposta é uma hipótese falsificável** com **uma** métrica primária (OEC) e **guardrails**
   explícitos. Sem hipótese, é opinião. *(Lean Startup · Trustworthy Experiments)*
3. **Priorize por evidência e ROI, nunca por novidade.** O que já foi recusado não volta sem ângulo
   novo. *(RICE/WSJF · ledger de rejeições)*
4. **Meça causalidade honesta:** coorte, significância, guardrail não-violado — **sinal, não vaidade**.
   *(métrica acionável vs. de vaidade · Twyman's law)*
5. **Decida e registre:** escalar / iterar / matar, com o aprendizado escrito. Um experimento sem
   decisão é custo sem retorno. *(build-measure-learn)*

---

## 1 · Descoberta — *outcome > output*

| Regra | Benchmark |
|---|---|
| Comece pelo **problema/dor** da persona e pelo *job* que ela contrata o produto para fazer | Jobs To Be Done (Christensen) |
| Cada aposta cobre os **4 riscos**: valor, usabilidade, viabilidade (negócio), factibilidade (técnica) | Product Discovery (Cagan) |
| Continuous discovery: **árvore oportunidade→solução**, testar a suposição mais arriscada primeiro | Teresa Torres |
| Meça o **resultado** (mudou o comportamento?), não a entrega (saiu a feature?) | Outcome over output |

## 2 · Priorização — *ROI, não novidade*

| Regra | Benchmark |
|---|---|
| Ordene por impacto×confiança×alcance ÷ esforço, ou por **custo de atraso** | RICE / ICE / WSJF |
| **North Star** única + métricas de entrada que a movem; não persiga tudo | North Star Framework |
| Dedup contra o que já existe e contra o **ledger de rejeições** — não reproponha o recusado | Anti-relitígio |
| Recuse o *feature factory*: mais features ≠ mais valor | Escape the Build Trap (Perri) |

## 3 · Experimentação — *hipótese falsificável*

| Regra | Benchmark |
|---|---|
| **Uma** métrica primária (OEC); tudo mais é secundário ou guardrail | One OEC (Kohavi) |
| **Guardrail metrics** protegem o que não pode piorar (receita, latência, churn) | Guardrails |
| Dimensione **poder e amostra** antes (MDE); não decida com N insuficiente | Statistical power |
| **Não espie** para parar cedo; horizonte de decisão fixado antes | Peeking / p-hacking |
| Cheque **Sample Ratio Mismatch** e efeitos de **novidade/primazia** antes de crer no resultado | SRM · novelty effect |
| Resultado bom demais é suspeito até provar que não é bug de instrumentação | Twyman's law |

## 4 · Medição — *sinal, não vaidade*

| Regra | Benchmark |
|---|---|
| Métrica **acionável** (guia decisão) > métrica de **vaidade** (só sobe e agrada) | Actionable vs vanity (Ries) |
| **Coorte**, não média agregada, para efeito ao longo do tempo | Cohort analysis |
| Correlação ≠ causação; nomeie o confundidor antes de atribuir | Causal honesty |
| Cuidado com **Goodhart**: a métrica vira alvo e deixa de medir o que importava | Goodhart's law |
| Coorte imatura fica **fora** do denominador; não conte o que ainda não teve chance | Denominador honesto |

## 5 · Ética e contenção (loop autônomo)

| Regra | Benchmark |
|---|---|
| Ação de mundo-externo (preço, canal, comunicação em massa) roda no **canário** com **cap** e kill-switch | Progressive delivery |
| Guardrail de conformidade/segurança **não relaxa** por meta de growth | Compliance gate |
| Opt-out e quota respeitados por construção; PII minimizada | Privacy-by-default |

---

## Como usar
- **`product-owner`/`growth-strategist`:** toda issue nasce de um problema+hipótese, priorizada por ROI,
  dedup contra rejeições. Não reproponha o recusado.
- **`experiment-designer`:** OEC única + guardrails + poder/amostra + horizonte de decisão — antes de rodar.
- **`growth-analyst`/`outcome-analyst`:** coorte + significância + guardrail; conclua com **escalar/iterar/matar**
  e o aprendizado registrado (`evolution.md`/playbook). Sinal honesto, nunca vaidade.
