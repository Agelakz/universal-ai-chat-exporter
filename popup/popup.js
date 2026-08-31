const E = window.AIChatExporter;
const statusCard = document.querySelector("#statusCard");
const statusEl = document.querySelector("#status");
const statusDetailEl = document.querySelector("#statusDetail");
const providerBadge = document.querySelector("#providerBadge");
const messageEl = document.querySelector("#message");
const exportButton = document.querySelector("#export");
const copyButton = document.querySelector("#copyForAI");
const buttonLabel = document.querySelector("#buttonLabel");
const versionEl = document.querySelector("#version");
const contextPanel = document.querySelector("#contextPanel");
const conversationTitle = document.querySelector("#conversationTitle");
const togglePreview = document.querySelector("#togglePreview");
const preview = document.querySelector("#preview");
const messageList = document.querySelector("#messageList");
const selectedCount = document.querySelector("#selectedCount");
const tokenEstimate = document.querySelector("#tokenEstimate");
const sizeEstimate = document.querySelector("#sizeEstimate");
const selectAllButton = document.querySelector("#selectAll");
const selectNoneButton = document.querySelector("#selectNone");
const importFile = document.querySelector("#importFile");
const formatInputs = [...document.querySelectorAll('input[name="format"]')];

let conversation = null;
let selectedIndexes = new Set();

versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

const selectedFormat = () => formatInputs.find((input) => input.checked)?.value || "markdown";

const setMessage = (text = "", state = "") => {
  messageEl.textContent = text;
  if (state) messageEl.dataset.state = state;
  else delete messageEl.dataset.state;
};

const setLoading = (loading) => {
  exportButton.dataset.loading = String(loading);
  buttonLabel.textContent = loading ? "Menyiapkan export…" : "Export pilihan";
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const selectedConversation = () => {
  if (!conversation) throw new Error("Percakapan belum tersedia.");
  const messages = conversation.messages.filter((_message, index) => selectedIndexes.has(index));
  if (!messages.length) throw new Error("Pilih minimal satu pesan.");
  return { ...conversation, messages };
};

const updateSelection = () => {
  const count = selectedIndexes.size;
  selectedCount.textContent = String(count);
  exportButton.disabled = count === 0;
  copyButton.disabled = count === 0;

  if (!count) {
    tokenEstimate.textContent = "0";
    sizeEstimate.textContent = "0 B";
    return;
  }

  const estimate = E.estimateContext(selectedConversation());
  tokenEstimate.textContent = estimate.estimatedTokens.toLocaleString();
  sizeEstimate.textContent = formatBytes(estimate.bytes);
};

const renderMessages = () => {
  messageList.replaceChildren();
  conversation.messages.forEach((message, index) => {
    const label = document.createElement("label");
    label.className = "message-choice";
    label.dataset.role = message.role;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = selectedIndexes.has(index);
    input.setAttribute("aria-label", `Sertakan pesan ${index + 1}`);
    input.addEventListener("change", () => {
      if (input.checked) selectedIndexes.add(index);
      else selectedIndexes.delete(index);
      updateSelection();
    });

    const content = document.createElement("span");
    const role = document.createElement("strong");
    role.textContent = message.role === "user" ? "User" : conversation.provider;
    const excerpt = document.createElement("p");
    excerpt.textContent = message.content;
    content.append(role, excerpt);
    label.append(input, content);
    messageList.append(label);
  });
};

const loadConversation = (value, source = "page", extractionMethod = "") => {
  conversation = E.normalizeConversation(value);
  selectedIndexes = new Set(conversation.messages.map((_message, index) => index));
  conversationTitle.textContent = conversation.title;
  contextPanel.hidden = false;
  providerBadge.hidden = false;
  providerBadge.textContent = conversation.provider;
  statusCard.dataset.state = "ready";
  statusEl.textContent = source === "import" ? "Capsule siap" : "Percakapan siap";
  const sourceLabel = source === "import"
    ? "hasil import"
    : extractionMethod === "structured" ? "full history" : "DOM fallback";
  statusDetailEl.textContent = `${conversation.messages.length} pesan · ${sourceLabel}`;
  renderMessages();
  updateSelection();
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

const sendRuntimeMessage = (message) => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage(message, (response) => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message));
    else resolve(response);
  });
});

const writeClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Browser menolak akses clipboard.");
  }
};

async function initialize() {
  try {
    const result = await sendToPage({ type: "GET_CURRENT_CONVERSATION" });
    if (conversation) return;
    if (!result?.supported) throw new Error("Buka ChatGPT, Gemini, atau Claude.");
    if (!result.ok) throw new Error(result.error || "Percakapan tidak bisa dibaca.");
    loadConversation(result.conversation, "page", result.extractionMethod);
  } catch (error) {
    if (conversation) return;
    statusCard.dataset.state = "error";
    statusEl.textContent = "Halaman belum didukung";
    statusDetailEl.textContent = "Buka chat AI atau import capsule JSON";
    providerBadge.hidden = true;
    exportButton.disabled = true;
    copyButton.disabled = true;
    setMessage(error.message || "Extension tidak bisa membaca halaman ini.", "error");
  }
}

togglePreview.addEventListener("click", () => {
  const willOpen = preview.hidden;
  preview.hidden = !willOpen;
  togglePreview.textContent = willOpen ? "Tutup" : "Preview";
  togglePreview.setAttribute("aria-expanded", String(willOpen));
});

selectAllButton.addEventListener("click", () => {
  selectedIndexes = new Set(conversation.messages.map((_message, index) => index));
  renderMessages();
  updateSelection();
});

selectNoneButton.addEventListener("click", () => {
  selectedIndexes.clear();
  renderMessages();
  updateSelection();
});

copyButton.addEventListener("click", async () => {
  copyButton.disabled = true;
  setMessage("Menyiapkan context untuk AI…", "loading");
  try {
    await writeClipboard(E.formatForAI(selectedConversation()));
    setMessage("Context terpilih berhasil disalin. Review sebelum dikirim ke AI lain.", "success");
  } catch (error) {
    setMessage(error.message || "Context gagal disalin.", "error");
  } finally {
    copyButton.disabled = selectedIndexes.size === 0;
  }
});

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  setLoading(true);
  setMessage("Menyiapkan file secara lokal…", "loading");
  try {
    const payload = E.serialize(selectedConversation(), selectedFormat());
    const result = await sendRuntimeMessage({ type: "DOWNLOAD_EXPORT", payload });
    if (!result?.ok) throw new Error(result?.error || "Export gagal.");
    setMessage("File berhasil dibuat dan siap disimpan.", "success");
  } catch (error) {
    setMessage(error.message || "Export gagal.", "error");
  } finally {
    setLoading(false);
    exportButton.disabled = selectedIndexes.size === 0;
  }
});

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    setMessage("Capsule terlalu besar. Batas import saat ini 20 MB.", "error");
    return;
  }

  setMessage("Memvalidasi capsule secara lokal…", "loading");
  try {
    const imported = E.importCapsule(await file.text());
    loadConversation(imported, "import");
    setMessage("Capsule valid dan siap dipreview atau diexport ulang.", "success");
  } catch (error) {
    setMessage(error instanceof SyntaxError ? "File bukan JSON yang valid." : error.message, "error");
  }
});

initialize();
