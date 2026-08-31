(() => {
  const E = window.AIChatExporter;

  const conversationId = () => location.pathname.match(/^\/c\/([0-9a-f-]+)/i)?.[1] || "";

  const domConversation = () => {
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
  };

  const activeBranch = (conversation) => {
    const mapping = conversation?.mapping;
    if (!mapping || typeof mapping !== "object") return [];

    const branch = [];
    const visited = new Set();
    let node = mapping[conversation.current_node];
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      branch.push(node);
      node = node.parent ? mapping[node.parent] : null;
    }
    return branch.reverse();
  };

  const partText = (part) => {
    if (typeof part === "string") return part;
    if (!part || typeof part !== "object") return "";
    if (typeof part.text === "string") return part.text;
    if (typeof part.content === "string") return part.content;
    return "";
  };

  const attachmentLabels = (message) => {
    const metadata = message?.metadata || {};
    const items = [
      ...(Array.isArray(metadata.attachments) ? metadata.attachments : []),
      ...(Array.isArray(metadata.files) ? metadata.files : [])
    ];
    return items.map((file) => file?.name || file?.file_name || file?.filename)
      .filter(Boolean)
      .map((name) => `[File: ${name}]`);
  };

  const apiMessages = (conversation) => activeBranch(conversation).flatMap((node) => {
    const message = node?.message;
    const role = message?.author?.role;
    if (role !== "user" && role !== "assistant") return [];

    const parts = Array.isArray(message.content?.parts) ? message.content.parts.map(partText).filter(Boolean) : [];
    const text = parts.join("\n\n") || partText(message.content);
    const content = [...attachmentLabels(message), text].filter(Boolean).join("\n\n");
    return content ? [{ role, content }] : [];
  });

  E.registerAdapter({
    id: "chatgpt",
    name: "ChatGPT",
    matches: ({ hostname }) => hostname === "chatgpt.com" || hostname === "chat.openai.com",
    async extract() {
      const id = conversationId();
      if (!id) return domConversation();

      try {
        const response = await fetch(`${location.origin}/backend-api/conversation/${id}`, { credentials: "include" });
        if (!response.ok) throw new Error(`ChatGPT API returned ${response.status}`);
        const conversation = await response.json();
        const messages = E.uniqueMessages(apiMessages(conversation));
        if (!messages.length) throw new Error("Invalid ChatGPT conversation response");
        return {
          provider: "ChatGPT",
          title: conversation.title || "ChatGPT Conversation",
          url: location.href,
          messages
        };
      } catch (_error) {
        return domConversation();
      }
    }
  });
})();
