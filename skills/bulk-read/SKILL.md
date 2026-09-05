---
name: bulk-read
description: Delega a LEITURA de arquivos grandes ao worker barato `bulk-reader` (haiku) e traz de volta só bullets estruturados — os arquivos nunca entram no contexto do modelo caro. Use quando precisar ENTENDER um ou mais arquivos acima de `read_router_threshold` linhas (o que contêm, onde está X, como se relacionam), ou quando o hook `pre-tool-read-router.sh` bloqueou uma leitura e nomeou esta rota. Invoque como `/bulk-read <arquivo(s)> -- <pergunta exata>`. Não substitui a leitura dirigida para EDITAR (aí use Read com offset+limit) nem delega julgamento (bug, arquitetura, segurança).
---

# /bulk-read — abrir o arquivo grande com o modelo barato, ficar só com a resposta

A camada **advisory** do roteador de leitura (ADR-0022 · `docs/token-efficiency.md` §9). O hook
`hooks/pre-tool-read-router.sh` é quem **força** (barra a leitura cara e nomeia esta rota); esta skill
só torna o redirecionamento **suave em vez de brusco** — o método degrada com elegância se ela não for
lida, porque o bloqueio já acontece sem ela.

## Entrada

`/bulk-read <caminho> [<caminho>…] -- <pergunta exata>`

- **A pergunta é obrigatória.** "Resume este arquivo" não é pergunta — é pedir o arquivo de volta com
  outra formatação, e devolve ao contexto caro o que o roteador existe para barrar. Pergunte o que vai
  **agir**: "quais funções exportadas chamam o repositório e em que linha", "onde a chave de escopo é
  validada", "que testes cobrem o caso X".
- Sem `--` e pergunta ⇒ PARE e peça a pergunta (não invente uma).

## Quando usar / quando NÃO usar

| Situação | Rota |
|---|---|
| Quero **entender** o arquivo grande (o que tem, onde está, como se relaciona) | **esta skill** → `bulk-reader` |
| Já sei o trecho e vou **editar** | `Read(offset, limit ≤ limiar)` — a leitura dirigida passa pelo hook; edição precisa do arquivo real |
| Arquivo ≤ `read_router_threshold` linhas | `Read` normal — abaixo do limiar a ida-e-volta custa mais do que economiza |
| Preciso **julgar** (bug sutil, decisão de design, segurança) | **modelo caro, com o trecho certo no contexto** — o worker acha padrão de superfície e perde o bug de concorrência |

## O que a skill faz

1. Invoca **um** `Agent` com `subagent_type: "bulk-reader"`, `model: "haiku"`, esforço baixo, passando
   os caminhos e a pergunta **verbatim**. Vários arquivos vão na **mesma** invocação (um hop, não N).
2. Recebe **só bullets** (`caminho:linha · fato`) — ≤ 25, com `cauda:` declarada se sobrou. Repassa ao
   fluxo **como fato de entrada**, sem reabrir os arquivos.
3. Se a resposta pede mais, **refina a pergunta** e chama de novo — nunca "então abre o arquivo inteiro".
   Se precisa de um trecho exato para editar, usa os `caminho:linha` devolvidos com `Read(offset, limit)`.

## Custo e honestidade

- Cada delegação é uma ida-e-volta (segundos). Vale acima do limiar; abaixo, não — por isso o hook
  não barra o pequeno.
- O retorno é **fato datado de leitura**, não raciocínio: pode ser compartilhado entre etapas de uma
  fatia (`token-efficiency.md` §6) sem ferir o isolamento (P-11/P-13).
- `bulk-reader` devolveu `não encontrado`/`ausente` ⇒ é achado, não silêncio. Não preencha o vazio.
