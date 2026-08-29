"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import MarkdownReading from "./MarkdownReading";
import { streamReading, type ChatMessage, type ReadingApiErrorCode } from "@/lib/readingApiClient";
import { getActiveConfig, DEFAULT_MODELS, type ApiProvider } from "@/lib/apiSettings";
import { updateReadingApiText, updateReadingApiFollowUps, type ApiFollowUp } from "@/lib/storage";

type PanelState = "streaming" | "done" | "error";
type FollowUpState = "idle" | "streaming" | "error";

// The querent can ask a small number of follow-up questions about the
// finished reading before the thread is closed off — keeps it a reflective
// nudge, not an open chat.
const MAX_FOLLOW_UPS = 3;
const FOLLOW_UP_MAX_CHARS = 250;

function errorMessageKey(code: ReadingApiErrorCode | null): string {
  return code === "invalid_key"
    ? "apiErrorInvalidKey"
    : code === "rate_limited"
      ? "apiErrorRateLimited"
      : code === "refusal"
        ? "apiErrorRefusal"
        : "apiErrorNetwork";
}

// Streams a reading through the caller's own provider key (via
// src/app/api/reading/route.ts) and renders it progressively, no typewriter
// effect — text simply grows as it arrives. On any failure, just a short
// error line is shown — the "Copy AI reading prompt" button above this
// panel is still the fallback, so it isn't duplicated here. On success,
// the finished markdown is saved onto the matching history entry
// (readingId) so it shows up again on the History page.
//
// Once the reading is done, the querent can ask up to MAX_FOLLOW_UPS
// follow-up questions; each turn replays the whole conversation (reading +
// prior follow-ups) back to the provider so answers stay in context. The
// follow-up Q&A is saved onto the same history entry.
export default function ReadWithApiPanel({
  prompt,
  readingId,
}: {
  prompt: string;
  readingId: string | null;
}) {
  const t = useTranslations("draw");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [state, setState] = useState<PanelState>("streaming");
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<ReadingApiErrorCode | null>(null);

  const [followUps, setFollowUps] = useState<ApiFollowUp[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [followUpState, setFollowUpState] = useState<FollowUpState>("idle");
  const [followUpErrorCode, setFollowUpErrorCode] = useState<ReadingApiErrorCode | null>(null);

  // Provider/model/key snapshot taken when the reading starts, reused for
  // every follow-up so the whole thread runs against one configuration.
  const configRef = useRef<{ provider: ApiProvider; model: string; apiKey: string } | null>(null);
  // The finished reading text, mirrored outside React state so the async
  // follow-up handler can read it without a stale closure.
  const readingTextRef = useRef("");
  const followUpsRef = useRef<ApiFollowUp[]>([]);
  const followUpControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Actually cancels the in-flight request on cleanup — without this, a
    // component remount (e.g. React Strict Mode's dev-only double-invoke of
    // this effect) leaves the first, throwaway attempt's fetch running for
    // real in the background. Both attempts then hit the provider for real,
    // and whichever settles last wins the UI state — so a genuinely
    // successful first response can silently lose to a failing duplicate.
    const controller = new AbortController();
    // Accumulated outside React state — `text` state updates are batched and
    // this closure's own `text` binding never changes, so reading it back
    // inside the .then() below would just see the stale mount-time value.
    let fullText = "";
    setText("");
    setState("streaming");
    setErrorCode(null);

    const config = getActiveConfig();
    if (!config) {
      setState("error");
      setErrorCode("network");
      return;
    }
    // The settings form resolves the model asynchronously after a key is
    // entered; if the user got here before that settled, fall back to the
    // provider's default rather than sending an empty model.
    const model = config.model.trim() || DEFAULT_MODELS[config.provider];
    // Snapshot the resolved config so every follow-up runs the same thread
    // against one provider/model/key.
    configRef.current = { provider: config.provider, model, apiKey: config.apiKey };

    streamReading(
      { provider: config.provider, model, apiKey: config.apiKey, prompt },
      (chunk) => {
        if (cancelled) return;
        fullText += chunk;
        setText((prev) => prev + chunk);
      },
      controller.signal,
    ).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTokenCount(result.usage.inputTokens + result.usage.outputTokens);
        setState("done");
        readingTextRef.current = fullText;
        if (readingId) updateReadingApiText(readingId, fullText);
      } else {
        setErrorCode(result.error);
        setState("error");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      followUpControllerRef.current?.abort();
    };
    // Runs once on mount — the provider/model/key snapshot is taken at the
    // moment the panel appears, matching a single reading request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitFollowUp() {
    const question = followUpInput.trim();
    const config = configRef.current;
    if (
      !question ||
      !config ||
      state !== "done" ||
      followUpState === "streaming" ||
      followUps.length >= MAX_FOLLOW_UPS
    ) {
      return;
    }

    const controller = new AbortController();
    followUpControllerRef.current = controller;
    setPendingQuestion(question);
    setFollowUpInput("");
    setFollowUpText("");
    setFollowUpErrorCode(null);
    setFollowUpState("streaming");

    const messages: ChatMessage[] = [
      { role: "user", content: prompt },
      { role: "assistant", content: readingTextRef.current },
      ...followUpsRef.current.flatMap((f): ChatMessage[] => [
        { role: "user", content: f.question },
        { role: "assistant", content: f.answer },
      ]),
      { role: "user", content: question },
    ];

    let answer = "";
    const result = await streamReading(
      { provider: config.provider, model: config.model, apiKey: config.apiKey, messages },
      (chunk) => {
        if (controller.signal.aborted) return;
        answer += chunk;
        setFollowUpText((prev) => prev + chunk);
      },
      controller.signal,
    );

    if (controller.signal.aborted || controller !== followUpControllerRef.current) return;

    if (result.ok && answer.trim().length > 0) {
      const next = [...followUpsRef.current, { question, answer }];
      followUpsRef.current = next;
      setFollowUps(next);
      setPendingQuestion("");
      setFollowUpText("");
      setFollowUpState("idle");
      if (readingId) updateReadingApiFollowUps(readingId, next);
    } else {
      setFollowUpErrorCode(result.ok ? "network" : result.error);
      setFollowUpText("");
      setFollowUpState("error");
    }
  }

  if (state === "error") {
    return (
      <p
        style={{
          marginTop: "clamp(16px, 3vh, 32px)",
          maxWidth: 640,
          marginLeft: "auto",
          marginRight: "auto",
          fontSize: 14,
          color: "var(--gold-200)",
          textAlign: "center",
        }}
      >
        {t(errorMessageKey(errorCode))}
      </p>
    );
  }

  const followUpsLeft = MAX_FOLLOW_UPS - followUps.length;
  const canAskMore = state === "done" && followUpsLeft > 0 && followUpState !== "streaming";

  return (
    <div
      style={{
        marginTop: "clamp(16px, 3vh, 32px)",
        maxWidth: 640,
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "left",
        background: "rgba(18, 26, 16, 0.55)",
        border: "1px solid rgba(231, 199, 137, 0.35)",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        padding: "clamp(20px, 4vw, 36px)",
        backdropFilter: "blur(2px)",
      }}
    >
      {state === "streaming" && text.length === 0 && (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--gold-200)",
            textAlign: "center",
          }}
        >
          {t("readingStreamingLabel")}
        </p>
      )}

      {text.length > 0 && <MarkdownReading text={text} tone="onDark" />}

      {state === "done" && tokenCount !== null && (
        <p
          style={{
            marginTop: 14,
            fontFamily: "var(--font-smallcaps)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            fontSize: 11,
            color: "var(--gold-300)",
            textAlign: "right",
          }}
        >
          {t("tokenCountFormat", { count: tokenCount.toLocaleString(locale) })}
        </p>
      )}

      {state === "done" && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(231,199,137,.28)" }}>
          {followUps.map((f, i) => (
            <FollowUpTurn key={i} question={f.question} answer={f.answer} label={t("followUpQuestionLabel")} />
          ))}

          {followUpState === "streaming" && (
            <div style={{ marginBottom: 18 }}>
              <FollowUpQuestion text={pendingQuestion} label={t("followUpQuestionLabel")} />
              {followUpText.length === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 15,
                    color: "var(--gold-200)",
                  }}
                >
                  {t("readingStreamingLabel")}
                </p>
              ) : (
                <MarkdownReading text={followUpText} tone="onDark" />
              )}
            </div>
          )}

          {followUpState === "error" && (
            <div style={{ marginBottom: 18 }}>
              <FollowUpQuestion text={pendingQuestion} label={t("followUpQuestionLabel")} />
              <p style={{ fontSize: 14, color: "var(--gold-200)" }}>{t(errorMessageKey(followUpErrorCode))}</p>
            </div>
          )}

          {canAskMore ? (
            <div>
              <label
                htmlFor="follow-up-input"
                style={{
                  display: "block",
                  fontFamily: "var(--font-smallcaps)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-wide)",
                  fontSize: 11,
                  color: "var(--gold-300)",
                  marginBottom: 8,
                }}
              >
                {t("followUpHeading")}
              </label>
              <textarea
                id="follow-up-input"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value.slice(0, FOLLOW_UP_MAX_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submitFollowUp();
                  }
                }}
                rows={2}
                placeholder={t("followUpPlaceholder")}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(251, 246, 234, 0.06)",
                  border: "1px solid rgba(231, 199, 137, 0.45)",
                  borderRadius: 8,
                  color: "var(--parchment-50)",
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 16,
                  lineHeight: 1.5,
                  padding: "12px 14px",
                  outline: "none",
                  resize: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    fontSize: 11,
                    color: "var(--gold-300)",
                  }}
                >
                  {t("followUpRemaining", { count: followUpsLeft })}
                </span>
                <button
                  type="button"
                  onClick={submitFollowUp}
                  disabled={!followUpInput.trim()}
                  style={{
                    cursor: followUpInput.trim() ? "pointer" : "not-allowed",
                    padding: "10px 22px",
                    borderRadius: 8,
                    border: "1px solid var(--gold-400)",
                    background: followUpInput.trim() ? "var(--gilt)" : "rgba(193,138,69,.25)",
                    color: followUpInput.trim() ? "var(--ink-900)" : "rgba(251,246,234,.55)",
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-caps)",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("followUpSendButton")}
                </button>
              </div>
            </div>
          ) : (
            state === "done" &&
            followUpsLeft === 0 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "var(--gold-300)",
                }}
              >
                {t("followUpLimitReached")}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

function FollowUpQuestion({ text, label }: { text: string; label: string }) {
  return (
    <>
      <p
        style={{
          fontFamily: "var(--font-smallcaps)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          fontSize: 11,
          color: "var(--gold-300)",
          margin: "0 0 4px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 17,
          lineHeight: 1.45,
          color: "var(--gold-200)",
          margin: "0 0 10px",
        }}
      >
        {text}
      </p>
    </>
  );
}

function FollowUpTurn({ question, answer, label }: { question: string; answer: string; label: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <FollowUpQuestion text={question} label={label} />
      <MarkdownReading text={answer} tone="onDark" />
    </div>
  );
}
