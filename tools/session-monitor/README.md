# session-monitor — relay de sessões Managed Agents → canvas BPMN

Acompanha, em tempo real, uma **sessão dos Managed Agents da Anthropic** (`sesn_…`) e repassa os
eventos ao canvas BPMN por WebSocket. A **chave da API fica só aqui no backend** — o browser conhece
apenas a URL do WebSocket.

```
Anthropic API ──SSE──►  relay.mjs (segura ANTHROPIC_API_KEY)  ──WS──►  canvas BPMN (browser)
   sessions.events.stream                                        ?session=sesn_...
```

## 1. Pegar a chave

`console.anthropic.com` → **Settings → API Keys → Create Key**. Copie na hora (só aparece uma vez).

## 2. Configurar

```bash
cd tools/session-monitor
cp .env.example .env        # e cole sua ANTHROPIC_API_KEY
npm install
```

> Alternativa sem chave estática: rode `ant auth login` (CLI da Anthropic) e deixe `ANTHROPIC_API_KEY`
> sem setar — o SDK lê o profile de `~/.config/anthropic/` sozinho.

## 3. Rodar

```bash
npm start
# [relay] WebSocket em ws://localhost:8787
```

## 4. Conectar o canvas

No canvas BPMN ao vivo (`bpmn-live`), cole no campo de WebSocket e clique **Conectar**:

```
ws://localhost:8787/?session=sesn_ABC123...
```

O relay busca o histórico da sessão (`events.list`), depois faz *tail* do stream ao vivo
(`events.stream`), deduplicando por `id`. Encerra quando a sessão vai a `terminated` ou a `idle`
sem `requires_action`.

## Eventos repassados

Os mesmos `type` da API — o canvas já os entende:
`session.thread_created`, `agent.thread_message_sent`, `agent.thread_message_received`,
`session.thread_status_running/_idle`, `agent.tool_use`, `session.status_idle`.
O relay injeta um `gateway` sintético na 1ª delegação só para desenhar o diamante de fan-out.

## Segurança

- `.env` está no `.gitignore` — **nunca** comite a chave.
- Em produção use o secrets manager da plataforma (Fly/Railway/Render/AWS), não a imagem Docker.
- O relay é um cliente autenticado da Anthropic; não expõe endpoint público sem auth — coloque atrás
  de sua própria camada de autenticação antes de expor a internet.

## Nota de encaixe

Isto monitora **sessões hospedadas pela Anthropic**. O ciclo SDD do `ai-first` roda em **subagentes do
Claude Code** dirigidos pelas skills (não gera sessões `sesn_…`) — para acompanhar aquele pipeline, a
fonte é a atividade do GitHub (ver o canvas `aifirst-sdd-live` + relay de webhooks, Caso A).
