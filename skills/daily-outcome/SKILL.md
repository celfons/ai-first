---
name: daily-outcome
description: Rotina de RESULTADO (fecha o loop com a realidade). Skill standalone para trigger agendado. Aciona o subagente `outcome-analyst` para medir se as features já promovidas para produção entregaram a MÉTRICA DE SUCESSO declarada na spec (§8), usando telemetria/uso real. Reporta o que funcionou, o que não moveu o ponteiro (candidato a iterar/remover) e abre issues de melhoria/instrumentação — SEM implementar. Alimenta o `product-owner` com aprendizado de dado real. Roda junto o `finops-steward` (custo/ROI + AIOps: realimenta o roteamento do `sdd-orchestrator`). Notifica o dono.
---

# /daily-outcome — a feature deu certo? (loop fechado)

Skill **autônoma e standalone**. Enquanto o `/daily-build` **produz** e o `/daily-tech-scan`/
`/daily-ops-scan` cuidam da **saúde**, esta pergunta a coisa mais importante e mais esquecida em
automação: **o que construímos moveu o negócio?** Sem ela, o organismo cresce às cegas.

> Cadência sugerida: **algumas vezes por semana** (não precisa ser diária — métricas de produto
> levam dias para maturar). Defina no genoma (`docs/ai-first/project.md §8`).

## Modelo + esforço (custo-benefício)
Invoque o `outcome-analyst` em **`sonnet`/`alto`** (raciocínio sobre telemetria/dados); suba para
`opus` se a atribuição causal for sutil. (Ref.: tabela no `sdd-orchestrator`.)

## Fase 1 · Medição
Invoque o subagente **`outcome-analyst`** para, numa janela recente, medir as features **já
promovidas** contra a **métrica de sucesso da spec (§8)**, com telemetria/uso real. Ele classifica
cada uma em ✅ confirmada · 〜 inconclusiva · ❌ não entregou, e é **honesto sobre acesso** (métrica
não instrumentada = achado, não silêncio).

## Fase 2 · Feedback ao board (sem implementar)
Para achados acionáveis, o `outcome-analyst` abre issues:
- ❌ que vale **iterar** → issue com o dado real (entra no fluxo com `po-suggested`+`size:*`, ou
  `needs-human-triage` se for decisão de matar a feature).
- **Lacuna de instrumentação** → issue `needs-human-triage` (sem medir, o loop fica cego ali).
Nada é implementado aqui — a correção/iteração é uma feature nova pelo fluxo normal.

## Fase 2¾ · Custo e ROI (AIOps/FinOps)
Invoque o subagente **`finops-steward`** (`sonnet`/`alto`) sobre a **mesma janela**: ele traz o
**custo** que fecha o ROI com o valor que o `outcome-analyst` acabou de medir — custo por feature
mergeada, gasto vs. `daily_budget`, e a **taxa de re-run do modelo barato**. Ele produz:
- **Ajuste de roteamento ao `sdd-orchestrator`** (`docs/token-efficiency.md` §5) quando uma classe de
  tarefa mostra re-run recorrente do modelo barato — sobe o piso onde o "barato" saiu caro (o piso de
  segurança P-14 nunca desce). Registre o ajuste onde o orchestrator o lê.
- **ROI por feature ao `product-owner`/CEO:** ✅ cara mas de alto retorno = bom investimento; ❌ cara e
  sem retorno = candidata a parar (issue como na Fase 2). Lacuna de instrumentação de custo →
  `needs-human-triage`.
Se a telemetria de custo não é alcançável, ele **diz** (não inventa número) — some ao ⚠️ da Fase 3.

## Fase 2½ · Registrar o aprendizado em `docs/evolution.md`
Pegue as **linhas de aprendizado** que o `outcome-analyst` emitiu (item 4 dele) e **grave-as no topo**
da linha do tempo em `docs/evolution.md` (mais recente primeiro), no formato do doc — data, feature/
#NNN, sinal (✅/〜/❌/🔧), aprendizado e links. O subagente é só-leitura de docs; **quem escreve é a
skill** (thread principal). Uma linha por feature avaliada; não duplique entrada já registrada.

## Fase 3 · Notificação ao dono (o que o mundo real disse)
Sua última mensagem vira o **e-mail/push**. Linguagem de negócio, foco em resultado:
```
📈 Resultado das novidades recentes — <janela>

✅ Deram certo (N): • <feature> moveu <métrica> em <quanto>
❌ Não moveram (M):  • <feature> — <o que era esperado vs. real> → sugeri <iterar/rever>
〜 Ainda cedo (K):   • <feature> — reavaliar em <quando>
🔧 Ficou cego (J):   • <métrica não instrumentada> — precisa medir para saber
💰 Custo/ROI:        • gasto no período vs. orçamento · feature cara sem retorno (se houver) · roteamento afinado

Nada é mexido sozinho. Para iterar alguma, o número já está no board.
```
Se **nada** tem métrica medível ainda, diga isso claramente (é o sinal de que falta instrumentação —
não invente sucesso).

## Resiliência — falha vira ALERTA de retry (push + e-mail)
Se a medição **não puder rodar** (sem acesso à telemetria, subagente falhou):
```
⚠️ FALHA na análise de resultado — <o que aconteceu>.
Ex.: "sem acesso à telemetria — não deu para medir se as features moveram o ponteiro."
Para tentar de novo: responda "rodar a análise de resultado de novo" (ou configure o acesso).
```
**Acesso/instrumentação faltando é ACHADO, não silêncio.**

## Invariantes da rotina
- **Só lê; nunca muta produção nem implementa.** Só mede e cria issue.
- **Nunca inventa resultado.** "Não medível" ≠ "deu certo".
- Respeita a janela de maturação (cedo demais ≠ falhou). Deduplica. Sem PII.
