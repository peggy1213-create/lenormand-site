# Read with Your API — Spec

Status: **draft, awaiting approval**. No implementation until this is approved.

## 0. Context established during pre-spec verification

- Branch: `master`, clean.
- `buildAIPrompt(input: { spread: SpreadId; cards: Array<{ cardId: number }>; question?: string; locale: Locale }): string` in [src/lib/prompt.ts:156](../src/lib/prompt.ts#L156) returns one plain-text instructional string — no system/user split. This is what the proxy will forward as `prompt`.
- Called at [DrawFlow.tsx:288](../src/components/DrawFlow.tsx#L288); today it's only ever handed to `CopyToClipboardButton` at [DrawFlow.tsx:686](../src/components/DrawFlow.tsx#L686), alongside a "Back to spreads" button.
- No `src/app/api/` directory exists yet.
- No `vercel.json`; `next.config.mjs` only wraps `next-intl`'s plugin, no custom `output` mode — Route Handlers deploy as Vercel serverless functions by default. `@vercel/analytics` in `package.json` confirms Vercel hosting.
- `messages/en.json` / `messages/zh-TW.json` namespaces today: `site`, `nav`, `home`, `spread`, `draw`, `history`, `about`, `footer`, `cards`. No `settings` namespace, no settings page, no settings link in `Header.tsx` nav (`Spreads` / `History` / `About` only).
- `src/lib/storage.ts` is the existing localStorage convention: single key `lenormand.history`, feature-namespaced, try/catch around every read/write, `isStoragePersistable()` probe for private-mode detection.
- Next.js 14.2.35 (App Router), React 18, next-intl 4.13.4.

## 0.1 Scope decisions (confirmed with you)

- **Three providers for v1**: Anthropic, OpenAI, **Gemini** (added at your request — Gemini is free-tier friendly, likely the most common choice for casual users).
- **Model input is free text, not a curated dropdown.** The user types the model name/ID themselves. This avoids the site needing to track or verify each provider's current model catalog, and works for any model the user's key has access to (including future models none of us have seen yet).

---

## a) User flow

### Settings surface (new)

There is currently no settings page. New route `src/app/[locale]/settings/page.tsx`, plus a new top-level nav item in `Header.tsx`: **Spreads / History / Settings / About**.

The settings page has one section for v1: **API Configuration**.

### API Configuration section

- **Provider dropdown**: `Anthropic` | `OpenAI` | `Gemini`. Selecting a provider shows that provider's key input, model text field, and test button. Switching providers does not clear another provider's stored key — all three can be configured simultaneously.
- **API key input**: `type="password"`, with a show/hide toggle (eye icon), consistent with the site's existing icon-button style (`Header.tsx`'s `MenuIcon` pattern). Autosaves to localStorage on blur — no separate "Save" button, matching the site's autosave-by-default posture.
- **Model field**: plain text input, not a dropdown. Placeholder text gives one example per provider so the field isn't blank and unguided — e.g. Anthropic: `claude-opus-5`, OpenAI/Gemini: a neutral hint like "see your provider's model list" rather than a specific ID I can't currently verify as current. No validation beyond non-empty — an invalid model name simply surfaces as a provider error on first use (handled by the existing error-mapping in section c).
- **Test button**: makes a minimal call through the proxy (e.g. `max_tokens: 1` / provider equivalent, prompt `"Reply with OK."`) to confirm the key + model combination works. Shows inline success (✓) or failure (✗, with the mapped error message) below the button. A one-line note under the button states that the test consumes a small amount of real usage against the user's own account (per your confirmation in the open questions).
- **Privacy disclosure**: short paragraph near the key input (section e).

### Reading screen change

In `DrawFlow.tsx`, at the same point `CopyToClipboardButton` renders today (~line 684-695, inside `{done && (...)}`), add a second button: **"Read with your API"**.

- If a key is stored for **any** provider, the button appears next to the existing copy-prompt button. It defaults to whichever provider was most recently configured/used (tracked as `lastUsedProvider`), per your confirmation — no extra provider picker cluttering the reading screen itself.
- If no key is stored for any provider, only the existing "Copy AI reading prompt" button shows — unchanged from today.
- The copy-prompt button is never removed or de-emphasized. Both buttons can appear side by side.

## b) Proxy architecture

- Single Next.js Route Handler: `src/app/api/reading/route.ts`.
- `POST` body: `{ provider: "anthropic" | "openai" | "gemini", model: string, apiKey: string, prompt: string, locale: "en" | "zh-TW" }`.
- Forwards to the appropriate provider's completion endpoint server-side, using each provider's official SDK (Anthropic and OpenAI SDKs are well-documented; the Gemini request/response shape needs a verification pass at implementation time — see Open Questions).
- **Streaming, plain text** (per your choice): the route returns a `ReadableStream` of plain response text — no SSE framing. Token usage is appended as a final trailing line after a sentinel (`\n__USAGE__{"inputTokens":123,"outputTokens":456}`), which the client strips off the end of the stream and parses. This keeps the client-side stream consumer to one code path across all three providers, since each provider SDK's usage field is normalized into the same `{inputTokens, outputTokens}` shape server-side before being written to the sentinel line (Anthropic: `usage.input_tokens`/`usage.output_tokens`; OpenAI: `usage.prompt_tokens`/`usage.completion_tokens`; Gemini: `usageMetadata.promptTokenCount`/`usageMetadata.candidatesTokenCount` — to confirm at implementation).
- **No logging**: the route handler must never `console.log` (or otherwise persist) the request body, the API key, or the prompt text. A code comment at the top of the file states this explicitly. Caught provider errors are re-mapped to a small enum (invalid-key / rate-limited / refusal / network) before being sent to the client — never passed through with raw provider error text, which could echo request content.
- **Stateless**: no database, no cookies, no session. Reads the request, makes one upstream call, streams the response, returns.

## c) Client-side handling

- New component `ReadWithApiPanel.tsx` rendered in place of / alongside the reading output when the user clicks "Read with your API". Streams text into a growing block using the reading screen's existing typography — no typewriter effect, plain append-as-it-arrives.
- On completion, token count shown: `"≈ 1,240 tokens"` (`toLocaleString()`-formatted sum of input + output tokens, prefixed "≈" since it's informational).
- **Error handling** — four distinct cases, each with a calm inline message and the copy-prompt fallback surfaced immediately below it:
  1. **Invalid key** (401-equivalent from any of the three providers) → "That key doesn't seem to work. Check it in Settings, or copy the prompt below instead."
  2. **Rate limited** (429-equivalent) → "Your account has hit a rate limit. Try again in a moment, or copy the prompt below instead."
  3. **Content refusal** (provider declines the request — Anthropic `stop_reason: "refusal"`, OpenAI/Gemini content-filter equivalents) → "The reading couldn't be completed this time. Copy the prompt below and try your own client instead."
  4. **Network failure** (fetch throws, or the stream drops mid-response) → "Something interrupted the connection. Copy the prompt below instead."
  - zh-TW strings proposed in section d, pending your hand-check.

## d) Bilingual copy (proposed — EN / zh-TW)

Calm, plain register, no exclamation marks, no "AI-powered" language — matches the site's existing tone (the `about` page never uses "AI" even describing the AI-facing copy-prompt flow).

New top-level `settings` namespace, plus a few new keys under the existing `draw` namespace (mirroring how `copyPromptButton` already lives in `draw`).

```json
// New "settings" namespace
"settings": {
  "title": "Settings",                                          // zh-TW: 設定
  "apiSectionHeading": "Read with your own API key",             // zh-TW: 使用你自己的 API 金鑰
  "apiSectionLead": "Bring your own Anthropic, OpenAI, or Gemini key to run readings directly, instead of copying the prompt elsewhere.",
                                                                   // zh-TW: 使用你自己的 Anthropic、OpenAI 或 Gemini 金鑰直接進行解讀，不必再另外複製提示詞。
  "providerLabel": "Provider",                                    // zh-TW: 服務商
  "providerAnthropic": "Anthropic",                               // zh-TW: Anthropic
  "providerOpenAI": "OpenAI",                                     // zh-TW: OpenAI
  "providerGemini": "Gemini",                                     // zh-TW: Gemini
  "apiKeyLabel": "API key",                                       // zh-TW: API 金鑰
  "apiKeyHelp": "Stored only in this browser. Never sent to Little Think servers.",
                                                                   // zh-TW: 僅儲存在此瀏覽器中，不會傳送到 Little Think 的伺服器。
  "apiKeyPlaceholder": "sk-...",                                  // zh-TW: sk-...
  "showKeyLabel": "Show key",                                     // zh-TW: 顯示金鑰
  "hideKeyLabel": "Hide key",                                     // zh-TW: 隱藏金鑰
  "modelLabel": "Model",                                          // zh-TW: 模型
  "modelHelp": "Enter the exact model name from your provider's documentation.",
                                                                   // zh-TW: 請輸入你所使用服務商文件中列出的確切模型名稱。
  "testButton": "Test key",                                       // zh-TW: 測試金鑰
  "testCostNote": "Testing uses a small amount of your own API usage.",
                                                                   // zh-TW: 測試會使用你自己帳號中的少量額度。
  "testSuccessToast": "Key works",                                // zh-TW: 金鑰可正常使用
  "testFailureToast": "Key didn't work",                          // zh-TW: 金鑰無法使用
  "privacyDisclosureTitle": "Where this goes",                    // zh-TW: 資料流向說明
  "privacyDisclosureBody": "Your key is stored only in this browser's local storage — never on Little Think's servers. When you request a reading, the key and prompt pass through a stateless relay that forwards them to your chosen provider and is not logged. Your provider will see the prompt and your question, subject to their own terms. Remove your key any time by clearing it above.",
                                                                   // zh-TW: 你的金鑰僅儲存在這個瀏覽器的本機儲存空間中，不會存放在 Little Think 的伺服器上。當你要求解讀時，金鑰與提示詞會經過一個不記錄任何內容的中繼站，轉送給你選擇的服務商。你選擇的服務商會依照其自身條款看到提示詞與你的問題。你可以隨時在上方清除金鑰。
}
```

```json
// New keys under existing "draw" namespace
"readWithApiButton": "Read with your API",                       // zh-TW: 用你的 API 解讀
"readingStreamingLabel": "Reading…",                              // zh-TW: 解讀中…
"tokenCountFormat": "≈ {count} tokens",                           // zh-TW: 約 {count} 個 token
"apiErrorInvalidKey": "That key doesn't seem to work. Check it in Settings, or copy the prompt below instead.",
                                                                   // zh-TW: 這個金鑰似乎無法使用。請到設定頁確認，或改為複製下方的提示詞。
"apiErrorRateLimited": "Your account has hit a rate limit. Try again in a moment, or copy the prompt below instead.",
                                                                   // zh-TW: 你的帳號已達到速率限制。請稍後再試，或改為複製下方的提示詞。
"apiErrorRefusal": "The reading couldn't be completed this time. Copy the prompt below and try your own client instead.",
                                                                   // zh-TW: 這次無法完成解讀。請複製下方的提示詞，改用你自己的用戶端嘗試。
"apiErrorNetwork": "Something interrupted the connection. Copy the prompt below instead.",
                                                                   // zh-TW: 連線中斷了。請改為複製下方的提示詞。
```

All zh-TW strings above are a first pass for your hand-check — none land in `messages/zh-TW.json` until you've reviewed them.

## e) Privacy disclosure

Exact copy proposed above as `settings.privacyDisclosureBody`. Covers, in order: (1) where the key lives (browser localStorage only), (2) that the proxy is stateless and unlogged, (3) that the chosen provider sees the prompt and question under their own terms, (4) that removal is always available. Shown directly under the API key input, in the muted-text style `draw.questionHelp.footer` already uses for caveat text.

## f) Out of scope for v1

- Prompt customization by the user (the prompt text stays exactly what `buildAIPrompt` produces).
- Multiple keys per provider (one key per provider stored at a time; entering a new key overwrites the old one for that provider).
- Key encryption beyond plain localStorage (matches `storage.ts`'s existing posture for reading history — no encryption there either).
- Providers other than Anthropic, OpenAI, and Gemini.
- Local model support (Ollama, LM Studio, etc.).
- Client-side model-name validation — an invalid/unsupported model string is only caught when the provider itself rejects it, surfaced through the existing error-mapping.
- Server-side rate limiting on the proxy — relies entirely on the provider's own rate limits, since the proxy has no state to rate-limit against.

## g) File change list

**New files:**
- `specs/byo-api-reading.md` (this file — already created)
- `src/app/api/reading/route.ts` — the proxy Route Handler
- `src/app/[locale]/settings/page.tsx` — new settings page
- `src/app/[locale]/settings/page.module.css` — styles, matching `about/page.module.css` conventions
- `src/lib/apiSettings.ts` — localStorage read/write for provider/key/model selection, following `storage.ts`'s try/catch + `isStoragePersistable()` pattern. Proposed key name: `lenormand.apiSettings` (namespaced like `lenormand.history`), storing `{ anthropic?: { apiKey, model }, openai?: { apiKey, model }, gemini?: { apiKey, model }, lastUsedProvider? }`.
- `src/components/ReadWithApiPanel.tsx` — streaming display + error states on the reading screen
- `src/components/ApiKeyInput.tsx` — password-masked input with show/hide toggle, reusable across the three providers

**Modified files:**
- `src/components/Header.tsx` — add "Settings" nav item (between History and About)
- `src/components/DrawFlow.tsx` — add "Read with your API" button conditionally next to `CopyToClipboardButton`, wire up `ReadWithApiPanel`
- `messages/en.json` — additive only, new `settings` namespace + new keys under `draw` (section d)
- `messages/zh-TW.json` — additive only, same keys, **pending your hand-check** before landing
- `package.json` — new server-side-only dependencies: `@anthropic-ai/sdk`, `openai`, and a Gemini SDK (`@google/genai` — to confirm the current recommended package at implementation time)

**Protected files — flagged, not touched beyond what's listed:**
- `src/data/cards.ts` — not touched.
- `next.config.js` — n/a, this project uses `next.config.mjs`; not touched either way, no new env vars or route rewrites needed since the Route Handler is a normal App Router file.
- `tsconfig.json` — not touched.
- `tailwind.config.js` — n/a, this project doesn't use Tailwind (plain CSS Modules); not applicable.
- `messages/en.json` / `messages/zh-TW.json` — additive only as noted above, no existing keys renamed or removed.

## h) Open questions — all resolved, proposals adopted

1. **Gemini request/response shape** — resolved: verify Google's current SDK/API docs as the first implementation step, since it wasn't in scope to research blind for this spec.
2. **Model field placeholder text** — resolved: concrete example for Anthropic (`claude-opus-5`) only; generic hint for OpenAI/Gemini, no further research needed before implementation.
3. **`lastUsedProvider` write timing** — resolved: updates the moment a key is saved in Settings, not on first completed reading.
