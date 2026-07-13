---
name: daily-ops-scan
description: Rotina diária de SAÚDE OPERACIONAL (runtime), independente das rotinas de produto e de código. Skill standalone, para trigger agendado. Aciona o subagente `ops-investigator` para varrer métricas, logs e a DLQ do ambiente de produção em busca de problemas e ABRIR issue com evidência + sugestão de correção — SEM implementar. As issues ficam FORA do fluxo autônomo (`needs-human-triage`, sem `po-suggested`): o humano dispara `/feature <n>` depois. Notifica o dono com o que foi encontrado.
---

# /daily-ops-scan — auditoria diária de saúde operacional (runtime)

Skill **autônoma e standalone** (sessão fresca). Diferente do `/daily-tech-scan` (que olha o
**código**), esta olha o **runtime em produção**: métricas, logs e a **DLQ** das filas. Ela **só
levanta problemas** e registra como issue com uma **sugestão de correção**; **nada é corrigido**.

## Modelo + esforço (custo-benefício)
Invoque o `ops-investigator` em **`sonnet`/`alto`** (consulta + reconhecimento de padrão em métricas);
suba para `opus` se a anomalia for ambígua e exigir hipótese profunda. (Ref.: `sdd-orchestrator`.)

## Fase 1 · Investigação
Invoque o subagente **`ops-investigator`** para varrer os sinais de produção das últimas 24h (DLQ,
erro/timeout/fallback de IA, latência p95, quota, estados presos), seguindo o doc de observabilidade
do projeto. Para cada problema **confirmado/provável com evidência**, ele cria 1 issue com sinal +
causa provável + impacto + **sugestão de correção**, deduplicando. Labels: `ops` (+`bug`/`critical`) e
**sempre `needs-human-triage`**, **nunca** `po-suggested`/`size:*`.

## Fase 2 · Nada é implementado
Sem branch, PR, ou `/feature`. A correção é decisão humana: você revisa a issue (que já traz a
sugestão) e roda `/feature <n>` quando quiser.

## Fase 3 · Notificação ao dono (avise SEMPRE que achar algo)
Sua última mensagem vira o **e-mail/push**. **Se encontrar qualquer problema, o alerta push+e-mail é
obrigatório** (além de criar a issue). Curto e claro; pode nomear "erro", "fila travada", "lentidão".
Modelo:
```
🩺 Saúde do sistema (produção) — <data>

⚠️ Achei (N):
  • #NNN <título> — <severidade> — <efeito no cliente, 1 linha>

Nada é corrigido sozinho. Cada issue já traz uma sugestão. Para consertar algum, responda com o número.
```
Se as fontes estavam acessíveis e nada anômalo: "✅ Operação saudável hoje". Se **faltou credencial**
para ler os sinais, ver Resiliência (é um achado, não um silêncio).

## Resiliência — falha vira ALERTA de retry (push + e-mail)
Se a varredura **não puder rodar** (sem acesso às fontes, subagente falhou) ou a **criação de issue
falhar**, **não encerre em silêncio** — alerte:
```
⚠️ FALHA na varredura de saúde operacional — <o que aconteceu>.
Ex.: "sem credencial de métricas no ambiente — não deu para ler métricas/DLQ."
Para tentar de novo: responda "rodar a varredura de ops de novo" (ou configure o acesso).
```
**Acesso faltando é ACHADO, não silêncio** — o dono precisa saber que os sinais estão cegos.

## Invariantes da rotina
- **Só lê produção; nunca muta.** Só cria issue; nunca corrige.
- Achados ficam **fora do fluxo autônomo** (`needs-human-triage`, sem `po-suggested`).
- **Só achados com evidência** — nada de falso positivo. Cap ~3/dia. Deduplica.
- **Nunca** inclua credencial nem PII nas issues — só agregados.
