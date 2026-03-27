"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type MessageRole = "user" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
  toolsUsed?: string[];
}

interface StreamEvent {
  type: "text" | "tool_use" | "tool_result" | "done" | "error";
  text?: string;
  name?: string;
  id?: string;
  result?: string;
  message?: string;
}

const SUGGESTED_PROMPTS = [
  "What are the scoring rules for the 2025 FRC season (REEFSCAPE)?",
  "Show me Team 7729's recent events and results",
  "How do I write a basic autonomous routine in WPILib Java?",
  "Explain PID tuning for a drivetrain",
  "What's the best strategy for the Coral placement game piece?",
  "Help me set up PathPlanner for autonomous paths",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e?: FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const query = overrideInput ?? input;
    if (!query.trim() || loading) return;

    const userMessage: Message = { role: "user", content: query };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setActiveTools([]);

    // Build API messages (exclude toolsUsed metadata)
    const apiMessages = newMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    let assistantText = "";
    const toolsUsed: string[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", toolsUsed: [] },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          const event: StreamEvent = JSON.parse(raw);

          if (event.type === "text" && event.text) {
            assistantText += event.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantText,
                toolsUsed: [...toolsUsed],
              };
              return updated;
            });
          } else if (event.type === "tool_use" && event.name) {
            const toolLabel = formatToolName(event.name);
            toolsUsed.push(toolLabel);
            setActiveTools([...toolsUsed]);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                toolsUsed: [...toolsUsed],
              };
              return updated;
            });
          } else if (event.type === "error") {
            assistantText += `\n\n*Error: ${event.message}*`;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantText,
                toolsUsed: [...toolsUsed],
              };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setLoading(false);
      setActiveTools([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-8">
            <div className="text-center space-y-3">
              <div className="text-6xl font-bold text-rams-red drop-shadow-lg">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-white">
                Welcome to RAMS AI
              </h2>
              <p className="text-gray-400 max-w-md">
                Your FRC assistant for Team 7729. Ask me about game rules,
                match data, robot programming, and strategy.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSubmit(undefined, prompt)}
                  className="text-left p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-rams-red hover:bg-gray-800 transition-all text-sm text-gray-300 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] ${
                msg.role === "user"
                  ? "bg-rams-red text-white rounded-2xl rounded-tr-sm px-4 py-3"
                  : "bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3"
              }`}
            >
              {msg.role === "assistant" && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.toolsUsed.map((tool, ti) => (
                    <span
                      key={ti}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rams-gold/20 text-rams-gold border border-rams-gold/30"
                    >
                      <span>⚡</span> {tool}
                    </span>
                  ))}
                </div>
              )}
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match;
                        return isInline ? (
                          <code
                            className="bg-gray-700 rounded px-1 py-0.5 text-rams-gold text-xs"
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-lg !my-2 !text-sm"
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {loading && i === messages.length - 1 && msg.content === "" && (
                    <TypingIndicator tools={activeTools} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingIndicator tools={activeTools} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 px-4 py-4 bg-rams-darker">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about FRC rules, match data, robot code..."
            rows={1}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-rams-red border border-gray-700 focus:border-transparent min-h-[48px] max-h-[160px]"
            style={{
              height: "auto",
              overflowY: input.split("\n").length > 4 ? "auto" : "hidden",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-rams-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 font-semibold transition-colors flex items-center gap-2 min-h-[48px]"
          >
            {loading ? (
              <span className="animate-spin text-lg">⟳</span>
            ) : (
              <span>Send</span>
            )}
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-2 text-center">
          RAMS AI · FRC Team 7729 · Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function TypingIndicator({ tools }: { tools: string[] }) {
  if (tools.length > 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-rams-gold">
        <span className="animate-pulse">⚡</span>
        <span>Fetching {tools[tools.length - 1]}...</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Tba", "TBA");
}
