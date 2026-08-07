# 🎨 Princípios de Design de Interface (agnósticos)

Catálogo **destilado e desacoplado** das boas práticas de design de interface — sistema visual,
tipografia, layout, design de informação e escrita de produto —, independente de stack, mapeado aos
benchmarks canônicos do mercado (Refactoring UI, Apple HIG, Material Design, W3C Design Tokens,
WCAG 2.2, Inclusive Components/Pickering, Practical Typography/Butterick, heurísticas de Nielsen,
Krug, Laws of UX).

> **Para quem é:** os subagentes da **interface** — `ux-designer` (decide o quê/por quê) e
> `frontend-engineer` (executa). É o análogo do `docs/engineering-principles.md`, aplicado à
> disciplina de design. Não substitui a constituição (invariantes) nem o `docs/knowledge.md`
> (padrões e **anti-padrões** de UI, que é a versão *caçável no gate*); é o **piso de
> padrão-de-mercado** da decisão visual.

> **Origem (episódico → semântico):** nasceu do recorte durável da skill `artifact-design` do Claude
> Code, cruzado com o benchmark público da disciplina. O que **não** entrou foi deliberado: as
> restrições de página auto-contida (CSP, fonte em data-URI, tema do viewer) não são deste meio, e a
> *stance* editorial ("tome um risco estético") **contradiz** a régua da casa — em produto,
> consistência vence originalidade. Ver `docs/evolution.md` (2026-08-07).

---

## O núcleo — as cinco leis

1. **Consistência > originalidade.** O sistema é o produto; a tela é uma instância dele. Reusar o
   padrão existente é quase sempre a decisão certa. *(Design systems · Nielsen #4)*
2. **Tudo vem do token** — cor, tipografia, espaço, raio, sombra, duração. Valor mágico numa tela é
   dívida que não cascateia. *(W3C Design Tokens)*
3. **A interface real vive nos estados de borda e em escala** — vazio, carregando, erro, e "cheio =
   MUITOS" —, não no caso feliz. *(Refactoring UI · resilient UX)*
4. **Acessibilidade é piso de correção, não acabamento.** WCAG AA é o mínimo de um entregável, como
   o teste verde. *(WCAG 2.2 · Inclusive Components)*
5. **Escolha deliberada > default herdado.** Todo neutro, toda face, todo device estrutural ou foi
   escolhido a partir do domínio e se justifica, ou é ruído com aparência de decisão.

---

## 1 · Sistema visual — token & cor

| Regra | Benchmark |
|---|---|
| Hierarquia por **peso, tamanho, cor e espaço** — não por borda e caixa em volta de tudo | Refactoring UI |
| **O neutro é escolhido, não herdado:** cinza puro (o `gray-500` da lib) lê como não-considerado; um neutro com leve **viés de matiz na direção do acento** lê como projetado | Refactoring UI (grays with temperature) |
| **Cor semântica** (bom · atenção · crítico) é um **eixo separado** do acento da marca — e nunca *é* o acento | Material · design de informação |
| **Gaste a ousadia em UM lugar** e mantenha o resto quieto; se o acento briga com o fundo, aproxime-o de análogo ou baixe a saturação em vez de trocá-lo | Composição |
| **Os dois temas com o mesmo cuidado:** defina a paleta como tokens e **redefina só os tokens** no tema escuro — nunca inverta ingenuamente; contraste e acento têm de funcionar nos dois fundos | Dark mode ≠ inversão |
| Comprometer-se com **um** mundo visual só (nunca escuro, nunca claro) é legítimo — mas como **escolha declarada**, não omissão | — |

## 2 · Tipografia

| Regra | Benchmark |
|---|---|
| **Pareamento por papel:** uma face de **display** (usada com restrição), uma de **corpo**, e uma **utilitária** para dado/caption — não uma face só esticada em todos os tamanhos | Practical Typography |
| Defina uma **escala** e fique nela; peso e espaçamento fazem parte da escala, não são ajustes ad hoc | Type scale |
| **Medida de leitura ~65 caracteres** no texto corrido; linha longa demais é o erro tipográfico mais comum na web | Butterick |
| `text-wrap: balance` em títulos; **letter-spacing** em rótulo caixa-alta; corpo com entrelinha que respira | Detalhe tipográfico |
| **`font-variant-numeric: tabular-nums`** onde dígito alinha em coluna (tabela, KPI, preço, timer) — sem isso a coluna "dança" | Dados tabulares |
| Fonte **auto-hospedada** e declarada com fallback explícito; nunca dependa de CDN que pode falhar em silêncio e degradar a página inteira | Robustez de asset |

## 3 · Layout & espaçamento

| Regra | Benchmark |
|---|---|
| **O layout dá o espaço:** grupos irmãos com flex/grid + `gap`, não margem por elemento (que colapsa ou duplica em silêncio) | CSS layout moderno |
| Conteúdo largo (tabela, código, diagrama) rola **no próprio container** (`overflow-x: auto`) — o corpo da página **nunca** rola lateralmente | Responsividade |
| Ritmo de espaçamento vem da escala; alinhamento e ritmo batem em **todos** os breakpoints | Refactoring UI |
| Mobile é a **mesma** informação reordenada/colapsada, nunca uma versão amputada nem uma árvore diferente | Mobile-first |

## 4 · Estrutura codifica informação (não decora)

| Regra | Benchmark |
|---|---|
| Numeração, *eyebrow*, divisor e rótulo devem **encodar algo verdadeiro** sobre o conteúdo | Design de informação |
| **`01 / 02 / 03` só se o conteúdo for mesmo uma sequência** — um processo real, uma linha do tempo. Se a ordem não carrega informação que o leitor precisa, a numeração é ruído com cara de rigor | — |
| Antes de usar um device estrutural, pergunte **o que ele afirma**; se a resposta é "fica bonito", ele sai | Sobriedade |

## 5 · Copy é material de design

| Regra | Benchmark |
|---|---|
| **Nomeie pelo que a pessoa reconhece, não por como o sistema é construído** — ela gerencia *notificações*, não *configuração de webhook* | Vocabulário da persona |
| **Voz ativa**; o controle diz exatamente o que acontece ("Publicar" → e o retorno diz "Publicado") | Microcopy |
| Erro explica **o que houve e como resolver** — sem pedido de desculpa, sem vago ("algo deu errado") | Nielsen #9 |
| **Específico vence esperto.** Rótulo engraçadinho custa uma releitura a cada uso | Krug |

## 6 · Quando é UI, não documento (design de informação)

| Regra | Benchmark |
|---|---|
| Painel/ferramenta é **escaneado e operado**, não lido de cima a baixo: o ofício desloca da tipografia para o **design de informação** | Dashboards |
| **Resumo antes do detalhe** — o que exige ação aparece antes da tabela que a explica | Progressive disclosure |
| **Codifique estado na FORMA, não só no número:** pill, chip, faixa de severidade — o que precisa de atenção lê num relance, e não depende só de cor (a11y) | WCAG 1.4.1 · Preattentive |
| **O que é interativo parece interativo** — e o que não é, não finge ser | Affordance |
| Gráfico merece o mesmo cuidado do tipo: preenchimento de área, grid discreto, ponto final enfatizado, **e sempre uma leitura textual/numérica junto** | Dataviz |

## 7 · Higiene de implementação

| Regra | Benchmark |
|---|---|
| **Cuide da especificidade:** é fácil gerar classes que se cancelam (uma `.section` brigando com uma `.cta` por padding) e desfazer o próprio espaçamento em silêncio | Cascata CSS |
| Foco de teclado **sempre com estado visível**; `prefers-reduced-motion` respeitado em todo movimento | WCAG 2.4.7 |
| Marcação fechada e válida; o bug visual mora na distância entre a fonte e o que renderiza — **verifique rodando**, não só compilando | — |
| Gráfico decorativo/generativo em **Canvas/WebGL**, não em `path` SVG longo escrito à mão | Custo de manutenção |

## 8 · Anti-padrões da era da IA — a "cara de design gerado por IA"

> **Por que isto existe aqui:** num pipeline em que **100% da interface é autorada por IA**, o modo de
> falha default não é a tela carregada — é a tela **genérica**. "Premium = sóbrio" impede o excesso,
> mas **não** impede que a tela pudesse ser de qualquer outro produto. Este é o cluster que a geração
> por IA hoje produz por gravidade; onde o humano **não** fixou uma direção, não gaste a liberdade nele.

| O cluster (evite quando nada foi especificado) |
|---|
| Creme quente `#F4F1EA` + serifa de display + acento terracota |
| Quase-preto com **um** verde-ácido ou vermilion solitário de destaque |
| Filete de jornal + colunas densas como "editorial" genérico |
| Hero com gradiente roxo→azul sobre branco |
| Inter ou Space Grotesk como face "segura" default |
| Emoji como marcador de seção |
| Tudo centralizado |
| `rounded-lg` em absolutamente tudo |
| Card arredondado com barrinha/trilho de acento na lateral |

**A regra:** a palavra do humano **sempre vence** — pediu o gradiente roxo, entrega o gradiente roxo.
O cluster só é anti-padrão **onde nada foi especificado**. Aí a escolha se deriva do **domínio do
produto** (o vocabulário, os materiais e os instrumentos da persona), e se um token ou uma face é o
que sairia igual para qualquer produto, ela é trocada — com o porquê declarado no brief.

---

## Como usar
- **`ux-designer`:** antes de projetar, feche um **plano de sistema visual compacto** — 4–6 valores de
  cor **nomeados**, os **papéis tipográficos** (display · corpo · utilitária) e o conceito de layout em
  uma ou duas frases — e derive dele cada decisão da tela. Revise o plano contra §8: o que nele sairia
  igual para qualquer produto, troque e diga por quê. Reusar o token/componente que já existe **não** é
  genérico — é a lei nº 1; §8 governa o que se **cria**, não o que se **reusa**.
- **`frontend-engineer`:** execute o plano/brief pela camada de tokens (§1), com a higiene de §7. A
  tipografia de dado (§2 — `tabular-nums`, medida) e o estado codificado em forma (§6) são entrega,
  não polimento posterior.
- **`adversarial-reviewer`/`tech-auditor`:** §8 e a tabela de anti-padrões de UI do
  `docs/knowledge.md` são **checklist de caça** — "poderia ser de qualquer produto" é um achado
  legítimo, do mesmo peso que um estado de borda faltando.
