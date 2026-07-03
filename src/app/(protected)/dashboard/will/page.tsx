"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  User,
  Sparkles,
  RotateCcw,
  Mic,
  Volume2,
  VolumeX,
  TrendingUp,
  DollarSign,
  BarChart2,
  GitCompare,
} from "lucide-react";
import { useVoice, speak, stopSpeaking } from "@/hooks/useVoice";
import { VoiceRecordingBar } from "@/components/VoiceRecordingBar";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_QUESTIONS = [
  { q: "Quantos leads fechei mês passado?", icon: TrendingUp },
  { q: "Qual minha comissão este mês?", icon: DollarSign },
  { q: "Quais são minhas principais origens de leads?", icon: BarChart2 },
  { q: "Compare minha performance deste mês com o mês passado.", icon: GitCompare },
];

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Olá! Sou o **Will**, seu assistente de IA no WinLeads. Tenho acesso aos dados da sua conta e posso te ajudar a entender sua performance, leads, vendas e comissões. O que você quer saber?",
};

export default function WillPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { listening, start, stop, supported: voiceSupported } = useVoice({
    onTranscript: (text) => sendMessage(text),
  });

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
      const history = newMessages.slice(1, -1);

      const res = await fetch("/api/Will", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (ttsEnabled) speak(data.reply);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, tive um problema ao processar sua pergunta. Tente novamente." },
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
    stopSpeaking();
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    textareaRef.current?.focus();
  }

  const showSuggestions = messages.length === 1;

  if (loadingAuth) return null;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100svh-3.5rem)] relative overflow-hidden">

        {/* Ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 -z-10 overflow-hidden">
          <div className="absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-emerald-500/8 blur-3xl" />
          <div className="absolute -top-28 right-1/4 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
        </div>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm leading-tight tracking-tight">Will</p>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Assistente IA · dados da sua conta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setTtsEnabled((v) => !v); if (ttsEnabled) stopSpeaking(); }}
              className={cn(
                "gap-1.5 text-xs h-8 px-3 rounded-lg",
                ttsEnabled
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={ttsEnabled ? "Desativar voz" : "Ativar voz do Will"}
            >
              {ttsEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              <span className="hidden sm:inline">{ttsEnabled ? "Voz ativa" : "Voz"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-xs h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Nova conversa</span>
            </Button>
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-6 px-4 lg:px-6">
          <div className="max-w-3xl mx-auto space-y-5">

            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}

            {/* Sugestões de perguntas */}
            {showSuggestions && (
              <div className="space-y-3 mt-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="size-3" />
                  Sugestões rápidas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_QUESTIONS.map(({ q, icon: Icon }) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                      className="group relative flex items-center gap-3 text-left text-xs rounded-xl border border-muted-foreground/10 bg-card px-4 py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/30 transition-all duration-200 disabled:opacity-50 overflow-hidden"
                    >
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                        <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-medium text-foreground leading-snug">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && <TypingIndicator />}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 lg:px-6 py-4 border-t border-border bg-background/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto space-y-2">
            {listening ? (
              <VoiceRecordingBar onStop={stop} size="md" />
            ) : (
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte algo sobre sua conta… (Enter para enviar)"
                  className="min-h-11 max-h-32 resize-none text-sm rounded-xl border-muted-foreground/20 bg-background focus-visible:ring-emerald-500/30"
                  rows={1}
                  disabled={loading || !firebaseUser}
                />
                {voiceSupported && (
                  <Button
                    onClick={start}
                    disabled={loading || !firebaseUser}
                    size="icon"
                    variant="outline"
                    className="shrink-0 size-11 rounded-xl border-muted-foreground/20 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                    title="Falar com o Will"
                  >
                    <Mic className="size-4" />
                  </Button>
                )}
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading || !firebaseUser}
                  size="icon"
                  className="shrink-0 size-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            )}
            <p className="text-center text-[10px] text-muted-foreground/60">
              {listening
                ? "Fale agora — para automaticamente ao terminar"
                : "Shift+Enter para nova linha · Enter para enviar"}
            </p>
          </div>
        </div>

      </div>
    </Layout>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl ring-1",
        isUser
          ? "bg-primary/10 ring-primary/20 text-primary"
          : "bg-emerald-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      )}>
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border border-muted-foreground/10 text-foreground rounded-tl-sm"
      )}>
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

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400">
        <Bot className="size-4" />
      </div>
      <div className="bg-card border border-muted-foreground/10 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="size-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
