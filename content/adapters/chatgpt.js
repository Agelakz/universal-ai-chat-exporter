(() => {
  const E = window.AIChatExporter;

  const conversationId = () => location.pathname.match(/^\/c\/([0-9a-f-]+)/i)?.[1] || "";

  const capturedConversation = (id) => {
    const captured = window.AIChatExporterCapture?.chatgpt;
    return captured?.conversationId === id ? captured : null;
  };

  const waitForPageCapture = (id, timeout = 5000) => new Promise((resolve) => {
    const current = capturedConversation(id);
    if (current?.complete) return resolve(current);
    const finish = () => {
      window.removeEventListener("AI_CHAT_EXPORTER_CHATGPT_CAPTURE_UPDATED", updated);
      clearTimeout(timer);
      resolve(capturedConversation(id));
    };
    const updated = () => {
      if (capturedConversation(id)?.complete) finish();
    };
    const timer = setTimeout(finish, timeout);
    window.addEventListener("AI_CHAT_EXPORTER_CHATGPT_CAPTURE_UPDATED", updated);
  });

  const domConversation = () => {
    const turns = [...document.querySelectorAll('[data-testid^="conversation-turn-"]')];
    const messages = turns.map((turn, index) => {
      const explicit = turn.querySelector("[data-message-author-role]")?.getAttribute("data-message-author-role");
      const role = explicit || (turn.querySelector('[data-testid*="user"]') ? "user" : index % 2 ? "assistant" : "user");
      const content = turn.querySelector("[data-message-author-role]") || turn.querySelector(".markdown") || turn;
      return E.messageFromElement(content, role);
    });
    return {
      provider: "ChatGPT",
      title: document.querySelector("main h1")?.textContent || document.title.replace(/\s*[|–-]\s*ChatGPT.*$/i, "") || "ChatGPT Conversation",
      url: location.href,
      extractionMethod: "dom",
      messages: E.uniqueMessages(messages)
    };
  };

  const activeBranch = (conversation) => {
    if (Array.isArray(conversation?.messages)) return conversation.messages;
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

  const attachmentMetadata = (message) => {
    const metadata = message?.metadata || {};
    const items = [
      ...(Array.isArray(metadata.attachments) ? metadata.attachments : []),
      ...(Array.isArray(metadata.files) ? metadata.files : [])
    ];
    return items.map((file) => ({
      name: file?.name || file?.file_name || file?.filename,
      mimeType: file?.mime_type || file?.mimeType,
      size: file?.size
    })).filter((file) => file.name);
  };

  const webUrls = (value, result = []) => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) result.push(value);
    else if (Array.isArray(value)) value.forEach((item) => webUrls(item, result));
    else if (value && typeof value === "object") Object.values(value).forEach((item) => webUrls(item, result));
    return result;
  };

  const citationMetadata = (message) => {
    const references = message?.metadata?.content_references || [];
    return references.flatMap((reference) => {
      const url = webUrls([reference.safe_urls, reference.refs])[0];
      const title = reference.matched_text || reference.alt || reference.title || url;
      return title || url ? [{ title, url }] : [];
    });
  };

  const apiMessages = (conversation) => {
    const messages = [];
    const pendingArtifacts = [];
    for (const node of activeBranch(conversation)) {
      const message = node?.message || node;
      const contentType = message?.content?.content_type;
      if (message?.author?.role === "assistant" && ["code", "canvas", "artifact"].includes(contentType)) {
        const content = message.content?.text || message.content?.content || "";
        if (content) pendingArtifacts.push({
          title: message.metadata?.title || message.metadata?.reasoning_title || "Generated code",
          type: contentType,
          language: message.content?.language || "",
          content
        });
        continue;
      }

      const role = message?.author?.role;
      if (role !== "user" && role !== "assistant") continue;

      const parts = Array.isArray(message.content?.parts) ? message.content.parts.map(partText).filter(Boolean) : [];
      const text = parts.join("\n\n");
      if (!text && !pendingArtifacts.length) continue;
      messages.push({
        role,
        content: text,
        codeBlocks: E.codeBlocksFromText(text),
        citations: citationMetadata(message),
        attachments: attachmentMetadata(message),
        ...(role === "assistant" && pendingArtifacts.length ? { artifacts: pendingArtifacts.splice(0) } : {})
      });
    }
    return messages;
  };

  const conversationPage = async (id, numTurns, cursor = "") => {
    const url = new URL(`${location.origin}/backend-api/conversations/${id}`);
    url.searchParams.set("include_has_versions", "true");
    url.searchParams.set("num_turns", String(numTurns));
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`ChatGPT API returned ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page.messages)) throw new Error("Invalid ChatGPT conversation response");
    return page;
  };

  const fullConversation = async (id) => {
    // Match the provider's own request size, then follow its cursors. Very large
    // num_turns values are rejected by some live ChatGPT deployments.
    const conversation = await conversationPage(id, 10);

    const messages = [...conversation.messages];
    const messageIds = new Set(messages.map((message) => message?.id).filter(Boolean));
    const seenCursors = new Set();
    let pageInfo = conversation.page_info;

    for (let pageNumber = 0; pageInfo?.has_previous_page && pageNumber < 1000; pageNumber += 1) {
      const cursor = pageInfo.start_cursor;
      if (!cursor || seenCursors.has(cursor)) break;
      seenCursors.add(cursor);

      const previous = await conversationPage(id, 10, cursor);
      const unique = previous.messages.filter((message) => !message?.id || !messageIds.has(message.id));
      unique.forEach((message) => {
        if (message?.id) messageIds.add(message.id);
      });
      messages.unshift(...unique);
      pageInfo = previous.page_info;
    }

    return { ...conversation, messages };
  };

  E.registerAdapter({
    id: "chatgpt",
    name: "ChatGPT",
    matches: ({ hostname }) => hostname === "chatgpt.com" || hostname === "chat.openai.com",
    async extract() {
      const id = conversationId();
      if (!id) return domConversation();

      const captured = await waitForPageCapture(id);
      if (captured?.conversation?.messages?.length) {
        const messages = E.uniqueMessages(apiMessages(captured.conversation));
        if (messages.length) return {
          provider: "ChatGPT",
          title: captured.conversation.title || "ChatGPT Conversation",
          url: location.href,
          extractionMethod: captured.complete ? "structured" : "partial",
          messages
        };
      }

      try {
        const conversation = await fullConversation(id);
        const messages = E.uniqueMessages(apiMessages(conversation));
        if (!messages.length) throw new Error("Invalid ChatGPT conversation response");
        return {
          provider: "ChatGPT",
          title: conversation.title || "ChatGPT Conversation",
          url: location.href,
          extractionMethod: "structured",
          messages
        };
      } catch (_error) {
        return domConversation();
      }
    }
  });
})();
