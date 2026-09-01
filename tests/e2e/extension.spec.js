const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const {
  LONG_MESSAGE_COUNT,
  chatgptConversation,
  geminiRpcBody,
  geminiRequestBody,
  claudeConversation,
  domConversationHtml
} = require("./fixtures/providers");

const extensionPath = path.resolve(__dirname, "../..");

let context;
let extensionId;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext("", {
    headless: true,
    channel: "chromium",
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context?.close();
});

const extractFromTab = async (page) => {
  const control = await context.newPage();
  await control.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  const result = await control.evaluate(async (targetUrl) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((item) => item.url === targetUrl);
    if (!tab?.id) throw new Error(`Fixture tab not found: ${targetUrl}`);
    return chrome.tabs.sendMessage(tab.id, { type: "GET_CURRENT_CONVERSATION" });
  }, page.url());
  await control.close();
  return result;
};

test("ChatGPT exports 120 structured messages without scrolling", async () => {
  const page = await context.newPage();
  await page.route("https://chatgpt.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/backend-api/conversations/")) {
      expect(url.searchParams.get("num_turns")).toBe("10");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(chatgptConversation(url.searchParams.get("cursor") || "")) });
    } else {
      await route.fulfill({ status: 200, contentType: "text/html", body: domConversationHtml("chatgpt") });
    }
  });
  await page.goto("https://chatgpt.com/c/11111111-1111-1111-1111-111111111111");
  const result = await extractFromTab(page);
  expect(result.ok).toBe(true);
  expect(result.extractionMethod).toBe("structured");
  expect(result.conversation.messages).toHaveLength(LONG_MESSAGE_COUNT);
  expect(result.conversation.messages.at(-1).codeBlocks[0].language).toBe("js");
  expect(result.conversation.messages.at(-1).citations[0].url).toBe("https://example.com/source");
  await page.close();
});

test("Gemini captures 120 structured messages without scrolling", async () => {
  const page = await context.newPage();
  await page.route("https://gemini.google.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("batchexecute")) {
      const form = new URLSearchParams(route.request().postData() || "");
      const envelope = JSON.parse(form.get("f.req"));
      const request = JSON.parse(envelope[0][0][1]);
      await route.fulfill({ status: 200, contentType: "application/json", body: geminiRpcBody(request[1] > 10) });
    } else {
      const body = `${domConversationHtml("gemini")}<script>fetch('/_/BardChatUi/data/batchexecute?rpcids=hNvQHb&source-path=/app/fixture-gemini',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},body:${JSON.stringify(geminiRequestBody())}})</script>`;
      await route.fulfill({ status: 200, contentType: "text/html", body });
    }
  });
  await page.goto("https://gemini.google.com/app/fixture-gemini");
  await page.waitForTimeout(250);
  const result = await extractFromTab(page);
  expect(result.ok).toBe(true);
  expect(result.extractionMethod).toBe("structured");
  expect(result.conversation.messages).toHaveLength(LONG_MESSAGE_COUNT);
  await page.close();
});

test("Claude exports active branch with 120 messages without scrolling", async () => {
  const page = await context.newPage();
  const conversationId = "22222222-2222-2222-2222-222222222222";
  await page.route("https://claude.ai/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes(`/chat_conversations/${conversationId}`)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(claudeConversation()) });
    } else {
      const body = `${domConversationHtml("claude")}<script>fetch('/api/organizations/33333333-3333-3333-3333-333333333333/chat_conversations/${conversationId}')</script>`;
      await route.fulfill({ status: 200, contentType: "text/html", body });
    }
  });
  await page.goto(`https://claude.ai/chat/${conversationId}`);
  await page.waitForTimeout(250);
  const result = await extractFromTab(page);
  expect(result.ok).toBe(true);
  expect(result.extractionMethod).toBe("structured");
  expect(result.conversation.messages).toHaveLength(LONG_MESSAGE_COUNT);
  expect(result.conversation.messages.at(-1).citations[0].url).toBe("https://example.com/source");
  await page.close();
});

test("DOM fallback preserves rich content when structured extraction fails", async () => {
  const page = await context.newPage();
  await page.route("https://chatgpt.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/backend-api/conversations/")) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.fulfill({ status: 200, contentType: "text/html", body: domConversationHtml("chatgpt") });
  });
  await page.goto("https://chatgpt.com/c/44444444-4444-4444-4444-444444444444");
  const result = await extractFromTab(page);
  expect(result.extractionMethod).toBe("dom");
  expect(result.conversation.messages).toHaveLength(LONG_MESSAGE_COUNT);
  expect(result.conversation.messages.at(-1).codeBlocks[0].content).toContain("fixture");
  expect(result.conversation.messages.at(-1).citations[0].url).toBe("https://example.com/source");
  expect(result.conversation.messages.at(-1).attachments[0].name).toContain("fixture.pdf");
  await page.close();
});
