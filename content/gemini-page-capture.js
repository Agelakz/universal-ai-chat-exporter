(() => {
  const RPC_ID = "hNvQHb";
  const MESSAGE_TYPE = "AI_CHAT_EXPORTER_GEMINI_CONVERSATION";

  const clean = (value) => typeof value === "string" ? value.trim() : "";

  const decodeEnvelope = (body) => {
    for (const line of body.split("\n")) {
      if (!line.startsWith("[[")) continue;
      let rows;
      try {
        rows = JSON.parse(line);
      } catch (_error) {
        continue;
      }

      for (const row of rows) {
        if (row?.[0] !== "wrb.fr" || row?.[1] !== RPC_ID || typeof row[2] !== "string") continue;
        try {
          return JSON.parse(row[2]);
        } catch (_error) {
          return null;
        }
      }
    }
    return null;
  };

  const conversationFromRpc = (rpc, conversationId) => {
    const turns = rpc?.[0];
    if (!Array.isArray(turns)) return null;

    const messages = [];
    for (const turn of turns) {
      const userText = clean(turn?.[2]?.[0]?.[0]);
      const assistantText = clean(turn?.[3]?.[0]?.[0]?.[1]?.[0]);
      if (userText) messages.push({ role: "user", content: userText });
      if (assistantText) messages.push({ role: "assistant", content: assistantText });
    }
    if (!messages.length) return null;

    return {
      source: "gemini-rpc",
      conversationId,
      messages
    };
  };

  const publish = (body, requestUrl) => {
    if (typeof body !== "string" || !body.includes(RPC_ID)) return;
    let conversationId = "";
    try {
      conversationId = new URL(requestUrl, location.origin).searchParams.get("source-path")?.match(/^\/app\/([^/?#]+)/)?.[1] || "";
    } catch (_error) {
      // The path check in the isolated adapter still prevents stale captures.
    }
    const conversation = conversationFromRpc(decodeEnvelope(body), conversationId);
    if (conversation) window.postMessage({ type: MESSAGE_TYPE, payload: conversation }, location.origin);
  };

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = String(response.url || args[0]?.url || args[0] || "");
      if (url.includes("/_/BardChatUi/data/batchexecute") && url.includes(`rpcids=${RPC_ID}`)) {
        response.clone().text().then((body) => publish(body, url)).catch(() => {});
      }
    } catch (_error) {
      // Never interfere with Gemini's own request lifecycle.
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__aiChatExporterUrl = String(url || "");
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__aiChatExporterUrl?.includes("/_/BardChatUi/data/batchexecute") &&
        this.__aiChatExporterUrl.includes(`rpcids=${RPC_ID}`)) {
      this.addEventListener("load", () => publish(this.responseText, this.__aiChatExporterUrl), { once: true });
    }
    return originalSend.apply(this, args);
  };
})();
