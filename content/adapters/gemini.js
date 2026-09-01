(() => {
  const E = window.AIChatExporter;

  const capturedConversation = (id) => {
    const captured = window.AIChatExporterCapture?.gemini;
    return captured?.messages?.length && (!captured.conversationId || captured.conversationId === id) ? captured : null;
  };

  const waitForCapture = (id, timeout = 5000) => new Promise((resolve) => {
    const current = capturedConversation(id);
    if (current?.complete) return resolve(current);
    const finish = () => {
      window.removeEventListener("AI_CHAT_EXPORTER_GEMINI_CAPTURE_UPDATED", updated);
      clearTimeout(timer);
      resolve(capturedConversation(id));
    };
    const updated = () => {
      if (capturedConversation(id)?.complete) finish();
    };
    const timer = setTimeout(finish, timeout);
    window.addEventListener("AI_CHAT_EXPORTER_GEMINI_CAPTURE_UPDATED", updated);
  });

  E.registerAdapter({
    id: "gemini",
    name: "Gemini",
    matches: ({ hostname }) => hostname === "gemini.google.com",
    async extract() {
      const pathId = location.pathname.match(/^\/app\/([^/?#]+)/)?.[1] || "";
      const captured = await waitForCapture(pathId);
      if (captured) {
        return {
          provider: "Gemini",
          title: document.querySelector("h1")?.textContent || document.title.replace(/\s*[|–-]\s*Gemini.*$/i, "") || "Gemini Conversation",
          url: location.href,
          extractionMethod: captured.complete ? "structured" : "partial",
          messages: E.uniqueMessages(captured.messages.map((message) => ({
            ...message,
            codeBlocks: E.codeBlocksFromText(message.content)
          })))
        };
      }

      const selectors = "user-query, model-response, [data-test-id='user-query'], [data-test-id='model-response']";
      const nodes = [...document.querySelectorAll(selectors)].filter(E.visible);
      const messages = nodes.map((node) => {
        const tag = node.tagName.toLowerCase();
        const marker = `${tag} ${node.getAttribute("data-test-id") || ""}`;
        const role = marker.includes("user") ? "user" : "assistant";
        const content = node.querySelector(".query-text, .response-content, message-content, .markdown") || node;
        return E.messageFromElement(content, role);
      });
      return {
        provider: "Gemini",
        title: document.querySelector("h1")?.textContent || document.title.replace(/\s*[|–-]\s*Gemini.*$/i, "") || "Gemini Conversation",
        url: location.href,
        extractionMethod: "dom",
        messages: E.uniqueMessages(messages)
      };
    }
  });
})();
