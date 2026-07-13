# 🏛 Constituição do projeto

Princípios **não-negociáveis** que governam este projeto. Toda spec, plano e PR é validado
contra esta lista; **violar um princípio é bug arquitetural, mesmo com testes verdes**.
Alterar um princípio exige um **PR dedicado a este arquivo**, com justificativa e plano de
migração — nunca em silêncio no meio de outra feature.

Esta constituição tem **duas partes**:

- **Parte A — Princípios universais do método `ai-first`** (P-1…P-10): vêm com o framework
  e valem para qualquer projeto. Mude-os só com muita convicção.
- **Parte B — Princípios do seu projeto** (P-11+): você preenche com as invariantes do seu
  domínio/stack. Deixei exemplos reais (marcados como `exemplo`) para você adaptar ou apagar.

> **Hierarquia de autoridade em caso de conflito:**
> **constituição > especificação > plano > docs descritivos > código**.

Vários princípios pedem **enforcement automatizado** — um teste que falha quando alguém
viola. A coluna *Enforcement* aponta onde (ou "revisão" quando ainda é só de olho).

---

## Parte A — Princípios universais do método `ai-first`

### P-1 · Spec-first (nada de comportamento sem spec)

Toda mudança de **comportamento observável** começa por uma especificação verificável
(`docs/sdd/features/NNN-slug/spec.md`) e **termina** atualizando-a para refletir o que foi
entregue. O código é a implementação da spec, não o contrário. Bugfix trivial e refactor sem
mudança de comportamento dispensam spec (o `plan.md` da feature ou o próprio PR bastam).

- *Enforcement:* revisão no gate do PR; a spec da feature deve existir e bater com o diff.

### P-2 · A constituição é soberana

Nenhuma spec/plano/PR pode violar um princípio. Se uma feature **precisa** violar, a
**primeira** mudança é um PR nesta constituição (com justificativa e migração) — só então a
feature segue. Um diff que contradiz um princípio vivo é rejeitado, tenha ou não testes verdes.

### P-3 · Idempotência antes de todo efeito colateral

Entrega/execução é assumida **at-least-once**: retry, redelivery e reprocessamento vão
acontecer. Todo efeito colateral externo (cobrança, e-mail, criação de registro, chamada a
terceiro) é **reservado/deduplicado antes** de ser disparado, e a reserva sofre **rollback se
o efeito falhar** (senão o retry morre). Reexecutar a mesma unidade de trabalho é **no-op** —
nunca há efeito duplicado.

- *Enforcement:* teste de redelivery por efeito (reprocessar a mesma entrada não duplica).

### P-4 · A IA nunca é confiada cegamente

Toda chamada de LLM roda sob **timeout/abort**; a saída é **validada contra schema** antes de
usar; saída inválida ou falha/timeout cai num **fallback determinístico**. O usuário **sempre**
recebe uma resposta coerente, mesmo com todos os provedores de IA fora do ar.

> **Corolário — silêncio em falha é bug.** Falha de dependência externa, de entrega, ou
> trabalho que morre numa fila vira **feedback visível** (ao usuário e/ou métrica), nunca só
> um log perdido.

### P-5 · Fronteiras de camada são rígidas

As dependências apontam numa **única direção** (ex.: entrada → casos de uso → domínio →
infra); nenhuma camada importa "para cima". O **acesso a dados fica atrás de uma porta**
(repositório/DAO); detalhe de persistência não vaza para a lógica de negócio. Adicionar um
provedor externo = implementar a porta, sem tocar no núcleo.

- *Enforcement:* teste de boundary (ex.: proibir import do driver de banco fora da camada de dados).

### P-6 · Segurança fail-closed e segredos cifrados

O caminho seguro é o **default**: sem credencial/assinatura válida, **negue** (não "deixe
passar em dev"). Verificação de assinatura em tempo constante. **Segredos nunca em texto claro**
(nem em arquivo de config versionado, nem em log) — cifrados em repouso, injetados em runtime.

### P-7 · Dados sensíveis/PII minimizados por padrão

Dado pessoal é **mascarado na origem** nos logs, **redigido** antes de ir para memória/índice/
terceiros, e só trafega quando há necessidade legítima de processamento. Exceções são
**deliberadas e documentadas**, nunca acidentais. Opt-out do titular suprime toda a
comunicação proativa imediatamente.

### P-8 · Tudo observável, nada silencioso

Log estruturado com correlação (`requestId`/`traceId`); métricas de negócio e de saúde (uma
falha de métrica nunca quebra o request); trabalho que falha vai para uma fila de dead-letter
**contada e inspecionável**, nunca perdido; todo efeito colateral relevante é **auditado**.
Se dá para dar errado sem ninguém ver, está errado.

### P-9 · Configuração explícita, sem estado incoerente

Seleção de comportamento é por **composição via configuração explícita** — de preferência uma
**flag única que compõe efeitos correlatos** (impossível ligar metade e esquecer a outra) —
nunca um fallback silencioso que muda o comportamento em runtime sem rastro. Feature custosa/
arriscada nasce **opt-in** (desligada por default).

### P-10 · Qualidade é gate, e o gate humano é único

Branch de feature (`feature/<slug>` ou `claude/<slug>`); PR com `Closes #NNN`;
**`typecheck` + `lint` + `test` verdes** são obrigatórios para mergear. Toda mudança de
comportamento carrega teste; comportamento de IA carrega **eval**. A automação vai sozinha até
`develop` (auto-merge só com CI verde); **a única aprovação humana do fluxo é o PR de promoção
`develop → main`** — é ali que uma pessoa decide o que chega à produção.

- *Enforcement:* CI (`typecheck`/`lint`/`test`/`eval`) como *required check* em `develop` e `main`.

---

## Parte B — Princípios do seu projeto (preencha)

> Aqui moram as invariantes do **seu** domínio e stack. Numere a partir de `P-11`, no mesmo
> formato (princípio + onde é enforced). Os itens abaixo são **exemplos reais** de um projeto
> que adotou o framework (uma plataforma multi-tenant serverless) — **adapte ou apague**.

### P-11 · _(exemplo)_ Multi-tenancy absoluto

Todo dado pertence a um tenant. **`tenant_id` em toda tabela e em toda query**, sem exceção;
PKs compostas nos agregados; isolamento por tenant em qualquer índice/namespace. *Enforcement:*
teste de repositório + revisão (SQL sem filtro de tenant é rejeitado).

### P-12 · _(exemplo)_ Parceiro externo é a fonte de verdade do domínio que ele gere

Pagamento = gateway; agenda = provedor de calendário; etc. O sistema **orquestra**, nunca mantém
cópia autoritativa: tabelas locais são projeção/correlação. `status` só muda por **callback
verificado** do provedor; nenhuma decisão pode contradizê-lo com estado local.

### P-13 · _(exemplo)_ Custo de IA nunca é ilimitado

Quota por unidade de cobrança (tenant/dia/modelo) com degradação em escada até um `STOP`
canned. Contabilidade por preço versionado. Tráfego proativo passa pela mesma escada.

<!-- Adicione P-14, P-15… conforme as invariantes do seu domínio. -->
