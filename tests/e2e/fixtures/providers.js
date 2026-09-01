const LONG_MESSAGE_COUNT = 120;

const alternatingMessages = () => Array.from({ length: LONG_MESSAGE_COUNT }, (_value, index) => ({
  id: `message-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  content: `Synthetic long conversation message ${index + 1}`
}));

const chatgptConversation = (cursor = "") => {
  const all = alternatingMessages();
  const end = cursor ? Number(cursor) : all.length;
  const start = Math.max(0, end - 10);
  return {
    title: "ChatGPT long fixture",
    conversation_id: "11111111-1111-1111-1111-111111111111",
    messages: all.slice(start, end).map((message, offset) => {
      const index = start + offset;
      return {
        id: message.id,
        author: { role: message.role },
        content: { content_type: "text", parts: [index === 119 ? `${message.content}\n\n\`\`\`js\nconst fixture = true;\n\`\`\`` : message.content] },
        metadata: index === 119 ? {
          content_references: [{ matched_text: "Fixture source", safe_urls: ["https://example.com/source"], refs: [] }],
          attachments: [{ name: "fixture.pdf", mime_type: "application/pdf", size: 1024 }]
        } : {}
      };
    }),
    current_node: "message-119",
    page_info: { start_cursor: String(start), end_cursor: String(end), has_previous_page: start > 0, has_next_page: end < all.length }
  };
};

const geminiRpcBody = (full = true) => {
  const source = full ? alternatingMessages() : alternatingMessages().slice(-10);
  const turns = source.reduce((result, message, index) => {
    if (message.role !== "user") return result;
    const assistant = source[index + 1];
    const turn = [];
    turn[0] = [`internal-${index}`, `internal-${index}`];
    turn[2] = [[message.content]];
    turn[3] = [[["candidate", [assistant?.content || "Synthetic final response"]]]];
    result.push(turn);
    return result;
  }, []);
  const row = [["wrb.fr", "hNvQHb", JSON.stringify([turns, null, null, null])]];
  return `)]}'\n\n${JSON.stringify(row).length}\n${JSON.stringify(row)}`;
};

const geminiRequestBody = (limit = 10) => {
  const envelope = [[["hNvQHb", JSON.stringify(["fixture-gemini", limit, null, 1, [0], [4], null, 1]), null, "generic"]]];
  return new URLSearchParams({ "f.req": JSON.stringify(envelope), at: "fixture" }).toString();
};

const claudeConversation = () => {
  const messages = alternatingMessages();
  return {
    name: "Claude long fixture",
    current_leaf_message_uuid: messages.at(-1).id,
    chat_messages: messages.map((message, index) => ({
      uuid: message.id,
      parent_message_uuid: index ? messages[index - 1].id : null,
      sender: message.role === "user" ? "human" : "assistant",
      index,
      content: [{
        type: "text",
        text: index === 119 ? `${message.content}\n\n\`\`\`js\nconst fixture = true;\n\`\`\`` : message.content,
        citations: index === 119 ? [{ title: "Fixture source", url: "https://example.com/source" }] : []
      }],
      attachments: index === 118 ? [{ file_name: "fixture.pdf", mime_type: "application/pdf", size: 1024 }] : []
    }))
  };
};

const domConversationHtml = (provider) => {
  const messages = alternatingMessages();
  if (provider === "chatgpt") return `<!doctype html><title>Fixture | ChatGPT</title><main><h1>ChatGPT DOM fixture</h1>${messages.map((message, index) => `<article data-testid="conversation-turn-${index}"><div data-message-author-role="${message.role}">${message.content}${index === 119 ? '<pre><code class="language-js">const fixture = true;</code></pre><a href="https://example.com/source">Fixture source</a><div data-testid="attachment">fixture.pdf</div>' : ""}</div></article>`).join("")}</main>`;
  if (provider === "gemini") return `<!doctype html><title>Fixture | Gemini</title><h1>Gemini DOM fixture</h1>${messages.map((message, index) => message.role === "user" ? `<user-query><div class="query-text">${message.content}</div></user-query>` : `<model-response><div class="response-content">${message.content}${index === 119 ? '<pre><code class="language-js">const fixture = true;</code></pre><a href="https://example.com/source">Fixture source</a>' : ""}</div></model-response>`).join("")}`;
  return `<!doctype html><title>Fixture | Claude</title><h1>Claude DOM fixture</h1>${messages.map((message, index) => `<div data-testid="${message.role === "user" ? "user" : "assistant"}-message">${message.content}${index === 119 ? '<pre><code class="language-js">const fixture = true;</code></pre><a href="https://example.com/source">Fixture source</a>' : ""}</div>`).join("")}`;
};

module.exports = { LONG_MESSAGE_COUNT, chatgptConversation, geminiRpcBody, geminiRequestBody, claudeConversation, domConversationHtml };
