# ADR-0022: Roteador de leitura (hook que barra a leitura cara) + workers baratos de leitura e escrita mecânica

> Status: Accepted · Data: 2026-09-05
> Feature/Issue: método (economia de token — a alavanca 9 do `token-efficiency.md`) · Princípios tocados: P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

A política de eficiência de token (`docs/token-efficiency.md` §1–§8) ataca o desperdício **entre**
etapas: releitura fria dos docs-base, modelo caro onde o barato serve, retorno verboso, rabo variável
que cresce. Nenhuma alavanca tratava do desperdício **dentro** de uma etapa: o que um agente faz
enquanto trabalha. E o que ele faz, na maior parte do tempo, **não é raciocínio — é mover texto**.
Abre cinco arquivos para responder sobre um; abre o arquivo de 2.000 linhas inteiro para checar 20;
digita o 21º teste igual aos 20 vizinhos. Trabalho enorme, quase nenhum julgamento, tudo cobrado na
tarifa do modelo forte — e o arquivo aberto fica no contexto e é **re-cobrado em todo turno seguinte**.

O gatilho externo foi o relato da Spotify Engineering ("Portal by Spotify cut my Claude Code token
usage by 90%", Dimitri Mazmanov, 3 set. 2026 — ~90% de economia média em leituras em massa, medida pelo
autor em quatro cenários de um monorepo Java; não é número auditado da empresa). Três coisas do relato
são **lições de método**, não detalhes de ferramenta:

1. **A primeira versão falhou porque era prosa.** As regras de roteamento nasceram num `CLAUDE.md`. O
   modelo as lia e às vezes seguia; quando não seguia, nada acontecia. Regra escrita é sugestão. O que
   consertou foi mover a decisão para um **hook `PreToolUse`** que **recusa** a leitura e nomeia a
   alternativa — a única das três camadas (hooks · scripts · skills) com autoridade para dizer não.
   É exatamente a distinção que o nosso `enforcement.md` já faz (documento orienta, hook força), que
   nunca tínhamos aplicado ao **custo**.
2. **As fronteiras foram declaradas antes, não descobertas depois.** Editar não é delegado (o resumo do
   worker não traz linha confiável — a leitura dirigida com `offset`+`limit` é **permitida** de
   propósito para isso). Raciocínio não é delegado (o worker barato **perdeu um bug de thread-safety**
   que o modelo forte viu em segundos com o contexto certo). O pequeno não é delegado (cada delegação é
   uma ida-e-volta de 10–30 s; abaixo do limiar custa mais do que economiza).
3. **A instrução que mais economiza é "só código, sem cerca, sem comentário".** Sem ela o worker embrulha
   a saída em formatação e narrativa, o modelo caro tem de ler e limpar, e o payload inteiro volta ao
   contexto que o roteamento existe para proteger. O leitor tem a instrução espelho: **só bullets**.

O método já tinha os pedaços: hooks determinísticos (ADR-0006), roteamento de modelo por etapa
(`sdd-orchestrator`), retorno enxuto (§3), "fato datado, não raciocínio" (§6), fitness function com
prova de mutação (ADR-0020). Faltava juntá-los **na leitura**.

## Decisão

Adotamos o **roteador de leitura** como **alavanca 9** da política de token, em três camadas com
autoridade desigual — e só uma delas pode dizer não.

**1 · Hook (força) — `hooks/pre-tool-read-router.sh`, `PreToolUse` com matcher `Read|Bash`.**
Barra (exit 2) o `Read` de arquivo com mais de **`read_router_threshold`** linhas (default **350**) sem
`limit ≤ limiar`, e o `Bash` que despeja um arquivo grande no contexto (`cat`/`less`/`more` como último
estágio do pipeline; `head`/`tail -n N` ou `sed -n A,Bp` pedindo mais de N linhas). A mensagem de
bloqueio **nomeia as duas rotas**: leitura dirigida (`offset`+`limit`) quando se sabe o trecho, ou o
worker `bulk-reader` quando se quer entender. **Passa**: leitura dirigida; arquivo ≤ limiar; saída
pipada/redirecionada; binário; **os arquivos do bloco de contexto fixo** (`CLAUDE.md`, constituição,
context-map — lê-los inteiro é o desenho do §1: são o prefixo cacheado). Só age em repo do método;
**fail-open** em erro de parse (o que não entende, deixa passar — nunca trava trabalho legítimo).
Knobs no genoma §8: **`read_router`** (`on`/`off`, default `on`) e **`read_router_threshold`**.
Não são knobs de **rigor** (ficam fora da trava "só aperta" — é economia, não régua); o hook em si é
**superfície de governança selada** (ADR-0020), e a fitness **F8** prova que ele está **registrado**
para `Read` (script no disco sem registro é a "primeira versão que falhou").

**2 · Workers (o barato por definição) — `agents/bulk-reader.md` e `agents/code-writer.md`, fixos em haiku.**
- `bulk-reader`: recebe caminhos + **a pergunta exata**; devolve **só bullets** (`caminho:linha · fato`,
  ≤ 25, cauda declarada). Reporta o que está escrito; **não julga** (um bullet `suspeito` e para). Lê
  **paginado** (`Grep` → `Read` com `limit ≤ limiar`), então passa pelo hook **pela regra, não por
  exceção** — funciona mesmo quando o runtime não identifica o subagente.
- `code-writer`: recebe spec curta + **arquivo de referência obrigatório** + destino; escreve **direto no
  disco**, imitando a referência exatamente; retorno = caminho + contagem, **nenhum código**. Recusa
  sem referência, recusa julgamento (invariante/segurança/dinheiro/concorrência/design), recusa
  sobrescrever. **Quem chamou não lê o arquivo — roda o teste.**

**3 · Skills (advisory) — `/bulk-read` e `/code-write`.** Descrevem quando e como chamar cada worker.
São **suaves por desenho**: se não forem lidas, o hook barra mesmo assim; elas só tornam o
redirecionamento fluido. O `/code-write` não tem gate algum — nenhum hook obriga a delegar escrita; é
opt-in do implementador que reconhece replicação.

**O que fica declaradamente fora (as fronteiras do relato, agora nossas):** `Edit`/`Write` nunca são
roteados; julgamento (bug, arquitetura, segurança) nunca é delegado; abaixo do limiar nada é barrado;
os **gates não mudam** — `tester`, `adversarial-reviewer` (opus/alto, P-14) e `security-reviewer` julgam
o diff agregado, código do worker incluído. O worker tira do modelo caro a **digitação e a leitura**,
nunca a **responsabilidade**.

## Alternativas consideradas

- **Só prosa (regra no `CLAUDE.md`/agentes: "prefira leituras dirigidas").** É o que já tínhamos em
  espírito e o que a Spotify tentou primeiro: funciona às vezes. Advice, não enforcement; e cada
  projeto precisaria da sua cópia. Descartada como **única** camada — permanece como camada 3.
- **Serviço externo de worker (como o Portal da Spotify).** Um runtime próprio para os modos baratos.
  Amarraria o método a infraestrutura fora do Claude Code e duplicaria o que `Agent({model:'haiku'})`
  já dá: sessão isolada, modelo barato, contexto de quem chamou intocado. Adotamos os **mecanismos**
  (hook que barra + modo declarativo + só-bullets/só-código), não a plataforma.
- **Barrar também `Edit`/`Write` de arquivo grande.** Edição precisa do arquivo real e de linha
  confiável; delegá-la ao worker é onde a economia vira bug. Descartada — a leitura dirigida existe
  para isso e o hook a deixa passar.
- **Limiar em bytes/tokens em vez de linhas.** Mais preciso, menos legível na mensagem de bloqueio e
  mais caro de medir no hook. Linhas bastam para o corte "grande vs. pequeno" e o knob permite afinar.
- **Tratar `read_router` como knob de rigor (trava "só aperta").** Desligar o roteador encarece, não
  afrouxa a régua de qualidade. Travar custo como se fosse rigor geraria atrito sem proteger nada que
  os gates já não protejam. Fica fora, de propósito (mesmo critério do ADR-0020 para `bdd_style`).

## Consequências

- **Positivas:** a leitura em massa deixa de ser cobrada na tarifa forte **por construção**, não por
  lembrança; o contexto do modelo caro para de carregar arquivos que ele só folheou (o ganho compõe:
  cada turno seguinte não re-paga); a mensagem de bloqueio **ensina a alternativa no momento do erro**;
  a régua vale igual em `/feature` e no caminho autônomo; e a fitness F8 impede que o hook vire
  "regra escrita" de novo.
- **Custos/limites:** cada delegação é uma ida-e-volta (segundos) — por isso o limiar; o hook é regex
  sobre comandos de shell e **fail-open**: pipelines exóticos passam sem barrar (é o preço de nunca
  travar trabalho legítimo); o worker devolve **fato de superfície** — quem confundir isso com
  revisão vai perder bug; a exceção do bloco fixo assume que ele cabe no cache (arquivo-mãe gigante
  continua sendo problema de §1, não deste ADR). O número de 90% é **do relato, medido pelo autor** —
  aqui o ganho real é o `finops-steward` quem mede (§5), e a taxa de "delegação que precisou reabrir o
  arquivo" é o sinal de que o limiar ou o contrato do worker estão errados.
- **Restrições futuras:** todo agente que precisa **entender** arquivo grande passa por `bulk-reader`
  ou lê dirigido — não há terceira via silenciosa; novo worker barato segue o mesmo contrato (entrada
  fechada, saída só-dado, fronteira de julgamento declarada); mudança no hook é reselo de política +
  F8 verde; e **nenhum knob deste ADR relaxa gate**: se um dia alguém propuser "o worker revisa", a
  resposta está na alternativa descartada acima.

## Relacionados

`docs/token-efficiency.md` §9 · `docs/governance/enforcement.md` §2b · ADR-0006 (camadas de enforcement) ·
ADR-0020 (superfície selada + F8 com fixture) · ADR-0012/ADR-0005 ("fato, não raciocínio") · P-11/P-13
(isolamento e separação de papéis intactos) · P-14 (piso opus/alto do gate não muda) · P-15 (knobs
ajustáveis) · Spotify Engineering, "Portal by Spotify cut my Claude Code token usage by 90%" (2026-09-03).
