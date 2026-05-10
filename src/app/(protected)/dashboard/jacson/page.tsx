"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, Send, User, Sparkles, RotateCcw } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_QUESTIONS = [
  "Quantos leads fechei mês passado?",
  "Qual minha comissão este mês?",
  "Quais são minhas principais origens de leads?",
  "Compare minha performance deste mês com o mês passado.",
];

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Olá! Sou o **Jacson**, seu assistente de IA no WinLeads. Tenho acesso aos dados da sua conta e posso te ajudar a entender sua performance, leads, vendas e comissões. O que você quer saber?",
};

export default function JacsonPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !firebaseUser) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const token = await firebaseUser.getIdToken();
      const history = newMessages.slice(1, -1); // exclude welcome + current

      const res = await fetch("/api/jacson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Desculpe, tive um problema ao processar sua pergunta. Tente novamente.",
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleReset() {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    textareaRef.current?.focus();
  }

  const showSuggestions = messages.length === 1;

  if (loadingAuth) return null;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100svh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
              <Bot className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Jacson</p>
              <p className="text-xs text-muted-foreground leading-tight">
                Assistente IA — dados da sua conta
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline text-xs">Nova conversa</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}

          {/* Suggested questions */}
          {showSuggestions && (
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3" />
                Sugestões
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-colors text-left disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 lg:px-6 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo sobre sua conta... (Enter para enviar)"
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
              disabled={loading || !firebaseUser}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || !firebaseUser}
              size="icon"
              className="shrink-0 size-11 rounded-xl"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Shift+Enter para nova linha · Enter para enviar
          </p>
        </div>
      </div>
    </Layout>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
        )}
      >
        {isUser ? (
          <User className="size-4" />
        ) : (
          <Bot className="size-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}
      >
        <FormattedText content={message.content} />
      </div>
    </div>
  );
}

function FormattedText({ content }: { content: string }) {
  // Very light markdown: bold (**text**) and line breaks
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ));
      })}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
        <Bot className="size-4" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
          <span className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
          <span className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
