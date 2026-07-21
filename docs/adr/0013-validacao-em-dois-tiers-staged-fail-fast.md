# ADR-0013: Validação em dois tiers — track contínuo barato ‖ gate de julgamento sobre diff congelado (staged fail-fast)

> Status: Accepted · Data: 2026-07-19
> Feature/Issue: método (paralelismo de verificação) · Princípios tocados: P-11/P-13 (verificação independente), P-14 (custo — o piso opus não paga por alvo em movimento), P-15 (knobs) · Supersede: —

## Contexto

O grafo (ADR-0009) coloca a verificação **depois** do implement, com uma barreira. Surgiu a pergunta:
já que os agentes de validação são **read-only**, não poderiam **sempre** rodar em paralelo aos demais?

A resposta expõe uma confusão útil: **"read-only" e "sem dependência de dado" são eixos diferentes.**
- **Read-only** dá **segurança** para paralelizar: um agente que não muta estado não corrompe nada
  rodando junto → não há razão de *serializar por conflito de escrita*.
- **Mas a dependência de dado permanece:** o `adversarial-reviewer`/`security-reviewer` verificam **um
  diff específico**. Rodá-los contra o implement ainda em movimento = revisar **alvo instável** → veredito
  falso **+ token opus queimado** (o piso caro do P-14) sobre código que já mudou.

Logo, a regra correta não é "read-only ⇒ sempre paralelo", e sim **"read-only ⇒ paralelize assim que o
input estiver estável"**. E há uma segunda distinção que refina o gate:
- **Fail-fast só rende entre tiers de custo diferente** (o barato curto-circuita o caro).
- **Entre dois gates caros e ambos obrigatórios** (painel adversarial **e** security — os dois *têm* que
  passar), sequenciar **não ganha nada**: paralelizar é grátis.

O esqueleto atual (`build-one-feature.mjs`) roda `tester → painel → security` meio sequencial —
deixando wall-clock na mesa **sem** ganho de custo em troca.

## Decisão

Adotamos **validação em dois tiers** com estratégia **`staged` fail-fast** como default:

1. **Tier 1 — track contínuo determinístico (barato), ‖ ao implement.** typecheck/lint/testes rápidos
   rodam **em paralelo** ao `backend/frontend-engineer` como loop de feedback vivo. Seguro no alvo em
   movimento **porque re-rodar é barato e determinístico** (não é julgamento). Encurta o loop de correção
   durante o implement, antes da fase de verify.

2. **Tier 2 — gate de julgamento independente (caro), sobre o DIFF CONGELADO.** Após congelar o diff:
   - **`tester` (barato) primeiro — fail-fast.** Vermelho ⇒ re-implementa **sem ter pago o piso opus**.
     É onde o fail-fast protege o orçamento (P-14).
   - **Verde ⇒ `adversarial-panel` ‖ `security-reviewer` em `parallel()`.** Ambos opus, ambos
     **obrigatórios** — não há o que curto-circuitar entre eles; sequenciar só somaria wall-clock. Piso
     opus/alto e isolamento por membro (ADR-0005) intactos.

3. **Knob `verification_parallelism`** (genoma §8):
   - **`staged`** (default) — o fluxo acima. Fail-fast onde protege token, paralelo onde é grátis. É
     **Pareto sobre o sequencial de hoje**: melhor em custo (fail-fast mantido) **e** em tempo
     (`tester + max(painel, security)` vs. a soma dos três).
   - **`flat`** — o `tester` também concorre com o tier opus. Ganha o último naco de wall-clock **pagando
     opus mesmo quando o tester reprovaria**. Só se justifica em build autônomo de alta vazão com
     `daily_budget` folgado.

## Alternativas consideradas

- **"Read-only ⇒ sempre paralelo" (a proposta ingênua)** — trata o gate opus contra alvo em movimento;
  queima o piso caro e dá veredito falso. Rejeitada: read-only dá segurança, não dispensa a dependência
  de dado.
- **Manter tudo sequencial (status quo)** — deixa wall-clock na mesa sem ganho de custo. O `staged` domina.
- **Só `flat` (tudo paralelo no diff congelado)** — perde o fail-fast do `tester`; paga opus em toda
  reprovação barata. Mantido como **opção** (urgência > custo), não default.
- **Paralelizar security e painel sequencialmente por "prudência"** — falso: ambos são gates
  mandatórios independentes; a ordem não muda o resultado, só o relógio. Paralelizados.

## Consequências

- **Positivas:** o default `staged` corta ~uma etapa opus do caminho crítico **sem gastar token a mais**
  (economiza, até — o fail-fast do `tester` segue barrando antes do opus); o track contínuo encurta o
  loop de correção durante o implement. Ganho de wall-clock **e** custo — Pareto, não trade-off.
- **Custos/limites:** o track contínuo exige que o projeto tenha typecheck/lint rápidos (senão Tier 1 é
  no-op — reporte, não finja); `flat` é trade-off explícito (mais tempo-ganho, mais token) e só deve
  ligar com orçamento folgado. Congelar o diff antes do Tier 2 é obrigatório — verificar alvo móvel é bug.
- **Restrições futuras:** todo gate de julgamento (Tier 2) roda sobre **diff congelado**, nunca alvo em
  movimento; dentro do Tier 2, gates **caros e obrigatórios** paralelizam entre si e o **barato** vem
  antes (fail-fast) salvo `flat`; o piso opus/alto e o isolamento (P-11/P-13/P-14) nunca são relaxados
  pela paralelização. Read-only justifica paralelizar **por segurança**, a estabilidade do input **ordena**.

## Relacionados

Constituição `P-11`/`P-13` (verificação independente), `P-14` (custo — piso opus não paga alvo móvel),
`P-15` (knobs); ADR-0009 (grafo + política de loop — esta é a refinação do gate), ADR-0005 (painel
adversarial — dimensões paralelas), ADR-0010 (sub-workflow contratado), ADR-0012 (higiene de contexto —
o re-run do fail-fast já passa só o veredito); `docs/token-efficiency.md` §4 (grafo/fan-out); genoma §8
(`verification_parallelism`); `templates/workflows/build-one-feature.mjs` (Tier 1 + staged Tier 2).
</content>
