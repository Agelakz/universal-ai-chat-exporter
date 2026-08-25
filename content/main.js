(() => {
  const E = window.AIChatExporter;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_PAGE_STATUS") {
      const adapter = E.getAdapter();
      if (!adapter) sendResponse({ ok: false, supported: false });
      else {
        const conversation = adapter.extract();
        sendResponse({ ok: true, supported: true, provider: adapter.name, messageCount: conversation.messages.length });
      }
      return false;
    }

    if (message?.type !== "EXPORT_CURRENT_CHAT") return false;
    try {
      const adapter = E.getAdapter();
      if (!adapter) throw new Error("Website AI ini belum didukung.");
      const conversation = adapter.extract();
      if (!conversation.messages.length) throw new Error("Percakapan belum ditemukan. Coba scroll chat sampai semua pesan termuat.");
      const payload = E.serialize(conversation, message.format || "markdown");
      chrome.runtime.sendMessage({ type: "DOWNLOAD_EXPORT", payload }, (result) => {
        const error = chrome.runtime.lastError;
        sendResponse(error ? { ok: false, error: error.message } : result);
      });
      return true;
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Export gagal." });
      return false;
    }
  });
})();
