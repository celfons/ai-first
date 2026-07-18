---
name: export-portable
description: Exporta o método ai-first (roster de subagentes + skills + contexto) para um pacote PORTÁVEL, utilizável FORA do Claude Code — em orquestradores como o Maestri (canvas de agentes) ou qualquer CLI de agente movido a GPT/outro LLM (Codex CLI, Aider, opencode). Gera roles (AGENTS.md + .maestri/role.json para o "Discover Roles" do Maestri), runbooks das skills e um AGENTS.md raiz de contexto fixo. Use quando o humano quiser levar a solução para outro runtime/plataforma sem depender do Claude.
---

# /export-portable — leva o método ai-first para fora do Claude Code

Empacota o **cérebro** do ai-first (roster + skills + contexto) num formato que **outros runtimes
importam**: o **Maestri** (canvas de agentes, via "Discover Roles") ou um **CLI de agente** apontado
para o seu LLM (GPT/outro). Não migra código de produto — isso é o `/migrate`; aqui o alvo é o
**próprio método**.

## O que faz
Roda o conversor determinístico (zero dependências):
```sh
node scripts/export-portable.mjs [dir-de-saida]   # default: dist/portable
```
Ele lê `agents/*.md`, `skills/*/SKILL.md` e o contexto (`CLAUDE.md`, genoma, constituição, ADRs) e gera:
- **`AGENTS.md`** raiz — o contexto fixo que todo papel carrega (o "CLAUDE.md" do runtime alvo).
- **`roles/<agente>/AGENTS.md`** — as instruções do papel, com o frontmatter específico do Claude
  removido e uma nota de **modelo** (papéis de gate/segurança pedem o LLM mais forte) e de
  **capacidades** (o que o nó precisa: ler repo, GitHub, shell…).
- **`roles/<agente>/.maestri/role.json`** — sidecar para o **"Discover Roles"** do Maestri importar o
  roster em lote (nome + cor da raia + prompt).
- **`runbooks/<skill>.md`** — cada cron/skill como **receita de fiação** (a ordem das etapas = como
  conectar os nós no canvas).
- **`README.md` + `manifest.json`** — como importar/rodar + índice e proveniência.

## Passos
1. Rode o conversor (acima). A saída (`dist/`) é **gerada, não versionada** (está no `.gitignore`).
2. Reporte ao humano o resumo do stdout: nº de papéis + runbooks e as duas formas de usar
   (Maestri "Discover Roles" **ou** um CLI GPT — ver o `README.md` gerado).
3. Se o humano pedir outro diretório de saída, passe-o como argumento.

## Fronteira honesta (diga ao humano)
- **Importa nativo:** o roster (roles) e o contexto — o Maestri lê `AGENTS.md`/`role.json`.
- **Manual:** a **fiação dos nós** no canvas (pipes PTY) segue a ordem dos runbooks — o pacote dá a
  receita, não pilota a GUI.
- **Recriar no destino:** o **enforcement** (hooks do Claude) vira **branch protection + CI**
  (`ai-first-guard.yml` já é portável).
- **Schema:** o formato de `role.json` é best-effort (doc "Terminals & Agents" do Maestri); o
  `AGENTS.md` por papel é o caminho robusto se o schema divergir.
