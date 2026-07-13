---
name: daily-outcome
description: Rotina de RESULTADO (fecha o loop com a realidade). Skill standalone para trigger agendado. Aciona o subagente `outcome-analyst` para medir se as features já promovidas para produção entregaram a MÉTRICA DE SUCESSO declarada na spec (§8), usando telemetria/uso real. Reporta o que funcionou, o que não moveu o ponteiro (candidato a iterar/remover) e abre issues de melhoria/instrumentação — SEM implementar. Alimenta o `product-owner` com aprendizado de dado real. Notifica o dono.
---

# /daily-outcome — a feature deu certo? (loop fechado)

Skill **autônoma e standalone**. Enquanto o `/daily-build` **produz** e o `/daily-tech-scan`/
`/daily-ops-scan` cuidam da **saúde**, esta pergunta a coisa mais importante e mais esquecida em
automação: **o que construímos moveu o negócio?** Sem ela, o organismo cresce às cegas.

> Cadência sugerida: **algumas vezes por semana** (não precisa ser diária — métricas de produto
> levam dias para maturar). Defina no genoma (`docs/ai-first/project.md §8`).

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

## Fase 3 · Notificação ao dono (o que o mundo real disse)
Sua última mensagem vira o **e-mail/push**. Linguagem de negócio, foco em resultado:
```
📈 Resultado das novidades recentes — <janela>

✅ Deram certo (N): • <feature> moveu <métrica> em <quanto>
❌ Não moveram (M):  • <feature> — <o que era esperado vs. real> → sugeri <iterar/rever>
〜 Ainda cedo (K):   • <feature> — reavaliar em <quando>
🔧 Ficou cego (J):   • <métrica não instrumentada> — precisa medir para saber

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
