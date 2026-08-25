(() => {
  const E = window.AIChatExporter;
  E.registerAdapter({
    id: "chatgpt",
    name: "ChatGPT",
    matches: ({ hostname }) => hostname === "chatgpt.com" || hostname === "chat.openai.com",
    extract() {
      const turns = [...document.querySelectorAll('[data-testid^="conversation-turn-"]')];
      const messages = turns.map((turn, index) => {
        const explicit = turn.querySelector("[data-message-author-role]")?.getAttribute("data-message-author-role");
        const role = explicit || (turn.querySelector('[data-testid*="user"]') ? "user" : index % 2 ? "assistant" : "user");
        const content = turn.querySelector("[data-message-author-role]") || turn.querySelector(".markdown") || turn;
        return { role, content: E.textFrom(content) };
      });
      return {
        provider: "ChatGPT",
        title: document.querySelector("main h1")?.textContent || document.title.replace(/\s*[|–-]\s*ChatGPT.*$/i, "") || "ChatGPT Conversation",
        url: location.href,
        messages: E.uniqueMessages(messages)
      };
    }
  });
})();
