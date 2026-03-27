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
  "Explain the 2026 REBUILT game and how scoring works",
  "Show me Team 7729's events and rankings this season",
  "What's the best autonomous strategy for REBUILT?",
  "How do I write a WPILib Java command for a shooter subsystem?",
  "Help me tune a PID loop for my drivetrain",
  "What are the alliance selection rules for REBUILT?",
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
              <h2 className="text-3xl font-black text-rams-yellow tracking-tight">
                RAMS AI
              </h2>
              <p className="text-white/50 max-w-md text-sm">
                FRC Team 7729 assistant — ask about{" "}
                <span className="text-rams-yellow">REBUILT</span>, match data,
                robot programming, and strategy.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSubmit(undefined, prompt)}
                  className="text-left p-3 rounded-lg border border-[#222] bg-[#111] hover:border-rams-yellow hover:bg-[#1a1a1a] transition-all text-sm text-white/60 hover:text-white"
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
                  ? "bg-rams-yellow text-black font-medium rounded-2xl rounded-tr-sm px-4 py-3"
                  : "bg-[#111] text-white rounded-2xl rounded-tl-sm px-4 py-3 border border-[#222]"
              }`}
            >
              {msg.role === "assistant" && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.toolsUsed.map((tool, ti) => (
                    <span
                      key={ti}
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-rams-yellow/10 text-rams-yellow border border-rams-yellow/30"
                    >
                      {tool}
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
                            className="bg-black rounded px-1 py-0.5 text-rams-yellow text-xs border border-[#333]"
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
            <div className="bg-[#111] border border-[#222] rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingIndicator tools={activeTools} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#222] px-4 py-4 bg-black">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about REBUILT rules, match data, robot code..."
            rows={1}
            className="flex-1 bg-[#111] text-white placeholder-white/30 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-rams-yellow border border-[#222] focus:border-transparent min-h-[48px] max-h-[160px]"
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
            className="bg-rams-yellow hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl px-5 py-3 transition-colors min-h-[48px]"
          >
            {loading ? <Spinner /> : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
  );
}

function TypingIndicator({ tools }: { tools: string[] }) {
  if (tools.length > 0) {
    return (
      <p className="text-sm text-rams-yellow animate-pulse">
        Fetching {tools[tools.length - 1]}...
      </p>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 bg-rams-yellow rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-rams-yellow rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-rams-yellow rounded-full animate-bounce" />
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Tba", "TBA");
}
