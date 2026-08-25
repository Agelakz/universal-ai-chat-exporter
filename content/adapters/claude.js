(() => {
  const E = window.AIChatExporter;
  E.registerAdapter({
    id: "claude",
    name: "Claude",
    matches: ({ hostname }) => hostname === "claude.ai",
    extract() {
      const userNodes = [...document.querySelectorAll('[data-testid="user-message"], [data-testid*="user-message"], .font-user-message')];
      const assistantNodes = [...document.querySelectorAll('[data-testid="assistant-message"], [data-testid*="assistant-message"], .font-claude-message')];
      const tagged = [
        ...userNodes.map((node) => ({ node, role: "user" })),
        ...assistantNodes.map((node) => ({ node, role: "assistant" }))
      ].filter(({ node }) => E.visible(node));
      tagged.sort((a, b) => {
        const relation = a.node.compareDocumentPosition(b.node);
        return relation & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      const messages = tagged.map(({ node, role }) => ({ role, content: E.textFrom(node) }));
      return {
        provider: "Claude",
        title: document.querySelector("h1")?.textContent || document.title.replace(/\s*[|–-]\s*Claude.*$/i, "") || "Claude Conversation",
        url: location.href,
        messages: E.uniqueMessages(messages)
      };
    }
  });
})();
