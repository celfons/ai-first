---
name: code-write
description: Delega a ESCRITA de código repetitivo ao worker barato `code-writer` (haiku), que escreve o arquivo DIRETO NO DISCO imitando um arquivo de referência — o modelo caro nunca lê o que foi gerado, só roda o teste. Use para o 21º teste igual aos 20 vizinhos, o DTO/handler/adapter que copia a forma de um irmão, fixtures e mapeamentos mecânicos. Invoque como `/code-write <destino> --ref <arquivo-de-referência> -- <spec curta>`. A referência é OBRIGATÓRIA. Nunca para código de julgamento (invariante, segurança, dinheiro/PII, concorrência, design) — isso é do implementador pelo laço TDD.
---

# /code-write — o código que copia um padrão é escrito pelo modelo barato, direto no disco

A segunda rota do ADR-0022 (`docs/token-efficiency.md` §9). Diferente do `/bulk-read`, aqui **não há
gate**: nenhum hook obriga a delegar a escrita — a skill é chamada por quem implementa quando reconhece
que o que vai digitar é **replicação**, não decisão. É advisory por desenho.

## Entrada

`/code-write <caminho-destino> --ref <caminho-referência> -- <spec curta>`

- **`--ref` é obrigatório**, não opcional. Sem irmão a imitar, o worker inventaria estilo e estrutura —
  e é exatamente o que não pode acontecer. Sem `--ref` ⇒ PARE e peça a referência.
- **Spec curta e fechada:** nomes, casos, campos. Ambiguidade que muda comportamento não é "o worker
  escolhe" — é `needs-clarification` de volta a você.
- Um arquivo por invocação. Geração grande é **dividida por você** (N chamadas, cada uma com a sua
  referência), não engordada numa só.

## Quando usar / quando NÃO usar

| Cabe | Não cabe (fica no implementador, pelo laço TDD — ADR-0015) |
|---|---|
| teste que repete a forma dos vizinhos (mesmo arranjo, outro caso) | teste que **define** um comportamento novo (a prova do vermelho é do implementador) |
| DTO/tipo/handler/adapter que copia um irmão | qualquer coisa que toque invariante, segurança, dinheiro/PII, idempotência, concorrência |
| fixture, mapeamento, tabela de dados, scaffolding de arquivo-por-unidade | decisão de design, porta nova, ponto de extensão novo |

## O que a skill faz

1. Invoca **um** `Agent` com `subagent_type: "code-writer"`, `model: "haiku"`, esforço baixo: destino +
   referência + spec, verbatim.
2. Recebe **só** `status · escreveu · linhas · referência` — **nenhum código no retorno**. Se vier código,
   o worker errou o contrato; descarte o retorno e não o cole no contexto.
3. **Não lê o arquivo gerado. Roda o teste** (o escopo do laço interno: o relacionado, ADR-0017). Verde
   ⇒ segue; vermelho ⇒ corrige pelo caminho normal (você, no laço TDD) — não itere com o worker "até
   passar", isso é o loop sem freio do ADR-0009.
4. `bloqueado`/`needs-clarification` ⇒ é achado: ou a spec estava aberta, ou aquilo era julgamento
   disfarçado de mecânica. Nos dois casos, volta a ser trabalho seu.

## O que NÃO muda

Gates intactos: CI + `tester` + `adversarial-reviewer` + `security-reviewer` julgam o diff **agregado**
como sempre — código do worker é código como qualquer outro. O worker só tira do modelo caro a
**digitação**, nunca a **responsabilidade**.
