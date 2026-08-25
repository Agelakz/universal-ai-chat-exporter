(() => {
  const Exporter = window.AIChatExporter = window.AIChatExporter || {};
  Exporter.adapters = Exporter.adapters || [];

  Exporter.registerAdapter = (adapter) => Exporter.adapters.push(adapter);

  Exporter.cleanText = (value = "") => value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  Exporter.visible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  };

  Exporter.textFrom = (element) => {
    if (!element) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll([
      "button", "svg", "style", "script", "textarea",
      "[aria-hidden='true']", "[data-testid*='copy']",
      "[data-testid*='feedback']", ".sr-only"
    ].join(",")).forEach((node) => node.remove());

    clone.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code")?.textContent || pre.textContent || "";
      const language = pre.querySelector("code")?.className.match(/language-([\w-]+)/)?.[1] || "";
      pre.replaceWith(document.createTextNode(`\n\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n`));
    });
    clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    clone.querySelectorAll("p, li, h1, h2, h3, h4, blockquote").forEach((node) => {
      node.append(document.createTextNode("\n"));
    });
    return Exporter.cleanText(clone.textContent || "");
  };

  Exporter.uniqueMessages = (messages) => {
    const result = [];
    for (const message of messages) {
      const role = message.role === "user" ? "user" : "assistant";
      const content = Exporter.cleanText(message.content);
      if (!content) continue;
      const previous = result[result.length - 1];
      if (previous?.role === role && previous.content === content) continue;
      result.push({ role, content });
    }
    return result;
  };

  const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const safeFilePart = (value) => Exporter.cleanText(value || "AI Chat")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\.+$/g, "")
    .slice(0, 100) || "AI Chat";

  Exporter.serialize = (conversation, format) => {
    const exportedAt = new Date().toISOString();
    const data = { ...conversation, exportedAt };
    const title = safeFilePart(conversation.title);
    const stamp = exportedAt.slice(0, 10);

    if (format === "json") {
      return {
        filename: `${title} - ${stamp}.json`,
        mimeType: "application/json",
        content: JSON.stringify(data, null, 2)
      };
    }

    if (format === "txt") {
      const body = conversation.messages.map((message) =>
        `${message.role === "user" ? "You" : conversation.provider}:\n${message.content}`
      ).join("\n\n");
      return { filename: `${title} - ${stamp}.txt`, mimeType: "text/plain", content: `${conversation.title}\n\n${body}\n` };
    }

    if (format === "html") {
      const messages = conversation.messages.map((message) => `
        <article class="message ${message.role}">
          <h2>${message.role === "user" ? "You" : escapeHtml(conversation.provider)}</h2>
          <div>${escapeHtml(message.content).replace(/\n/g, "<br>")}</div>
        </article>`).join("");
      const content = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(conversation.title)}</title><style>body{max-width:900px;margin:40px auto;padding:0 20px;font:16px/1.6 system-ui;color:#202124}.meta{color:#666}.message{padding:18px 20px;margin:16px 0;border-radius:14px;background:#f4f4f5}.assistant{background:#eef4ff}.message h2{font-size:14px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.04em}</style></head><body><h1>${escapeHtml(conversation.title)}</h1><p class="meta">${escapeHtml(conversation.provider)} · ${escapeHtml(conversation.url)} · ${exportedAt}</p>${messages}</body></html>`;
      return { filename: `${title} - ${stamp}.html`, mimeType: "text/html", content };
    }

    const body = conversation.messages.map((message) =>
      `## ${message.role === "user" ? "You" : conversation.provider}\n\n${message.content}`
    ).join("\n\n---\n\n");
    const content = `# ${conversation.title}\n\n- Source: ${conversation.provider}\n- URL: ${conversation.url}\n- Exported: ${exportedAt}\n\n${body}\n`;
    return { filename: `${title} - ${stamp}.md`, mimeType: "text/markdown", content };
  };

  Exporter.getAdapter = () => Exporter.adapters.find((adapter) => adapter.matches(location));
})();
