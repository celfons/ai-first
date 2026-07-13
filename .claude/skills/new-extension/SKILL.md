---
name: new-extension
description: Use ao adicionar um NOVO ponto de extensão ao projeto pelo mecanismo canônico dele (novo provedor atrás de uma porta, nova Action/handler de efeito, nova strategy/plugin, novo repositório). Guia o scaffold completo seguindo os padrões do repositório — sem inventar um caminho paralelo. É a versão genérica; adapte os passos ao mecanismo de extensão real do seu projeto (descrito em `CLAUDE.md`).
---

# Criar uma nova extensão pelo mecanismo canônico

Todo projeto que adota o `ai-first` declara em `CLAUDE.md` seus **pontos de extensão** — os lugares
onde comportamento novo entra **sem tocar no núcleo**. Esta skill guia o scaffold por esses pontos,
para que uma extensão nova pareça ter sido escrita pelo resto do time.

> **Adapte ao seu projeto.** Os passos abaixo são o **esqueleto**. Ao adotar o framework, reescreva
> esta skill (ou crie irmãs dela — ex.: `new-provider`, `new-action`) com os nomes reais dos seus
> contratos, arquivos e testes-âncora, como fez o repositório de referência com sua skill de scaffold.

## Antes de começar
1. Leia o **mapa de pontos de extensão** em `CLAUDE.md` e o `docs/context-map.md` do domínio.
2. Leia uma extensão **existente** do mesmo tipo como referência mínima de estilo.
3. Confirme com o `architect` (ou o `plan.md`) **qual** ponto de extensão a mudança usa — não invente
   um caminho novo onde já existe um canônico.

## Padrões comuns (escolha o que se aplica)

### A · Novo provedor externo → porta + adapter
1. A **porta** (interface) já existe na camada de contratos? Implemente-a num novo adapter na camada
   de infra. Não vaze detalhe do provedor para o núcleo (P-5).
2. Selecione o adapter por configuração explícita (P-9), com **degradação segura** se o provedor
   falhar/estiver ausente.
3. Teste o adapter contra o contrato da porta (mock só na borda HTTP, que **lança** em requisição
   não prevista).

### B · Novo efeito colateral → handler/Action + regra
1. Crie o handler com a assinatura padrão do projeto (ex.: `execute(ctx): Promise<Result>`).
2. **Reserve idempotência ANTES do efeito** e faça rollback da reserva na falha (P-3); audite o
   efeito (P-8).
3. Registre a **regra declarativa** que dispara o efeito — não espalhe o gatilho pelo código.
4. Teste: efeito acontece uma vez; redelivery é no-op; falha libera a reserva.

### C · Nova strategy/plugin de comportamento
1. Implemente **todos** os métodos do contrato de strategy do projeto.
2. **Registre** a strategy no registry/factory. Cuidado com **import circular** (a strategy não
   importa o registry).
3. Defina o **fallback determinístico** para quando a IA falha (P-4).
4. Teste o mapeamento decisão → efeito e o caminho de fallback.

### D · Novo dado → repositório atrás da porta de dados
1. Migration/esquema versionado com a chave de escopo do projeto; índice casando o `WHERE`.
2. Método novo **na porta de dados** (`DataAccess`/repositório) — nunca acesse o driver fora dela (P-5).
3. Teste com o mock completo do projeto (método não sobrescrito **lança**).

## Regras a respeitar (universais)
- Saída de IA **sempre validada**; chamada de IA **sempre com timeout + fallback** (P-4).
- Efeito colateral **sempre** com idempotência antes + rollback na falha (P-3).
- Acesso a dados **sempre** atrás da porta (P-5); segredos cifrados, PII mascarada (P-6/P-7).
- `typecheck` + `lint` + `test` limpos antes do PR (P-10).
