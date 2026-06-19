"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Eraser, MessageCircle, Sparkles } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { TypewriterMarkdown } from "@/components/ui/typewriter";
import { chat as chatApi, ApiError } from "@/lib/api";
import { useLocalStorage } from "@/lib/storage";
import type { Translator } from "@/lib/i18n";
import type { ChatMessage, TranslateResult } from "@/lib/types";

/**
 * Follow-up chat. Anchored to the current document — every turn sends the
 * brief, explanation, and source text plus the prior conversation, so the
 * model answers from what ClarityAI actually read. The conversation is kept in
 * localStorage (device-only) keyed by the dashboard session, so it survives a
 * refresh. Assistant replies stream in with a typewriter effect; only the
 * just-received reply animates (restored ones render instantly).
 */
export function ChatView({
  result,
  language,
  storageKey,
  t,
}: {
  result: TranslateResult;
  language: string;
  storageKey: string;
  t: Translator;
}) {
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(
    `clarityai.chat.${storageKey}`,
    [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Index of the message that should animate (the latest answer). Restored
  // messages render instantly.
  const [animateIndex, setAnimateIndex] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    setError("");
    const prior = messages; // conversation before this turn (for the model)
    const withUser = [...messages, { role: "user" as const, content: q }];
    setMessages(withUser);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);

    try {
      const answer = await chatApi({
        question: q,
        documentBrief: result.plain_language_brief,
        documentExplanation: result.plain_language_explanation_markdown,
        sourceText: result.source_text,
        history: prior,
        language,
        detectedLocation: result.detected_location ?? "",
      });
      const finalMessages = [...withUser, { role: "assistant" as const, content: answer }];
      setMessages(finalMessages);
      setAnimateIndex(finalMessages.length - 1);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 503
          ? t("chat_not_configured")
          : t("chat_error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function clearChat() {
    setMessages([]);
    setAnimateIndex(null);
    setError("");
  }

  const isEmpty = messages.length === 0;
  const suggestions = [t("chat_suggest_1"), t("chat_suggest_2"), t("chat_suggest_3")];

  return (
    <div className="flex h-full flex-col">
      {/* Intro / header */}
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          <MessageCircle className="mr-1.5 inline h-4 w-4 -translate-y-0.5 text-primary" />
          {t("chat_intro")}
        </p>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearChat}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Eraser className="h-3.5 w-3.5" /> {t("chat_clear")}
          </button>
        )}
      </div>

      {/* Messages — scrollable, fills remaining height */}
      <div className="scroll-clay min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 pb-4">
          {isEmpty && !loading && (
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> {t("chat_try_asking")}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-clay-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground shadow-clay-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] rounded-lg rounded-bl-sm border border-border bg-card px-3.5 py-2 shadow-clay-sm">
                  <TypewriterMarkdown
                    text={m.content}
                    animate={i === animateIndex}
                    onTick={scrollToBottom}
                  />
                </div>
              </div>
            ),
          )}

          {/* Thinking indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-1.5 rounded-lg rounded-bl-sm border border-border bg-card px-4 py-3 shadow-clay-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-sm text-amber-800">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer — always pinned to the bottom, never scrolls away.
          On mobile the fixed bottom-nav sits ~5rem from the bottom of the
          viewport, so we add matching padding so the input floats above it. */}
      <div className="shrink-0 pb-24 pt-3 lg:pb-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-clay-sm focus-within:border-primary/50">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={autoGrow}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={t("chat_placeholder")}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label={t("chat_send")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-clay-primary transition-all active:translate-y-0.5 disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-xs text-muted-foreground">{t("chat_disclaimer")}</p>
      </div>
    </div>
  );
}
