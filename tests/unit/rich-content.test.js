const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const loadCore = () => {
  const context = {
    window: {},
    globalThis: null,
    TextEncoder,
    URL,
    crypto: require("node:crypto").webcrypto,
    location: { href: "https://fixture.test/chat" }
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync("content/core.js", "utf8"), context);
  return context.window.AIChatExporter;
};

const richConversation = {
  provider: "Fixture AI",
  title: "Rich fixture",
  url: "https://fixture.test/chat",
  messages: [{
    role: "assistant",
    content: "Example:\n\n```js\nconst value = 42;\n```",
    codeBlocks: [{ language: "js", content: "const value = 42;" }],
    citations: [{ title: "Reference", url: "https://example.com/reference" }],
    attachments: [{ name: "notes.pdf", mimeType: "application/pdf", size: 2048 }],
    artifacts: [{ title: "Generated module", type: "code", language: "js", content: "export default 42;" }]
  }]
};

test("rich metadata survives JSON capsule round-trip", () => {
  const E = loadCore();
  const serialized = E.serialize(richConversation, "json");
  const imported = E.importCapsule(serialized.content);
  assert.deepEqual(JSON.parse(JSON.stringify(imported.messages[0].codeBlocks)), richConversation.messages[0].codeBlocks);
  assert.equal(imported.messages[0].citations[0].url, "https://example.com/reference");
  assert.equal(imported.messages[0].attachments[0].name, "notes.pdf");
  assert.equal(imported.messages[0].artifacts[0].content, "export default 42;");
});

test("Markdown and HTML preserve rich content safely", () => {
  const E = loadCore();
  const markdown = E.serialize(richConversation, "markdown").content;
  const html = E.serialize(richConversation, "html").content;
  assert.match(markdown, /\*\*Sources\*\*/);
  assert.match(markdown, /notes\.pdf/);
  assert.match(markdown, /export default 42/);
  assert.match(html, /<pre><code class="language-js">const value = 42;/);
  assert.match(html, /href="https:\/\/example\.com\/reference"/);
  assert.match(html, /Generated module/);
});

test("unsafe citation protocols and attachment URLs are not exported", () => {
  const E = loadCore();
  const normalized = E.normalizeConversation({
    ...richConversation,
    messages: [{
      role: "assistant",
      content: "Safe text",
      citations: [{ title: "Unsafe", url: "javascript:alert(1)" }],
      attachments: [{ name: "private.txt", url: "https://signed.example/private?token=secret" }]
    }]
  });
  assert.equal(normalized.messages[0].citations[0].url, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.messages[0].attachments[0])), { name: "private.txt" });
});

test("citation-only messages survive while empty artifacts are discarded", () => {
  const E = loadCore();
  const normalized = E.normalizeConversation({
    ...richConversation,
    messages: [{
      role: "assistant",
      content: "",
      citations: [{ title: "Only source", url: "https://example.com/source" }],
      artifacts: [{}]
    }]
  });
  assert.equal(normalized.messages.length, 1);
  assert.equal(normalized.messages[0].citations[0].title, "Only source");
  assert.equal(normalized.messages[0].artifacts, undefined);
});
