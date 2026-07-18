#!/usr/bin/env bash
# ai-first · SessionStart hook — carrega os FUNDAMENTOS por construção.
#
# Toda sessão que abre um repo do método recebe, como contexto, o lembrete do bloco fixo,
# da pipeline SDD e do fluxo de git — antes de qualquer ação. Guia forte + determinístico:
# o modelo não "esquece" de carregar a constituição porque ela chega no turno 0.
#
# Só age em repositório do método (tem docs/sdd/constitution.md); em qualquer outro é no-op.
# Instalado pelo plugin (hooks/hooks.json) ou pelo /ai-first-init no .claude/settings.json.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -f "$root/docs/sdd/constitution.md" ] || exit 0

cat <<'EOF'
[ai-first] Método ATIVO neste repositório. Antes de agir, ancore-se:

BLOCO DE CONTEXTO FIXO (carregue, não improvise):
- CLAUDE.md — mapa de módulos, invariantes, pontos de extensão (o índice-mãe).
- docs/sdd/constitution.md — princípios P-# (invariantes BLOQUEANTES).
- docs/context-map.md — a LINHA do domínio que você vai tocar (não releia a base).

PRINCÍPIOS (piso de padrão-de-mercado, por trás das invariantes):
- docs/engineering-principles.md (implementação) + catálogos por disciplina
  (product/spec/operations/delivery-principles.md).

PIPELINE SDD — obrigatória para toda MUDANÇA DE COMPORTAMENTO:
  spec → plan/tasks (+ADR se durável) → implement → tester →
  adversarial-reviewer + security-reviewer → merge em develop → promoção a main.
Uma issue = uma feature = uma branch = um `Closes #NNN`.

GIT (o guard determinístico impõe; não contorne):
- Branch `claude/<slug>` a partir de `develop`. NUNCA commite/pushe direto em main/develop.
- PR contra `develop`; typecheck+lint+test verdes; gates de segurança/adversarial para o merge.

RETROALIMENTE (crescimento auditável, não acúmulo):
- Bug caçado → teste de regressão + anti-padrão em docs/knowledge.md.
- Decisão durável → ADR (leia o índice antes; não re-litigue Accepted).
- Aprendizado do real → docs/evolution.md. Incerteza → escale ao humano (não siga no escuro).
EOF
