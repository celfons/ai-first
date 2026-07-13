# Cenários de aceitação (BDD) — EXEMPLO · gerado pelo `bdd-author`
# Formato Gherkin (bdd_style: gherkin). Cada Scenario rastreia um RF da spec (§4).
# Com bdd_style: native, os mesmos cenários viram testes que espelham Dado/Quando/Então
# no framework de teste do projeto.

Feature: Nota de boas-vindas no primeiro contato
  Para reduzir o abandono no primeiro contato
  Como usuário de primeiro contato
  Quero um acolhimento claro antes do fluxo padrão

  Background:
    Dado que a nota de boas-vindas está habilitada

  @RF-WELCOME-01
  Scenario: Primeiro contato recebe a nota antes do fluxo padrão
    Dado um contato sem histórico
    Quando ele envia "oi"
    Então o sistema envia a nota de boas-vindas
    E só depois processa a mensagem no fluxo padrão

  @RF-WELCOME-02 @edge
  Scenario: A nota é enviada no máximo uma vez por contato
    Dado um contato que já recebeu a nota de boas-vindas
    Quando ele envia outra mensagem
    Então o sistema não reenvia a nota

  @RF-WELCOME-02 @edge
  Scenario: Redelivery da primeira mensagem não duplica a nota
    Dado um contato sem histórico que acabou de receber a nota
    Quando a primeira mensagem é reentregue (retry)
    Então o sistema não envia a nota novamente

  @RF-WELCOME-03
  Scenario Outline: A nota é localizada no idioma do contato
    Dado um contato sem histórico com idioma "<idioma>"
    Quando ele envia a primeira mensagem
    Então a nota de boas-vindas é enviada em "<idioma_esperado>"

    Examples:
      | idioma | idioma_esperado |
      | pt     | pt              |
      | en     | en              |
      | xx     | padrão          |

  @edge
  Scenario: Contato com opt-out não recebe a nota
    Dado um contato sem histórico que optou por não receber comunicação proativa
    Quando ele envia a primeira mensagem
    Então o sistema não envia a nota de boas-vindas
    E processa a mensagem normalmente

  @edge
  Scenario: Falha no envio da nota não bloqueia o atendimento
    Dado um contato sem histórico
    E que o envio da nota vai falhar
    Quando ele envia a primeira mensagem
    Então o sistema registra a falha
    E ainda assim processa a mensagem do usuário

# Matriz de cobertura (RF → cenários)
# RF-WELCOME-01 → "recebe a nota antes do fluxo"
# RF-WELCOME-02 → "no máximo uma vez" + "redelivery não duplica"
# RF-WELCOME-03 → "localizada no idioma" (pt/en/padrão)
# Bordas (spec §5) → opt-out; falha de envio degrada
