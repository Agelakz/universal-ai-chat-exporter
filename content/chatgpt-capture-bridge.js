(() => {
  const Capture = window.AIChatExporterCapture = window.AIChatExporterCapture || {};

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.data?.type !== "AI_CHAT_EXPORTER_CHATGPT_CONVERSATION") return;
    const payload = event.data.payload;
    if (payload?.source !== "chatgpt-page" || !Array.isArray(payload.conversation?.messages)) return;
    const conversationId = String(payload.conversationId || "");
    const previous = Capture.chatgpt;
    const sameConversation = previous && previous.conversationId === conversationId;
    if (sameConversation && previous.complete && !payload.complete) return;
    if (sameConversation && previous.conversation.messages.length > payload.conversation.messages.length) return;
    Capture.chatgpt = {
      conversationId,
      complete: Boolean(payload.complete),
      conversation: payload.conversation,
      capturedAt: Date.now()
    };
    window.dispatchEvent(new CustomEvent("AI_CHAT_EXPORTER_CHATGPT_CAPTURE_UPDATED"));
  });
})();
