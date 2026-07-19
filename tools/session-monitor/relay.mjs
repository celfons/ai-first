// Relay: Anthropic Managed Agents session → WebSocket
// Segura a ANTHROPIC_API_KEY no backend e repassa os eventos da sessão ao browser.
// Uso no canvas:  ws://localhost:8787/?session=sesn_...
//
// Requer Node 18+ e a env ANTHROPIC_API_KEY (ver .env.example).
import "dotenv/config";
import { WebSocketServer } from "ws";
import Anthropic from "@anthropic-ai/sdk";

const PORT = Number(process.env.PORT || 8787);
const client = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

const wss = new WebSocketServer({ port: PORT });
console.log(`[relay] WebSocket em ws://localhost:${PORT}  (canvas → ?session=sesn_...)`);

wss.on("connection", async (browser, req) => {
  const url = new URL(req.url, "http://x");
  const sessionId = url.searchParams.get("session");
  const send = (ev) => browser.readyState === 1 && browser.send(JSON.stringify(ev));

  if (!sessionId || !sessionId.startsWith("sesn_")) {
    send({ type: "erro", _d: "faltou ?session=sesn_..." });
    browser.close();
    return;
  }

  console.log(`[relay] cliente conectado → sessão ${sessionId}`);
  const seen = new Set();
  let gatewayEmitted = false;

  // Reforça o diamante de fan-out no diagrama na 1ª delegação (evento sintético)
  const maybeGateway = (ev) => {
    if (!gatewayEmitted && ev.type === "agent.thread_message_sent") {
      gatewayEmitted = true;
      send({ type: "gateway" });
    }
  };

  try {
    // 1) Histórico primeiro — o SSE não tem replay. Dedup por id.
    for await (const ev of client.beta.sessions.events.list(sessionId)) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      maybeGateway(ev);
      send(ev);
    }

    // 2) Stream ao vivo — repassa o que ainda não vimos.
    const stream = await client.beta.sessions.events.stream(sessionId);
    for await (const ev of stream) {
      if (browser.readyState !== 1) break;
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      maybeGateway(ev);
      send(ev);

      // Termina em estado terminal (idle sem requires_action, ou terminated)
      if (ev.type === "session.status_terminated") break;
      if (ev.type === "session.status_idle" && ev.stop_reason?.type !== "requires_action") break;
    }
  } catch (err) {
    console.error(`[relay] erro na sessão ${sessionId}:`, err.message);
    send({ type: "erro", _d: String(err.message) });
  } finally {
    if (browser.readyState === 1) browser.close();
    console.log(`[relay] sessão ${sessionId} encerrada`);
  }
});
