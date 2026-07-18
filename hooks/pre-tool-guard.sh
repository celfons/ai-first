#!/usr/bin/env bash
# ai-first · PreToolUse(Bash) guard — o "forçar" determinístico do fluxo de git.
#
# Intercepta comandos Bash ANTES de executarem e BLOQUEIA (exit 2) os que violam o fluxo
# feature → develop → main. É a camada que o modelo não pode contornar: não depende de ele
# "lembrar" da convenção — a ação proibida simplesmente não acontece.
#
# Bloqueia:
#   1. push cujo destino é main/develop (a promoção é por PR/merge, nunca push local).
#   2. commit/push/merge/rebase enquanto HEAD está em main/develop (trabalhe em claude/<slug>).
#   3. force-push a branch compartilhada (main/develop).
# Só age em repo do método (docs/sdd/constitution.md); em outro é no-op. Fail-open apenas
# quando não consegue extrair o comando (nunca trava trabalho legítimo por erro de parse).
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -f "$root/docs/sdd/constitution.md" ] || exit 0

input="$(cat)"

# Extrai .tool_input.command de forma portátil (jq → python3 → sed).
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
elif command -v python3 >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)"
else
  cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')"
fi

# Sem comando extraído ou sem git → nada a barrar (fail-open, não atrapalha).
[ -n "${cmd:-}" ] || exit 0
printf '%s' "$cmd" | grep -Eq '\bgit\b' || exit 0

branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

block() {
  # PreToolUse: exit 2 bloqueia a chamada; stderr volta ao modelo como feedback.
  printf '[ai-first · GUARD] BLOQUEADO: %s\n' "$1" >&2
  printf 'Fluxo do método: feature → develop → main. Trabalhe em `claude/<slug>` a partir de develop;\n' >&2
  printf 'abra PR contra develop; a promoção develop→main é por PR/merge (nunca push local).\n' >&2
  printf 'Se isto é intencional e excepcional, faça-o fora do agente ou ajuste a política de enforcement.\n' >&2
  exit 2
}

is_push=false;  printf '%s' "$cmd" | grep -Eq '\bpush\b'   && is_push=true

# 1) push cujo destino é main/develop
if $is_push && printf '%s' "$cmd" | grep -Eq '(\borigin[[:space:]]+(main|develop)\b|:(main|develop)\b|\b(main|develop):|(--all|--mirror)\b)'; then
  block "push cujo destino inclui main/develop"
fi

# 3) force-push tocando branch compartilhada
if $is_push && printf '%s' "$cmd" | grep -Eq '(--force\b|--force-with-lease\b|(^|[[:space:]])-f\b)' \
            && printf '%s' "$cmd" | grep -Eq '\b(main|develop)\b'; then
  block "force-push a uma branch compartilhada (main/develop)"
fi

# 2) trabalhando direto na branch compartilhada
if [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  if printf '%s' "$cmd" | grep -Eq '\bgit[[:space:]]+(commit|push|merge|rebase)\b'; then
    block "git ${cmd#git } com HEAD em '$branch' — crie/use a branch claude/<slug>"
  fi
fi

exit 0
