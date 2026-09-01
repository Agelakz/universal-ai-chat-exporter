(() => {
  const MESSAGE_TYPE = "AI_CHAT_EXPORTER_CHATGPT_CONVERSATION";
  const capturedIds = new Set();
  const originalFetch = window.fetch;

  const conversationIdFromUrl = (value) => {
    try {
      return new URL(value, location.origin).pathname.match(/^\/backend-api\/conversations\/([0-9a-f-]+)$/i)?.[1] || "";
    } catch (_error) {
      return "";
    }
  };

  const publish = (conversation, conversationId, complete) => {
    if (!Array.isArray(conversation?.messages) || !conversation.messages.length) return;
    window.postMessage({
      type: MESSAGE_TYPE,
      payload: { source: "chatgpt-page", conversationId, complete, conversation }
    }, location.origin);
  };

  const requestLikePage = (url, input, init) => {
    if (input instanceof Request) return originalFetch.call(window, new Request(url, input));
    return originalFetch.call(window, url, init);
  };

  const collectHistory = async (requestUrl, input, init, firstPage, conversationId) => {
    const messages = [...firstPage.messages];
    const messageIds = new Set(messages.map((message) => message?.id).filter(Boolean));
    const seenCursors = new Set();
    let pageInfo = firstPage.page_info;

    for (let pageNumber = 0; pageInfo?.has_previous_page && pageNumber < 1000; pageNumber += 1) {
      const cursor = pageInfo.start_cursor;
      if (!cursor || seenCursors.has(cursor)) break;
      seenCursors.add(cursor);
      const url = new URL(requestUrl, location.origin);
      url.searchParams.set("include_has_versions", "true");
      url.searchParams.set("num_turns", "10");
      url.searchParams.set("cursor", cursor);
      const response = await requestLikePage(url.href, input, init);
      if (!response.ok) throw new Error(`ChatGPT page request returned ${response.status}`);
      const previous = await response.json();
      if (!Array.isArray(previous.messages)) throw new Error("Invalid ChatGPT page response");
      const unique = previous.messages.filter((message) => !message?.id || !messageIds.has(message.id));
      unique.forEach((message) => message?.id && messageIds.add(message.id));
      messages.unshift(...unique);
      pageInfo = previous.page_info;
    }

    publish({ ...firstPage, messages, page_info: pageInfo }, conversationId, !pageInfo?.has_previous_page);
  };

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const requestUrl = String(response.url || args[0]?.url || args[0] || "");
      const conversationId = conversationIdFromUrl(requestUrl);
      if (!conversationId || capturedIds.has(conversationId)) return response;
      capturedIds.add(conversationId);
      response.clone().json().then((firstPage) => {
        publish(firstPage, conversationId, !firstPage?.page_info?.has_previous_page);
        if (firstPage?.page_info?.has_previous_page) {
          collectHistory(requestUrl, args[0], args[1], firstPage, conversationId).catch(() => {});
        }
      }).catch(() => {});
    } catch (_error) {
      // Never interfere with ChatGPT's own request lifecycle.
    }
    return response;
  };
})();
