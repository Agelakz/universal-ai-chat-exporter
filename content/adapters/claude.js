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

  const attachmentMetadata = (message) => {
    const items = [...(message.attachments || []), ...(message.files || [])];
    return items.map((file) => ({
      name: file.file_name || file.fileName || file.name,
      mimeType: file.mime_type || file.mimeType,
      size: file.size
    })).filter((file) => file.name);
  };

  const blockCitations = (blocks) => blocks.flatMap((block) => (block?.citations || []).flatMap((citation) => {
    const url = citation.url || citation.source?.url;
    const title = citation.title || citation.source?.title || citation.cited_text || url;
    return title || url ? [{ title, url }] : [];
  }));

  const blockArtifacts = (blocks) => blocks.flatMap((block) => {
    if (!block || !["artifact", "code", "tool_result"].includes(block.type)) return [];
    const content = typeof block.content === "string" ? block.content : typeof block.text === "string" ? block.text : "";
    return content ? [{
      title: block.title || block.name || "Artifact",
      type: block.type,
      language: block.language || "",
      content
    }] : [];
  });

  const apiMessages = (conversation) => activeBranch(conversation).map((message) => {
    const blocks = Array.isArray(message.content) ? message.content.map(blockText).filter(Boolean) : [];
    const text = blocks.join("\n\n") || message.text || "";
    const rawBlocks = Array.isArray(message.content) ? message.content : [];
    return {
      role: message.sender === "human" ? "user" : "assistant",
      content: text,
      codeBlocks: E.codeBlocksFromText(text),
      citations: blockCitations(rawBlocks),
      attachments: attachmentMetadata(message),
      artifacts: blockArtifacts(rawBlocks)
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
      extractionMethod: "dom",
      messages: E.uniqueMessages(tagged.map(({ node, role }) => E.messageFromElement(node, role)))
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
          extractionMethod: "structured",
          messages: E.uniqueMessages(apiMessages(conversation))
        };
      } catch (_error) {
        return domConversation();
      }
    }
  });
})();
