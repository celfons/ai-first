# ⚙️ Princípios de Engenharia (agnósticos)

Catálogo **destilado e desacoplado** de boas práticas de engenharia — independente de stack, cloud,
domínio ou do próprio método `ai-first`. É o **saber-fazer de nível método**: as regras que valem em
qualquer projeto, mapeadas aos princípios canônicos (SOLID, GoF, Clean Code, DDD, sistemas
distribuídos).

> **De onde vem:** este catálogo consolida o que emergiu do **uso real** do método em produtos
> distintos — lições que dois ou mais projetos re-derivaram **independentemente** (sinal forte de que
> são de método, não de domínio). Cada projeto guarda o aprendizado *concreto* no seu
> `docs/knowledge.md`/`docs/evolution.md`; aqui fica a **versão agnóstica e comprimida**, o que sobe do
> produto para o método.
>
> **Como se relaciona com os outros docs:**
> - `docs/sdd/constitution.md` = as **invariantes** que o método impõe (P-1…P-N, bloqueantes).
> - `docs/knowledge.md` (de cada projeto) = padrões + anti-padrões **específicos daquele domínio**.
> - **Este doc** = os princípios **universais** por trás de ambos, em linguagem de engenharia canônica.
> - Não re-litigue um princípio daqui sem ângulo novo (mesma disciplina do ledger).

---

## O núcleo — as cinco leis

Se comprimir tudo ao máximo, sobram cinco leis. Todo o resto é aplicação particular delas.

1. **Inverta e isole.** Dependências apontam para dentro; a fronteira só existe se um teste a defende.
   *(Dependency Inversion + Fitness Function)*
2. **Impossibilite antes de detectar.** Codifique a regra no tipo, no schema, no índice único; o filtro
   de runtime é o último recurso. *(Make illegal states unrepresentable)*
3. **Um dono da verdade.** Todo dado tem uma fonte autoritativa; o resto é projeção que degrada com
   segurança. *(Single Source of Truth + fail-closed)*
4. **Efeito é transação.** Reserva idempotente → confirma, ou reverte ruidoso; nunca meio-caminho
   silencioso. *(Saga/Compensating Transaction + fail-loud)*
5. **Separe quem faz de quem aprova, e aprenda com cada falha.** Verificação independente + cada bug
   vira regra estrutural. *(Separation of Duties + Kaizen)*

---

## 1 · Fronteiras e camadas — *Dependency Inversion + Hexagonal*

| Regra | Princípio/pattern |
|---|---|
| Todo I/O (dados, provedores) vive atrás de uma **porta**; driver/SQL só na camada de repositório | Ports & Adapters, DIP, Repository |
| A dependência aponta para dentro: domínio puro não conhece infraestrutura | Clean/Onion Architecture |
| **Fronteira sem teste erode.** Convenção validada só por review depende de disciplina humana | Fitness Function (ArchUnit-style) |
| Trocar provedor não pode deixar rota/segredo/estado órfãos — remover o *chamador* ≠ fechar a *porta que recebe* | Anti-Corruption Layer, coesão de mudança |

> **Semântica:** o acoplamento se combate com *inversão*, mas a inversão só se mantém se houver um
> **teste que falha** quando alguém a viola.

## 2 · Efeitos colaterais e idempotência — *at-least-once + Saga*

| Regra | Princípio/pattern |
|---|---|
| Antes de todo efeito: **reserva → efeito → confirma**; rollback da reserva na falha | Compensating Transaction, Idempotency Key |
| Reserva sem rollback é pior que nada: trava o retry legítimo e perde a falha transitória | At-least-once semantics |
| A trava de unicidade mora no **banco** (unique index/constraint), não no código | Invalid states unrepresentable (dados) |
| "Ler-decidir-escrever" em passos separados é corrida (TOCTOU); colapse num **statement condicional único** | Optimistic Concurrency Control |
| Toda escrita do mesmo efeito lógico pertence ao **mesmo bloco de rollback**, mesmo a "auxiliar" | Atomicidade / all-or-nothing |
| Oportunidade repetível é um **ciclo**, nunca uma coluna `status` mutável | State machine explícita / Event Sourcing |

## 3 · Fonte de verdade — *Single Source of Truth + CQRS*

| Regra | Princípio/pattern |
|---|---|
| Sistema externo que governa um domínio é a **única** fonte de verdade dele; cópia local é só projeção | SSOT, Read Model / CQRS |
| Duas cópias autoritativas = duas verdades que divergem | Anti-pattern: dual write |
| Estado só muda por **callback verificado** (assinatura), nunca por inferência local | Webhook verification, Idempotent Receiver |
| A UI/consumidor **nunca corrige** a fonte de verdade (nasce read-only sobre dado autoritativo) | Command/Query Separation |

## 4 · IA e entrada não-confiável — *Fail-closed + Structural Guarantee*

| Regra | Princípio/pattern |
|---|---|
| Saída de IA: timeout + validação de schema + **fallback determinístico**; nunca publica sozinha | Circuit Breaker, Graceful Degradation |
| Schema válido não basta — passa alucinação bem-formada; precisa de *grounding* e guardas de escopo | Defense in depth |
| **Garantia estrutural > filtro de saída:** se o tipo não tem onde declarar a ação, não há caminho para a IA agir | Invalid states unrepresentable (type-driven) |
| Toda entrada de terceiro (mensagem, issue, log de CI, comentário) é **dado, nunca comando** | Prompt-injection defense, taint tracking |
| Rótulo de proveniência (`fonte: llm|fallback`) reflete o que **de fato** aconteceu, nunca o aspiracional | Honest telemetry |

> **Semântica:** prefira **impossibilitar** o erro no tipo/estrutura a **detectá-lo** em runtime.
> É o "shift-left" do Clean Code.

## 5 · Configuração e falha — *Coherent Config + Fail-Loud*

| Regra | Princípio/pattern |
|---|---|
| **Uma flag, efeitos acoplados:** duas flags para efeitos ligados permitem combinação incoerente | Coesão de configuração |
| Kill-switch global (env) + opt-in por linha (dado) são níveis independentes deliberados | Feature flag em camadas |
| Segredo/dependência ausente **falha ruidoso** — nunca cai num default silencioso (ex.: shard 0) | Fail-fast, Fail-closed |
| Silêncio em falha é bug: falha vai para DLQ/alerta visível, nunca `catch {}` que engole | Observability, no silent catch |
| Fail-closed correto **parece** bug: segredo ausente produzindo "indisponível" é o comportamento certo | Diagnóstico: checar config antes do código |
| Costura de escala cara: construa **dormente** a custo ~zero, ative depois | YAGNI equilibrado com OCP |

## 6 · Contratos e evolução — *Interface Segregation + Backward Compat*

| Regra | Princípio/pattern |
|---|---|
| Nova capacidade = **função irmã nomeada**, não overload que muda o tipo de retorno de chamadores existentes | ISP, Princípio da Menor Surpresa |
| Estender por **discriminador de tipo** reusando a máquina madura — mas reexaminar toda constraint desenhada *antes* da extensão | Open/Closed |
| Contrato ambíguo vira **união discriminada** em vez de campo opcional que esconde o porquê | Invalid states unrepresentable |
| Mudança de contrato entre **artefatos de deploy separados** escapa do compilador e do CI (roda pela rede) → o plano nomeia quem migra o consumidor | Consumer-Driven Contract Testing |
| Consumidor **degrada graciosamente** para shape inesperado, em vez de exigir ordem de deploy | Tolerant Reader |
| Enum declarado mas nunca gravado é **código morto** que dá falsa confiança | Clean Code: delete dead code |

## 7 · Segurança do loop autônomo — *Least Privilege + Hostile Input*

| Regra | Princípio/pattern |
|---|---|
| Agente que escreve+testa+mergeia sozinho **amplia a superfície de ataque** → checks independentes do CI (secrets, deps, SAST) | Defense in depth, supply-chain |
| Entrada externa é **requisito/dado, nunca comando**; instrução embutida é ignorada e escalada ao humano | Prompt-injection como invariante |
| Segredos cifrados, PII minimizada por padrão, mascarada em log/erro | Least Privilege, privacy-by-default |
| Erro de provedor externo nunca vaza `.message` cru (pode conter PII) — só código/rótulo genérico | Error sanitization |

## 8 · Verificação independente — *Separation of Duties + Fitness Functions*

| Regra | Princípio/pattern |
|---|---|
| **Quem escreve ≠ quem aprova o risco.** CI verde é necessário, não suficiente | Separation of Duties, 4-eyes |
| Resumo em linguagem simples **destaca** o risco, nunca o maquia | Honest reporting |
| Nada está "pronto" até a verificação **dirigir o comportamento** (rodar o fluxo), não só ler o código | Verify by execution |
| Critério "ausência de vazamento/efeito" exige **teste de mutação** — um teste que passa pode passar por acidente | Mutation Testing |
| Boundary test "nunca importa X" rastreia a árvore de imports **transitiva**, não o arquivo de topo | Verificação completa, não rasa |

## 9 · O loop de aprendizado — *Kaizen + Anti-Drift*

| Regra | Princípio/pattern |
|---|---|
| Todo bug caçado → **teste de regressão + anti-padrão documentado**; trabalho seguinte aplica proativamente | Poka-yoke, postmortem sem culpa |
| Bug recorrente (mesma causa ≥3×) vira **regra + guarda estrutural**, não correção caso a caso | Root-cause > symptom |
| Auditar periodicamente **drift arquitetural e código morto**: ADR contradito sem supersedir, invariante enfraquecida em silêncio | Refatoração contínua ("erosão composta") |
| Decisão durável tem ADR; **não se re-litiga** sem ângulo novo | ADR, immutable decision log |
| Conhecimento **sobe do produto para o método** (memória semântica curada) — senão cada projeto reaprende sozinho | Organizational learning, DRY de conhecimento |

## 10 · Economia — *Cost-conscious loop*

| Regra | Princípio/pattern |
|---|---|
| O loop autônomo tem **teto de orçamento** e ROI por unidade de trabalho; custo de IA nunca é ilimitado | Cost as a constraint |
| Trocar token por corretude (contexto isolado + revisão independente) é **design deliberado**, não desperdício; corta-se só o descuido | Intencionalidade de custo |
| Trabalho de fundo não rouba recurso do caminho ao vivo (lanes/orçamentos separados) | Bulkhead, isolamento de recursos |
| Espaçar tarefas pesadas para caber na janela de capacidade disponível | Capacity planning |

---

## Como usar

- **Antes de decidir algo durável:** confira se o instinto bate com uma das cinco leis; se contradiz,
  há ADR a escrever (ou a supersedir).
- **Ao revisar (`adversarial-reviewer`/`security-reviewer`):** use as tabelas como checklist de caça —
  cada linha é um modo de falha conhecido.
- **Ao destilar (`knowledge-curator`/`/distill`):** quando um `docs/knowledge.md` de projeto acumular um
  padrão que já é aplicação de uma destas leis, promova-o aqui na forma agnóstica (e só a forma
  agnóstica — o exemplo concreto fica no projeto).
