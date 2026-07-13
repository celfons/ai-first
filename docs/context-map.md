# 🕸️ Mapa de contexto (context map / context mesh leve)

Camada de contexto **leve e determinística**: para cada **domínio** do sistema, aponta os
artefatos que juntos formam o contexto daquele domínio — **código ⇄ docs ⇄ ADRs ⇄ features/
issues ⇄ testes**. Substitui as listas de "leia primeiro" espalhadas: uma sessão ou subagente
que vai mexer no domínio X carrega **exatamente** esta linha, em vez de reler a base ou adivinhar.

> Isto é a versão **determinística** de um *context mesh* — sem serviço de recuperação
> semântica. Curadoria manual > retrieval quando a base cabe num índice. Se um dia o volume não
> couber, aí sim vale indexar `docs/` + `docs/adr/` + código e expor um tool de busca (registre
> a decisão de adiar/adotar num [ADR](adr/)).

## Como usar (agentes e sessões)

1. Identifique o(s) **domínio(s)** que a tarefa toca na tabela abaixo.
2. Carregue os artefatos daquela(s) linha(s): o **módulo** real, os **docs**, os **ADRs** (o
   *porquê* das escolhas — respeite; não re-litigue) e as **features/testes** de referência.
3. Só então decida/implemente. Mantenha o mapa coerente ao adicionar domínio/módulo novo
   (tarefa do `docs-writer`).

## Domínios → contexto

> **Esqueleto** — troque as linhas pelos domínios do **seu** projeto. O formato importa mais
> que o conteúdo de exemplo. Uma linha por domínio; cada célula aponta artefatos reais.

| Domínio | Código (`src/…`) | Docs | ADRs | Refs/issues | Testes-âncora |
|---|---|---|---|---|---|
| _(ex.: Ingress/API)_ | `api/`, `webhook/` | architecture.md | 0002 | #NNN | `apiAuth`, `webhookVerify` |
| _(ex.: Dados/persistência)_ | `repositories/`, `domain/` | data.md | 0007 | #NNN | `dataBoundary` |
| _(ex.: Provedores externos)_ | `ai/`, `payments/` | architecture.md | 0006 | #NNN | `providerAdapter` |
| _(ex.: UI/painel)_ | `dashboard/` | dashboard.md | — | #NNN | `*dashboard*` |
| _(ex.: Observabilidade)_ | `core/metrics.ts` | observability.md | — | — | `metrics*` |

## Invariantes transversais (valem em TODO domínio)

Estas não são de um domínio — são o pano de fundo de todos. Antes de qualquer mudança:
[`docs/sdd/constitution.md`](sdd/constitution.md) (P-1…P-N) + o índice de
[`docs/adr/`](adr/) (decisões vivas). `CLAUDE.md` é o índice-mãe de módulos e invariantes.
Aprendizado de produto (o que o dono recusou): [`docs/product/rejections.md`](product/rejections.md)
— o `product-owner` lê para não repropor rejeições do tipo `produto`.

> **Ligação de volta (ADR → código):** cada ADR referencia os módulos/`P-#` que restringe; este
> mapa é o caminho inverso (domínio → ADRs). Juntos formam o grafo navegável leve.
