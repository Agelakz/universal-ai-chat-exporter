(() => {
  const E = window.AIChatExporter;

  const conversationId = () => location.pathname.match(/^\/chat\/([0-9a-f-]+)/i)?.[1] || "";

  const conversationApiUrl = (id) => {
    const pathSuffix = `/chat_conversations/${id}`;
    const entries = performance.getEntriesByType("resource");
    const entry = entries.find(({ name }) => {
      try {
        const url = new URL(name);
        return url.origin === location.origin && url.pathname.endsWith(pathSuffix);
      } catch (_error) {
        return false;
      }
    });
    if (entry) {
      const url = new URL(entry.name);
      url.search = "";
      url.hash = "";
      return url.href;
    }

    for (const resource of entries) {
      try {
        const url = new URL(resource.name);
        const organizationId = url.pathname.match(/^\/api\/organizations\/([0-9a-f-]+)/i)?.[1];
        if (url.origin === location.origin && organizationId) {
          return `${location.origin}/api/organizations/${organizationId}/chat_conversations/${id}`;
        }
      } catch (_error) {
        // Ignore malformed performance entries.
      }
    }
    return "";
  };

  const activeBranch = (conversation) => {
    const messages = Array.isArray(conversation.chat_messages) ? conversation.chat_messages : [];
    const byId = new Map(messages.map((message) => [message.uuid, message]));
    const branch = [];
    const visited = new Set();
    let current = byId.get(conversation.current_leaf_message_uuid);

    while (current && !visited.has(current.uuid)) {
      visited.add(current.uuid);
      branch.push(current);
      current = byId.get(current.parent_message_uuid);
    }

    return branch.length ? branch.reverse() : messages.sort((a, b) => (a.index || 0) - (b.index || 0));
  };

  const blockText = (block) => {
    if (!block || typeof block !== "object") return "";
    if (typeof block.text === "string") return block.text;
    if (typeof block.content === "string") return block.content;
    if (block.type === "tool_use" && block.name) return `[Tool: ${block.name}]`;
    return "";
  };

  const fileLabels = (message) => {
    const items = [...(message.attachments || []), ...(message.files || [])];
    return items.map((file) => file.file_name || file.fileName || file.name)
      .filter(Boolean)
      .map((name) => `[File: ${name}]`);
  };

  const apiMessages = (conversation) => activeBranch(conversation).map((message) => {
    const blocks = Array.isArray(message.content) ? message.content.map(blockText).filter(Boolean) : [];
    const text = blocks.join("\n\n") || message.text || "";
    return {
      role: message.sender === "human" ? "user" : "assistant",
      content: [...fileLabels(message), text].filter(Boolean).join("\n\n")
    };
  });

  const domConversation = () => {
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
    return {
      provider: "Claude",
      title: document.querySelector("h1")?.textContent || document.title.replace(/\s*[|–-]\s*Claude.*$/i, "") || "Claude Conversation",
      url: location.href,
      messages: E.uniqueMessages(tagged.map(({ node, role }) => ({ role, content: E.textFrom(node) })))
    };
  };

  E.registerAdapter({
    id: "claude",
    name: "Claude",
    matches: ({ hostname }) => hostname === "claude.ai",
    async extract() {
      const id = conversationId();
      const apiUrl = id && conversationApiUrl(id);
      if (!apiUrl) return domConversation();

      try {
        const response = await fetch(apiUrl, { credentials: "include" });
        if (!response.ok) throw new Error(`Claude API returned ${response.status}`);
        const conversation = await response.json();
        if (!Array.isArray(conversation.chat_messages)) throw new Error("Invalid Claude conversation response");
        return {
          provider: "Claude",
          title: conversation.name || "Claude Conversation",
          url: location.href,
          messages: E.uniqueMessages(apiMessages(conversation))
        };
      } catch (_error) {
        return domConversation();
      }
    }
  });
})();
