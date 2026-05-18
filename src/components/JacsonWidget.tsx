"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, X, Send, Maximize2, RotateCcw, User, Mic, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useVoice, speak, stopSpeaking } from "@/hooks/useVoice";
import { VoiceRecordingBar } from "@/components/VoiceRecordingBar";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Olá! Sou o **Jacson**. Pergunte qualquer coisa sobre seus leads ou sua performance.",
};

export function JacsonWidget() {
  const [firebaseUser] = useAuthState(auth);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { listening, start, stop, supported: voiceSupported } = useVoice({
    onTranscript: (text) => sendMessage(text),
  });

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, messages, loading]);

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
      const history = newMessages.slice(1, -1);

      const res = await fetch("/api/jacson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (ttsEnabled) speak(data.reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tive um problema. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleReset() {
    stopSpeaking();
    setMessages([WELCOME]);
    setInput("");
  }

  return (
    <>
      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-20 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200 origin-bottom-right",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
        style={{ height: "480px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40 rounded-t-2xl shrink-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
            <Bot className="size-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Jacson</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Assistente IA</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg"
              onClick={() => { setTtsEnabled((v) => !v); if (ttsEnabled) stopSpeaking(); }}
              title={ttsEnabled ? "Desativar voz" : "Ativar voz do Jacson"}
            >
              {ttsEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5 text-muted-foreground" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg"
              onClick={handleReset}
              title="Nova conversa"
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Link href="/dashboard/jacson">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg"
                title="Abrir em tela cheia"
                onClick={() => setOpen(false)}
              >
                <Maximize2 className="size-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg, i) => (
            <WidgetBubble key={i} message={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                <Bot className="size-3.5 text-white" />
              </div>
              <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1 items-center h-3.5">
                  <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-3 py-3 border-t border-border">
          {listening ? (
            <VoiceRecordingBar onStop={stop} size="sm" />
          ) : (
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre seus leads..."
                className="min-h-[38px] max-h-24 resize-none text-sm"
                rows={1}
                disabled={loading || !firebaseUser}
              />
              {voiceSupported && (
                <Button
                  onClick={start}
                  disabled={loading || !firebaseUser}
                  size="icon"
                  variant="outline"
                  className="shrink-0 size-9 rounded-xl"
                  title="Falar"
                >
                  <Mic className="size-3.5" />
                </Button>
              )}
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading || !firebaseUser}
                size="icon"
                className="shrink-0 size-9 rounded-xl"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
          open && "rotate-12"
        )}
        title="Jacson IA"
        aria-label="Abrir assistente Jacson"
      >
        {open ? (
          <X className="size-5 text-white" />
        ) : (
          <Bot className="size-5 text-white" />
        )}
      </button>
    </>
  );
}

function WidgetBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
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
