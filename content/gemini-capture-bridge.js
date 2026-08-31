(() => {
  const Capture = window.AIChatExporterCapture = window.AIChatExporterCapture || {};

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin ||
        event.data?.type !== "AI_CHAT_EXPORTER_GEMINI_CONVERSATION") return;
    const payload = event.data.payload;
    if (!payload || payload.source !== "gemini-rpc" || !Array.isArray(payload.messages)) return;

    const messages = payload.messages
      .filter((message) => message?.role === "user" || message?.role === "assistant")
      .map((message) => ({ role: message.role, content: String(message.content || "").trim() }))
      .filter((message) => message.content);

    if (!messages.length) return;
    Capture.gemini = {
      conversationId: String(payload.conversationId || ""),
      messages,
      capturedAt: Date.now()
    };
  });
})();
