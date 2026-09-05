#!/usr/bin/env bash
# ai-first · PreToolUse(Read|Bash) read-router — a leitura cara é BARRADA antes de acontecer.
#
# A observação por trás (Spotify Engineering, "Portal by Spotify cut my Claude Code token usage by
# 90%", set/2026): a maior parte do que um agente de código faz não é raciocínio — é mover texto.
# Abrir um arquivo de 2.000 linhas para responder uma pergunta sobre 20 delas custa o arquivo INTEIRO
# na tarifa do modelo caro, e ele fica no contexto (re-cobrado) em todo turno seguinte. A regra
# escrita ("prefira leituras dirigidas") já existia e o modelo a ignorava. Regra escrita é sugestão;
# hook é bloqueio. Esta é a única camada com autoridade para dizer NÃO (ADR-0021).
#
# O que faz:
#   • `Read` de arquivo com MAIS de `read_router_threshold` linhas (default 350) sem `limit` ≤ limiar
#     ⇒ BLOQUEIA (exit 2) e nomeia as duas alternativas: leitura dirigida (`offset`+`limit`) ou
#     delegar ao subagente barato `bulk-reader` (só os bullets voltam ao contexto).
#   • `Bash` que despeja um arquivo grande no contexto (`cat`/`less`/`more`/`bat` como último estágio
#     do pipeline; `head`/`tail -n N` ou `sed -n A,Bp` pedindo mais de N linhas) ⇒ idem.
#   • Passa: leitura dirigida; arquivo ≤ limiar; saída redirecionada/pipada para outro comando;
#     binário/imagem/PDF; os arquivos do BLOCO DE CONTEXTO FIXO (`CLAUDE.md`, constituição,
#     context-map — são o prefixo cacheado do §1 de token-efficiency, lê-los inteiro É o desenho);
#     e o próprio `bulk-reader` (ele lê paginado, ≤ limiar por chamada — passa pela regra, não por exceção).
#
# O que NÃO faz (fronteiras declaradas, não descobertas depois): não toca `Edit`/`Write` (editar
# precisa do arquivo real — a leitura dirigida é permitida exatamente para isso); não julga
# conteúdo (o worker barato acha padrão de superfície, não bug de concorrência — raciocínio fica no
# modelo caro); não barra o pequeno (abaixo do limiar a ida-e-volta custa mais do que economiza).
#
# Knobs (genoma §8): `read_router: on|off` · `read_router_threshold: N`. Env: AI_FIRST_READ_ROUTER,
# AI_FIRST_READ_THRESHOLD sobrepõem (para humano depurando). Só age em repo do método
# (docs/sdd/constitution.md); em outro é no-op. FAIL-OPEN em erro de parse — nunca trava trabalho
# legítimo por não entender o comando; o que não entende, deixa passar.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -f "$root/docs/sdd/constitution.md" ] || exit 0

input="$(cat)"

# --- extração portátil de campos do JSON de entrada (jq → python3; sem ambos: fail-open) ------------
if command -v jq >/dev/null 2>&1; then
  field() { printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null || true; }
elif command -v python3 >/dev/null 2>&1; then
  field() {
    printf '%s' "$input" | python3 -c '
import sys, json
path = sys.argv[1].lstrip(".").split(".")
try:
    cur = json.load(sys.stdin)
    for p in path:
        cur = cur.get(p) if isinstance(cur, dict) else None
    print("" if cur is None else cur)
except Exception:
    print("")' "$1" 2>/dev/null || true
  }
else
  exit 0
fi

tool="$(field '.tool_name')"
[ -n "$tool" ] || exit 0
case "$tool" in Read|Bash) ;; *) exit 0 ;; esac

# --- knobs: env > genoma > default ------------------------------------------------------------------
genome="$root/docs/ai-first/project.md"
knob() {
  # valor entre crases logo após "- **`nome`** …:" (mesma leitura que scripts/policy-lock.mjs);
  # valor entre colchetes (`[A DEFINIR]`, `[on | off]`) = não definido ⇒ vazio.
  [ -f "$genome" ] || return 0
  local v
  v="$(grep -m1 -E "^[[:space:]]*-[[:space:]]+\*\*\`$1\`\*\*" "$genome" 2>/dev/null \
      | grep -oE ':[[:space:]]*`[^`]+`' | head -1 | sed -E 's/^:[[:space:]]*`([^`]+)`$/\1/' || true)"
  case "$v" in \[*) v="" ;; esac
  printf '%s' "$v"
}
enabled="${AI_FIRST_READ_ROUTER:-$(knob read_router)}"
case "$(printf '%s' "${enabled:-on}" | tr '[:upper:]' '[:lower:]')" in off|false|0|no|não|nao) exit 0 ;; esac
threshold="${AI_FIRST_READ_THRESHOLD:-$(knob read_router_threshold)}"
[[ "${threshold:-}" =~ ^[0-9]+$ ]] || threshold=350

# O worker barato lê por conta própria (paginado). Se o runtime identifica o subagente, isenta-o;
# se não identifica, a paginação ≤ limiar passa pela regra geral — o worker funciona nos dois casos.
agent="$(field '.agent_type')"; [ -n "$agent" ] || agent="$(field '.agent_name')"
if [ "$agent" = "bulk-reader" ]; then exit 0; fi

cwd="$(field '.cwd')"; [ -n "$cwd" ] || cwd="$PWD"

lines_of() { wc -l < "$1" 2>/dev/null | tr -d '[:space:]' || echo 0; }
resolve() { case "$1" in /*) printf '%s' "$1" ;; ~/*) printf '%s' "${HOME}${1#\~}" ;; *) printf '%s/%s' "$cwd" "$1" ;; esac; }
is_exempt_path() {
  # binário/imagem/PDF (linha não mede nada) + arquivos do bloco de contexto fixo (prefixo cacheado).
  local p="$1" rel
  case "$(printf '%s' "$p" | tr '[:upper:]' '[:lower:]')" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.svg|*.pdf|*.ipynb|*.woff|*.woff2|*.ttf|*.zip|*.gz|*.tar) return 0 ;;
  esac
  rel="${p#"$root"/}"
  case "$rel" in CLAUDE.md|docs/sdd/constitution.md|docs/context-map.md) return 0 ;; esac
  return 1
}

block() {
  # PreToolUse: exit 2 bloqueia a chamada; stderr volta ao modelo como feedback — e NOMEIA a alternativa.
  local file="$1" n="$2" via="$3"
  cat >&2 <<EOF
[ai-first · READ-ROUTER] BLOQUEADO: $via despejaria $n linhas de '$file' no contexto (limiar: $threshold).
Leitura em massa não é raciocínio — é mover texto na tarifa do modelo caro, e o arquivo inteiro seria
re-cobrado em TODO turno seguinte. Escolha uma das duas rotas (ADR-0021 · token-efficiency.md §9):
  1. LEITURA DIRIGIDA — você já sabe qual trecho precisa (vai editar, checar uma função):
       Read(file_path, offset=<linha>, limit=<= $threshold>)   ou   sed -n '<a>,<b>p' (b-a < $threshold)
       Use Grep primeiro para achar a linha; edição continua precisando do arquivo real — este caminho existe para isso.
  2. DELEGAR AO WORKER BARATO — você quer ENTENDER o arquivo (o que tem, onde está, como se relaciona):
       Agent(subagent_type: "bulk-reader", model: "haiku", prompt: "<arquivos> + <a pergunta exata>")
       Só os bullets estruturados (nome/linha à frente) voltam ao contexto; o arquivo nunca entra. Skill: /bulk-read.
Não delegue julgamento (bug sutil, decisão de arquitetura, segurança): o worker acha padrão de superfície.
Para desligar: \`read_router: off\` no genoma (docs/ai-first/project.md §8) ou AI_FIRST_READ_ROUTER=off.
EOF
  exit 2
}

# --- Read --------------------------------------------------------------------------------------------
if [ "$tool" = "Read" ]; then
  fp="$(field '.tool_input.file_path')"
  [ -n "$fp" ] || exit 0
  fp="$(resolve "$fp")"
  if is_exempt_path "$fp"; then exit 0; fi
  [ -f "$fp" ] || exit 0
  n="$(lines_of "$fp")"
  [ "$n" -gt "$threshold" ] || exit 0
  limit="$(field '.tool_input.limit')"
  if [[ "${limit:-}" =~ ^[0-9]+$ ]] && [ "$limit" -le "$threshold" ]; then exit 0; fi
  block "${fp#"$root"/}" "$n" "Read sem limit ≤ $threshold"
fi

# --- Bash --------------------------------------------------------------------------------------------
cmd="$(field '.tool_input.command')"
[ -n "$cmd" ] || exit 0
printf '%s' "$cmd" | grep -Eq '\b(cat|less|more|bat|head|tail|sed)\b' || exit 0

# Quebra em pipelines (;, &&, ||, quebra de linha) e olha só o ÚLTIMO estágio de cada um — o que
# escreve no contexto. `cat x | grep y` processa, não despeja; `cat x > y` redireciona.
printf '%s\n' "$cmd" | sed -E 's/&&|\|\||;/\n/g' | while IFS= read -r pipeline; do
  stage="${pipeline##*|}"
  if printf '%s' "$stage" | grep -Eq '(^|[^>])>'; then continue; fi   # saída redirecionada: não vai ao contexto
  # shellcheck disable=SC2086
  set -- $stage 2>/dev/null || continue
  # pula prefixos de ambiente/sudo/time
  while [ $# -gt 0 ]; do case "$1" in *=*|sudo|time|nice|env) shift ;; *) break ;; esac; done
  [ $# -gt 0 ] || continue
  bin="${1##*/}"; shift
  case "$bin" in
    cat|less|more|bat)
      for a in "$@"; do
        case "$a" in -*) continue ;; esac
        f="$(resolve "$a")"; if is_exempt_path "$f"; then continue; fi; [ -f "$f" ] || continue
        n="$(lines_of "$f")"
        if [ "$n" -gt "$threshold" ]; then block "${f#"$root"/}" "$n" "\`$bin\`"; fi
      done ;;
    head|tail)
      want=10; from_line=""; files=()
      while [ $# -gt 0 ]; do
        case "$1" in
          -n) shift; [ $# -gt 0 ] || break; v="$1" ;;
          -n*) v="${1#-n}" ;;
          --lines=*) v="${1#--lines=}" ;;
          -[0-9]*) v="${1#-}" ;;
          -c|-c*|--bytes=*) v="" ;;
          -*) shift; continue ;;
          *) files+=("$1"); shift; continue ;;
        esac
        case "${v:-}" in +*) from_line="${v#+}" ;; *) [[ "${v:-}" =~ ^[0-9]+$ ]] && want="$v" ;; esac
        shift
      done
      for a in "${files[@]:-}"; do
        [ -n "$a" ] || continue
        f="$(resolve "$a")"; if is_exempt_path "$f"; then continue; fi; [ -f "$f" ] || continue
        n="$(lines_of "$f")"
        if [ -n "$from_line" ] && [ "$bin" = "tail" ] && [[ "$from_line" =~ ^[0-9]+$ ]]; then want=$(( n - from_line + 1 )); fi
        if [ "$want" -gt "$n" ]; then want="$n"; fi
        if [ "$want" -gt "$threshold" ]; then block "${f#"$root"/}" "$want" "\`$bin\` pedindo $want linhas"; fi
      done ;;
    sed)
      # só o idioma de leitura `sed -n 'A,Bp' arquivo` (o que o método sugere para leitura dirigida).
      rng="$(printf '%s' "$*" | grep -oE "[0-9]+,[0-9]+p" | head -1 || true)"
      [ -n "$rng" ] || continue
      a="${rng%%,*}"; b="${rng#*,}"; b="${b%p}"
      span=$(( b - a + 1 ))
      [ "$span" -gt "$threshold" ] || continue
      for arg in "$@"; do
        case "$arg" in -*|*p|*p\'|*p\") continue ;; esac
        f="$(resolve "$arg")"; if is_exempt_path "$f"; then continue; fi; [ -f "$f" ] || continue
        n="$(lines_of "$f")"; if [ "$span" -gt "$n" ]; then span="$n"; fi
        if [ "$span" -gt "$threshold" ]; then block "${f#"$root"/}" "$span" "\`sed -n $rng\`"; fi
      done ;;
  esac
  true   # o status do último comando do laço não pode vazar como "falha" (set -e / pipefail)
done || exit $?   # `block` sai com 2 dentro do subshell do pipeline — propaga o bloqueio

exit 0
