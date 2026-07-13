# Spec: Nota de boas-vindas no primeiro contato (EXEMPLO)

> Local: `docs/sdd/features/001-exemplo-nota-de-boas-vindas/spec.md` · Issue: #001 · Status: aprovada
> **Este é um exemplo didático** que demonstra a forma de uma spec do método `ai-first`. O domínio
> (uma app genérica com "contatos") é fictício — troque pelo seu.

## 1 · Problema e valor

- **Quem:** o usuário final que fala com o produto pela **primeira vez**.
- **Problema hoje:** o primeiro contato cai direto no fluxo padrão, sem um acolhimento — o usuário
  não sabe o que o produto faz nem como pedir ajuda, e a taxa de abandono no 1º contato é alta.
- **Por que agora:** é a intervenção de menor custo com maior efeito em ativação; benchmarking mostra
  que "mensagem de boas-vindas contextual" virou table stakes na categoria.

## 2 · User stories

- **US-A** Como *usuário de primeiro contato*, quero *um acolhimento claro do que posso fazer aqui*,
  para *começar sem fricção*.

## 3 · Requisitos funcionais

| ID | Requisito (testável) |
|---|---|
| RF-WELCOME-01 | Quando um contato envia sua **primeira** mensagem, o sistema DEVE responder com uma nota de boas-vindas **antes** do fluxo padrão. |
| RF-WELCOME-02 | O sistema DEVE enviar a nota de boas-vindas **no máximo uma vez por contato** (idempotente por contato). |
| RF-WELCOME-03 | A nota DEVE estar no idioma do contato quando detectável; caso contrário, no idioma padrão. |

## 4 · Critérios de aceite

- **RF-WELCOME-01** — Dado um contato **sem histórico**, quando ele envia "oi", então o sistema envia
  a nota de boas-vindas e só depois processa a mensagem.
- **RF-WELCOME-02** — Dado um contato **que já recebeu** a nota, quando ele envia outra mensagem,
  então o sistema **não** reenvia a nota. (Redelivery da 1ª mensagem também é no-op.)
- **RF-WELCOME-03** — Dado um contato com idioma detectado `en`, quando recebe a nota, então ela está
  em inglês.

## 5 · Regras de negócio e casos de borda

- **Redelivery/retry** da primeira mensagem **não** pode gerar duas notas (P-3).
- **Opt-out:** contato que optou por não receber comunicação proativa **não** recebe a nota (P-7).
- Falha no envio da nota **não** pode bloquear o processamento da mensagem do usuário (degrada: loga +
  segue).

## 6 · Gate constitucional

- **P-3 (idempotência):** novo efeito colateral (envio) → reserva por contato antes de enviar.
- **P-7 (PII/opt-out):** comunicação proativa respeita opt-out.
- **P-8 (observável):** métrica de "nota enviada" e de falha de envio.
- Nenhum princípio é violado — sem PR na constituição.

## 7 · Fora de escopo

- Personalização do texto por segmento; A/B test da nota; nota em canais além do principal.

## 8 · Métricas de sucesso

- % de contatos de 1º contato que recebem a nota (meta: ~100% dos elegíveis).
- Queda na taxa de abandono no 1º contato (evento observável de continuação da conversa).
