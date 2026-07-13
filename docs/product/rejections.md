# 🚫 Registro de rejeições (aprendizado do Product Owner)

Toda feature **implementada e depois reprovada** pelo dono (via `/reject-feature`) deixa aqui
o **motivo** e o **takeaway**. É o par negativo dos [ADRs](../adr/): os ADRs guardam o que
**decidimos fazer**; este log guarda o que o stakeholder **recusou** — para o `product-owner`
**não repropor a mesma coisa** e **reformular** as próximas apostas à luz do que já foi um "não".

> Sem este registro, o sinal mais valioso (o "não" do dono) se perde e o PO tende a repetir.
> É a retroalimentação mais barata do fluxo.

## Como o PO usa (retroalimentação)

Antes de propor a issue do dia, o `product-owner` **lê este log**:

- **Rejeição de `produto`** (ideia errada / sem valor / fora de hora / direção errada) → **não
  reproponha** a mesma ideia; use o *takeaway* para mirar diferente. Só volte ao tema se o
  takeaway indicar um **ângulo novo viável**.
- **Rejeição de `execução`** (ideia boa, construída errado/arriscada) → a ideia **continua
  válida**; o problema foi o *como*. Não vira "evitar o tema"; o retrabalho é técnico (a issue
  reaberta segue no board). O takeaway aqui orienta o `architect`/`backend`, não o "o quê".

## Formato

Uma linha por rejeição (mais recente no topo). Preenchido pelo `/reject-feature`.

| Data | Issue | O que foi entregue | Tipo | Motivo da rejeição | Takeaway (o que evitar/mudar) |
|---|---|---|---|---|---|
| _(vazio — o primeiro `/reject-feature` grava aqui)_ | | | | | |

- **Tipo:** `produto` (recusa da ideia/valor) · `execução` (recusa de como foi feito).
- **Motivo:** curto, nas palavras do dono (por que não quis).
- **Takeaway:** a lição acionável — o que o PO deve **evitar** ou **fazer diferente** (produto),
  ou o que o build deve corrigir (execução).

## Convenção

- **Sempre com motivo.** Rejeição sem "porquê" não entra — o valor é o motivo. Se o dono não
  deu, o `/reject-feature` pergunta antes de registrar.
- Não apague linhas: o histórico é o aprendizado. Se uma ideia rejeitada por `produto` for
  revisitada com sucesso mais tarde, adicione uma nova linha em vez de apagar a antiga.
