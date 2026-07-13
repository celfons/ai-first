# 🛠 Plano técnico (macro)

> **Esqueleto** — preencha com a arquitetura macro do **seu** projeto. É o *como* de alto
> nível (o *como* por-feature vive em cada `features/NNN-slug/plan.md`). Requisitos
> não-funcionais (RNF-###) moram aqui.

## 1 · Stack

- Linguagem/runtime, framework, banco, fila, cache, provedor de IA, hospedagem.

## 2 · Camadas e fronteiras (P-5)

Descreva a direção das dependências e onde ficam as **portas** (dados, provedores externos).

## 3 · Fluxo principal

Diagrama/descrição do caminho de uma requisição/mensagem de ponta a ponta.

## 4 · Modelo de dados

Tabelas/agregados principais e a chave de escopo (ex.: `tenant_id`). Ver `docs/data.md` se
existir.

## 5 · Requisitos não-funcionais (RNF-###)

| ID | Requisito | Como é garantido |
|---|---|---|
| RNF-01 | Resiliência: retry seguro em toda entrega | Idempotência em camadas (P-3) |
| RNF-02 | Segurança: segredos cifrados, auth fail-closed | P-6 |
| RNF-03 | Observabilidade: log estruturado + métricas + DLQ contada | P-8 |
| RNF-04 | Custo previsível | _(defina limites/quota)_ |
| RNF-05 | Qualidade: CI verde como gate | P-10 |
