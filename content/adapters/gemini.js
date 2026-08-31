(() => {
  const E = window.AIChatExporter;
  E.registerAdapter({
    id: "gemini",
    name: "Gemini",
    matches: ({ hostname }) => hostname === "gemini.google.com",
    extract() {
      const captured = window.AIChatExporterCapture?.gemini;
      const pathId = location.pathname.match(/^\/app\/([^/?#]+)/)?.[1] || "";
      if (captured?.messages?.length && (!captured.conversationId || captured.conversationId === pathId)) {
        return {
          provider: "Gemini",
          title: document.querySelector("h1")?.textContent || document.title.replace(/\s*[|–-]\s*Gemini.*$/i, "") || "Gemini Conversation",
          url: location.href,
          messages: E.uniqueMessages(captured.messages)
        };
      }

      const selectors = "user-query, model-response, [data-test-id='user-query'], [data-test-id='model-response']";
      const nodes = [...document.querySelectorAll(selectors)].filter(E.visible);
      const messages = nodes.map((node) => {
        const tag = node.tagName.toLowerCase();
        const marker = `${tag} ${node.getAttribute("data-test-id") || ""}`;
        const role = marker.includes("user") ? "user" : "assistant";
        const content = node.querySelector(".query-text, .response-content, message-content, .markdown") || node;
        return { role, content: E.textFrom(content) };
      });
      return {
        provider: "Gemini",
        title: document.querySelector("h1")?.textContent || document.title.replace(/\s*[|–-]\s*Gemini.*$/i, "") || "Gemini Conversation",
        url: location.href,
        messages: E.uniqueMessages(messages)
      };
    }
  });
})();
