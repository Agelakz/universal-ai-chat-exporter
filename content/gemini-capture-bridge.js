(() => {
  const Capture = window.AIChatExporterCapture = window.AIChatExporterCapture || {};

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.data?.type !== "AI_CHAT_EXPORTER_GEMINI_CONVERSATION") return;
    const payload = event.data.payload;
    if (!payload || payload.source !== "gemini-rpc" || !Array.isArray(payload.messages)) return;

    const messages = payload.messages
      .filter((message) => message?.role === "user" || message?.role === "assistant")
      .map((message) => ({ role: message.role, content: String(message.content || "").trim() }))
      .filter((message) => message.content);

    if (!messages.length) return;
    const conversationId = String(payload.conversationId || "");
    const previous = Capture.gemini;
    const sameConversation = previous && previous.conversationId === conversationId;
    if (sameConversation && previous.complete && !payload.complete) return;
    if (sameConversation && previous.messages.length > messages.length && !payload.complete) return;
    Capture.gemini = {
      conversationId,
      complete: Boolean(payload.complete),
      messages,
      capturedAt: Date.now()
    };
  });
})();
