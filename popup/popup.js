const statusEl = document.querySelector("#status");
const messageEl = document.querySelector("#message");
const exportButton = document.querySelector("#export");
const formatSelect = document.querySelector("#format");

chrome.storage.local.get({ format: "markdown" }, ({ format }) => {
  formatSelect.value = format;
});

formatSelect.addEventListener("change", () => {
  chrome.storage.local.set({ format: formatSelect.value });
});

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToPage(message) {
  const tab = await activeTab();
  if (!tab?.id) throw new Error("Tab aktif tidak ditemukan.");
  return chrome.tabs.sendMessage(tab.id, message);
}

async function initialize() {
  try {
    const result = await sendToPage({ type: "GET_PAGE_STATUS" });
    if (!result?.supported) throw new Error("Buka ChatGPT atau Gemini.");
    statusEl.textContent = `${result.provider} · ${result.messageCount} pesan ditemukan`;
    exportButton.disabled = result.messageCount === 0;
    if (!result.messageCount) messageEl.textContent = "Belum ada pesan yang bisa diexport.";
  } catch (_error) {
    statusEl.textContent = "Halaman belum didukung";
    messageEl.textContent = "Refresh tab AI setelah memasang extension.";
  }
}

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  messageEl.textContent = "Menyiapkan file…";
  try {
    const result = await sendToPage({ type: "EXPORT_CURRENT_CHAT", format: formatSelect.value });
    if (!result?.ok) throw new Error(result?.error || "Export gagal.");
    messageEl.style.color = "#7ce4c8";
    messageEl.textContent = "File berhasil dibuat.";
  } catch (error) {
    messageEl.style.color = "#ffb4a8";
    messageEl.textContent = error.message || "Export gagal.";
  } finally {
    exportButton.disabled = false;
  }
});

initialize();
