const statusCard = document.querySelector("#statusCard");
const statusEl = document.querySelector("#status");
const statusDetailEl = document.querySelector("#statusDetail");
const providerBadge = document.querySelector("#providerBadge");
const messageEl = document.querySelector("#message");
const exportButton = document.querySelector("#export");
const buttonLabel = document.querySelector("#buttonLabel");
const versionEl = document.querySelector("#version");
const formatInputs = [...document.querySelectorAll('input[name="format"]')];

versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

const selectedFormat = () => formatInputs.find((input) => input.checked)?.value || "markdown";

const setMessage = (text = "", state = "") => {
  messageEl.textContent = text;
  if (state) messageEl.dataset.state = state;
  else delete messageEl.dataset.state;
};

const setLoading = (loading) => {
  exportButton.dataset.loading = String(loading);
  buttonLabel.textContent = loading ? "Menyiapkan export…" : "Export percakapan";
};

chrome.storage.local.get({ format: "markdown" }, ({ format }) => {
  const savedInput = formatInputs.find((input) => input.value === format);
  if (savedInput) savedInput.checked = true;
});

formatInputs.forEach((input) => input.addEventListener("change", () => {
  if (input.checked) chrome.storage.local.set({ format: input.value });
}));

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
    if (!result?.supported) throw new Error("Buka ChatGPT, Gemini, atau Claude.");
    if (!result.ok) throw new Error(result.error || "Percakapan tidak bisa dibaca.");

    statusCard.dataset.state = "ready";
    statusEl.textContent = result.messageCount ? "Percakapan siap" : "Pesan tidak ditemukan";
    statusDetailEl.textContent = result.messageCount
      ? `${result.messageCount} pesan siap diexport`
      : "Buka percakapan yang ingin disimpan";
    providerBadge.hidden = false;
    providerBadge.textContent = result.provider;
    exportButton.disabled = result.messageCount === 0;
    if (!result.messageCount) setMessage("Belum ada pesan yang bisa diexport.", "error");
  } catch (error) {
    statusCard.dataset.state = "error";
    statusEl.textContent = "Halaman belum didukung";
    statusDetailEl.textContent = "Buka chat AI lalu refresh tab";
    providerBadge.hidden = true;
    exportButton.disabled = true;
    setMessage(error.message || "Extension tidak bisa membaca halaman ini.", "error");
  }
}

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  setLoading(true);
  setMessage("Menyiapkan file secara lokal…", "loading");
  try {
    const result = await sendToPage({ type: "EXPORT_CURRENT_CHAT", format: selectedFormat() });
    if (!result?.ok) throw new Error(result?.error || "Export gagal.");
    setMessage("File berhasil dibuat dan siap disimpan.", "success");
  } catch (error) {
    setMessage(error.message || "Export gagal.", "error");
  } finally {
    setLoading(false);
    exportButton.disabled = statusCard.dataset.state !== "ready";
  }
});

initialize();
