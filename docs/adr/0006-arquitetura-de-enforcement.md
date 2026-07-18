# ADR-0006: Enforcement em camadas (guia + força + loop) para aderência garantida ao método

> Status: Accepted · Data: 2026-07-18
> Feature/Issue: — (governança do método) · Princípios tocados: P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O método `ai-first` era, até aqui, imposto de forma **probabilística**: `CLAUDE.md`, os subagentes e os
catálogos de princípios *orientam* a sessão, mas nada **impede** um desvio — uma sessão pode pular a
pipeline SDD, commitar direto em `main`, ou não realimentar o conhecimento. Para um pipeline que
auto-mergeia (P-13/autonomia), "confiar que o modelo lembra" não é garantia: aderência precisa de
controle **determinístico**, fora da discricionariedade do modelo. Ao mesmo tempo, o crescimento
saudável (auditável, uniforme, sem inchar) exige que a retroalimentação seja uma engrenagem, não um
hábito opcional.

## Decisão

Adotamos um **enforcement em 6 camadas** (documentado em `docs/governance/enforcement.md`), separando
explicitamente **guia** (probabilístico), **força** (determinístico) e **loop** (retroalimentação):

1. **`SessionStart` hook** (`hooks/session-start.sh`) — injeta o bloco fixo + a pipeline em toda sessão.
2. **`PreToolUse` guard** (`hooks/pre-tool-guard.sh`) — bloqueia push/commit direto em main/develop.
3. **Gate no servidor** (`templates/ci/ai-first-guard.yml` + branch protection) — recusa merge sem CI
   verde e sem disciplina de fluxo; os gates de segurança/adversarial são **required checks**.
4. **Fitness functions** — invariantes viram testes que quebram o build no desvio (fatia seguinte).
5. **Guia/uniformidade** — bloco fixo, catálogos de princípios, templates.
6. **Retroalimentação** — `/distill`, `/daily-outcome`, ADRs, `evolution.md` (higiene de memória, ADR-0005).

O plugin **shippa** os hooks e o template de CI; o `/ai-first-init` os **instala** no repo-alvo
(`.ai-first/hooks/` + `.claude/settings.json` + `.github/workflows/`), tornando o enforcement versionado
e auditável junto do produto.

## Alternativas consideradas

- **Só documentação (status quo)** — descartada: orienta, não garante; um desvio passa silencioso.
- **Só CI/branch protection (sem hooks)** — descartada como suficiente: pega o desvio tarde (no merge),
  não no ato; a camada de sessão (1–2) corrige cedo e barato, dentro do loop do agente.
- **Só hooks (sem servidor)** — descartada: hook protege a sessão que o tem; a branch protection protege
  o repositório inclusive contra sessões sem hooks e contra humano apressado. As duas se somam.
- **Bloquear tudo por regex agressivo** — descartada: falso-positivo trava trabalho legítimo; o guard é
  fail-open no parse e mira só os alvos claros (main/develop).

## Consequências

- **Positivas:** aderência ao fluxo vira **garantia**, não torcida; toda sessão carrega os fundamentos
  por construção; a trilha (issue↔PR↔ADR) fica auditável; o método propaga versionado sem tocar código
  de produto.
- **Custos/limites:** exige configurar branch protection no repo-alvo (passo humano, uma vez); os hooks
  são heurísticos de git (cobrem o essencial, não toda forma criativa de burlar); a suíte de fitness
  functions ainda é fatia seguinte — até lá, as invariantes dependem da suíte de testes do repo.
- **Restrições futuras:** todo repo do método DEVE instalar o kit no genesis; novo controle de força
  entra como camada nova aqui (não como regra solta); o guard nunca deve virar fail-closed no parse
  (não travar trabalho legítimo por erro de extração de comando).

## Relacionados

Links: `docs/governance/enforcement.md`, constituição (P-10/P-11/P-13/P-14/P-15), ADR-0001 (adoção do
método), ADR-0005 (arquitetura cognitiva/memória), `docs/token-efficiency.md` (bloco fixo),
`hooks/`, `templates/ci/ai-first-guard.yml`, `skills/ai-first-init/SKILL.md`.
