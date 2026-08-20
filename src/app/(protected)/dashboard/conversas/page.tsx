"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Loader2, MessageCircleOff, Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsappIcon";

type Conversation = {
  id: string;
  wa_id: string;
  contact_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
};

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  error_message?: string | null;
  timestamp: string;
};

const CONVERSATIONS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;

function displayName(c: Conversation) {
  return c.contact_name || formatPhoneNumber(c.wa_id.replace(/^55/, ""));
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ConversasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contactHeader, setContactHeader] = useState<{ name: string | null; wa_id: string } | null>(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const authHeader = useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchConversations = useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/whatsapp/conversations", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // silencioso — próximo polling tenta de novo
    }
  }, [authHeader]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      const headers = await authHeader();
      if (!headers) return;
      try {
        const res = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`, {
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (selectedIdRef.current !== conversationId) return;
        setMessages(data.messages ?? []);
        setContactHeader({
          name: data.conversation?.contact_name ?? null,
          wa_id: data.conversation?.wa_id ?? "",
        });
      } catch {
        // silencioso — próximo polling tenta de novo
      }
    },
    [authHeader]
  );

  // Lista de conversas: carga inicial + polling
  useEffect(() => {
    if (!firebaseUser) return;
    setLoadingConversations(true);
    fetchConversations().finally(() => setLoadingConversations(false));
    const interval = setInterval(fetchConversations, CONVERSATIONS_POLL_MS);
    return () => clearInterval(interval);
  }, [firebaseUser, fetchConversations]);

  // Thread selecionada: carga inicial + polling
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setContactHeader(null);
      return;
    }
    setLoadingMessages(true);
    fetchMessages(selectedId).finally(() => setLoadingMessages(false));

    // zera badge de não lidas localmente pra resposta imediata
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
    );

    const interval = setInterval(() => fetchMessages(selectedId), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !selectedId || sending) return;

    setSending(true);
    setInput("");
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/whatsapp/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");

      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, last_message_preview: text, last_message_at: data.message.timestamp }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loadingAuth) return null;

  return (
    <Layout fullWidth>
      <div className="flex h-[calc(100svh-5.5rem)] rounded-xl border border-border overflow-hidden bg-card">
        {/* ── Lista de conversas ─────────────────────────────── */}
        <div className="w-80 shrink-0 border-r border-border flex flex-col">
          <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
              <WhatsAppIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Conversas</p>
              <p className="text-[11px] text-muted-foreground leading-tight">WhatsApp da equipe</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center text-muted-foreground">
                <MessageCircleOff className="size-6" />
                <p className="text-xs">Nenhuma conversa ainda. Mensagens recebidas no WhatsApp vão aparecer aqui.</p>
              </div>
            ) : (
              conversations.map((c) => {
                const name = displayName(c);
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/60 transition-colors hover:bg-muted/60",
                      active && "bg-muted"
                    )}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                      {initialsFor(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {c.last_message_at && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(c.last_message_at), {
                              locale: ptBR,
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate">
                          {c.last_message_preview || "—"}
                        </p>
                        {c.unread_count > 0 && (
                          <Badge className="h-5 min-w-5 justify-center rounded-full bg-emerald-600 text-white shrink-0 px-1.5">
                            {c.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Thread ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <WhatsAppIcon className="size-10 opacity-30" />
              <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  {initialsFor(contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || ""))}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {contactHeader?.wa_id}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-muted/20">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} message={m} />)
                )}
                <div ref={bottomRef} />
              </div>

              <div className="shrink-0 px-4 py-3 border-t border-border">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem… (Enter para enviar)"
                    className="min-h-11 max-h-32 resize-none text-sm rounded-xl"
                    rows={1}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    size="icon"
                    className="shrink-0 size-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "OUTBOUND";
  const time = new Date(message.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
          isOutbound
            ? "bg-emerald-600 text-white rounded-br-sm"
            : "bg-card border border-muted-foreground/10 text-foreground rounded-bl-sm"
        )}
      >
        <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1 text-[10px]",
            isOutbound ? "text-emerald-50/80" : "text-muted-foreground"
          )}
        >
          {time}
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "READ") return <CheckCheck className="size-3" />;
  if (status === "DELIVERED") return <CheckCheck className="size-3 opacity-70" />;
  if (status === "SENT") return <Check className="size-3 opacity-70" />;
  if (status === "FAILED") return <AlertCircle className="size-3 text-red-300" />;
  return <Clock className="size-3 opacity-70" />;
}
