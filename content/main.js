(() => {
  const E = window.AIChatExporter;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_CURRENT_CONVERSATION") {
      const adapter = E.getAdapter();
      if (!adapter) {
        sendResponse({ ok: false, supported: false });
        return false;
      }
      Promise.resolve(adapter.extract())
        .then((conversation) => sendResponse({
          ok: true,
          supported: true,
          extractionMethod: conversation.extractionMethod || "dom",
          conversation: E.normalizeConversation(conversation)
        }))
        .catch((error) => sendResponse({ ok: false, supported: true, error: error.message }));
      return true;
    }

    if (message?.type === "GET_PAGE_STATUS") {
      const adapter = E.getAdapter();
      if (!adapter) {
        sendResponse({ ok: false, supported: false });
        return false;
      }
      Promise.resolve(adapter.extract())
        .then((conversation) => sendResponse({
          ok: true,
          supported: true,
          provider: adapter.name,
          messageCount: conversation.messages.length
        }))
        .catch((error) => sendResponse({ ok: false, supported: true, error: error.message }));
      return true;
    }

    if (message?.type !== "EXPORT_CURRENT_CHAT") return false;
    (async () => {
      const adapter = E.getAdapter();
      if (!adapter) throw new Error("Website AI ini belum didukung.");
      const conversation = await adapter.extract();
      if (!conversation.messages.length) throw new Error("Percakapan belum ditemukan. Coba refresh halaman lalu buka extension lagi.");
      const payload = E.serialize(conversation, message.format || "markdown");
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "DOWNLOAD_EXPORT", payload }, (result) => {
          const error = chrome.runtime.lastError;
          resolve(error ? { ok: false, error: error.message } : result);
        });
      });
    })()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message || "Export gagal." }));
    return true;
  });
})();
