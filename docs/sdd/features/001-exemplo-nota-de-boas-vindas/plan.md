# Plan: Nota de boas-vindas no primeiro contato (EXEMPLO)

> Local: `docs/sdd/features/001-exemplo-nota-de-boas-vindas/plan.md` · Deriva de `spec.md` (aprovada).
> **Exemplo didático.** Os nomes de módulo/tabela são ilustrativos — adapte à sua base.

## 1 · Abordagem

Interceptar o **primeiro turno** de um contato no pipeline de entrada: se não há histórico e o contato
é elegível (não opt-out), enfileirar/enviar a nota de boas-vindas **antes** de seguir para o fluxo
padrão, com uma reserva de idempotência por contato. Alternativa descartada: gerar a nota no LLM (custo
e não-determinismo desnecessários — a nota é um texto fixo localizado).

> Sem decisão arquitetural durável nova (reusa o ponto de extensão de "efeito" existente) → **sem ADR**.

## 2 · Módulos tocados

| Módulo (`src/…`) | Mudança | RFs |
|---|---|---|
| `pipeline/` | Nova fase/etapa `welcome` antes do fluxo padrão | RF-WELCOME-01 |
| `actions/` | `SendWelcomeNoteAction` (handler de efeito) | RF-WELCOME-01/02 |
| `repositories/` | Método para checar/registrar "nota enviada" por contato | RF-WELCOME-02 |
| `domain/` | Seleção de idioma da nota | RF-WELCOME-03 |

Respeita P-5: o acesso ao registro de "nota enviada" passa pela porta de dados.

```footprint
# Superfícies de ESCRITA (ADR-0007) — estreitas e disjuntas: cada handler/repositório é seu próprio arquivo.
writes:
  - src/pipeline/welcome-phase.*
  - src/actions/send-welcome-note.*
  - src/repositories/welcome.*
  - src/domain/welcome-locale.*
backend-frontend: disjunto
```

## 3 · Dados

- **Migration:** tabela/coluna `welcome_sent` por contato (com a chave de escopo do projeto); índice
  casando o `WHERE contato`.
- Sem estado quente novo. Sem dado pessoal novo (usa o contato já existente) — P-7 via opt-out.

## 4 · Idempotência e falha

- **Chave de reserva:** `welcome:<contato>` — reservada **antes** do envio; redelivery é no-op (RF-WELCOME-02).
- Falha no envio → **rollback da reserva** (permite retry) **e** não bloqueia o processamento da
  mensagem (degrada: loga + segue).

## 5 · Config e rollout

- Flag `WELCOME_NOTE_ENABLED` (default **off** — feature nova é opt-in, P-9).
- Ordem: migration → código → ligar a flag.

## 6 · Observabilidade

- Métrica `welcome.note_sent` (por escopo) e `welcome.note_failed`. Log estruturado com correlação.

## 7 · Testes

- Unit: seleção de idioma (RF-WELCOME-03).
- Integração/runtime: 1º contato recebe a nota antes do fluxo; 2º contato não recebe; redelivery é
  no-op; opt-out não recebe; falha de envio não bloqueia (P-3/P-7/P-8).

## 8 · Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Reserva sem rollback trava o retry | contato nunca mais recebe nota | testar rollback na falha (P-3) |
| Nota enviada a quem optou por sair | violação de opt-out | teste explícito de opt-out (P-7) |
| Envio bloqueia o turno em falha | usuário sem resposta | degradar (loga + segue), testado |
