# Spec: [NOME DA FEATURE]

> Local: `docs/sdd/features/NNN-slug/spec.md` · Issue: #NNN · Status: rascunho | aprovada
> Foco no **o quê / por quê**. Nenhuma decisão de stack/implementação aqui (isso é o plan).
> Marque toda incerteza com `[NEEDS CLARIFICATION: pergunta]` — não chute.

## 1 · Problema e valor

- **Quem** sofre o problema (persona) e **qual** é o problema hoje.
- **Por que agora**; o que acontece se não fizermos.

## 2 · User stories

- **US-A** Como *persona*, quero *capacidade*, para *benefício*.

## 3 · Requisitos funcionais

| ID | Requisito (testável, sem ambiguidade) |
|---|---|
| RF-XXX-01 | O sistema DEVE … |
| RF-XXX-02 | Quando …, o sistema DEVE … |

## 4 · Critérios de aceite

Para cada RF, ao menos um cenário falseável:

- **Dado** [estado inicial], **quando** [evento], **então** [resultado observável].

## 5 · Regras de negócio e casos de borda

- Comportamento sob falha (dependência fora, entrada inválida, redelivery/retry).
- Interação com opt-out / limites / concorrência / quota, se houver proatividade ou efeito externo.

## 6 · Gate constitucional

Checar cada princípio de [`../../constitution.md`](../../constitution.md) e anotar os
impactados (ex.: novo efeito colateral → P-3; novo dado pessoal → P-7; nova comunicação
proativa → P-7; SQL/consulta nova → P-5). **Violação exige antes PR na constituição.**

## 7 · Fora de escopo

- O que explicitamente NÃO entra nesta feature.

## 8 · Métricas de sucesso

- Como saberemos que funcionou (métrica/evento observável, não opinião).
