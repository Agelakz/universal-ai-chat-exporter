chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_EXPORT") return false;

  const { filename, mimeType, content } = message.payload || {};
  if (!filename || !mimeType || typeof content !== "string") {
    sendResponse({ ok: false, error: "Invalid download payload." });
    return false;
  }

  const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  chrome.downloads.download({ url, filename, saveAs: true }, (downloadId) => {
    const error = chrome.runtime.lastError;
    sendResponse(error
      ? { ok: false, error: error.message }
      : { ok: true, downloadId });
  });
  return true;
});
