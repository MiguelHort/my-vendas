"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  MessageCircleOff,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Search,
  MoreVertical,
  Trash2,
  ShieldAlert,
} from "lucide-react";
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

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-600",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
];

function colorForSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function displayName(c: { contact_name: string | null; wa_id: string }) {
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

function listTimestamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Ontem";

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) {
    const label = d.toLocaleDateString("pt-BR", { weekday: "short" });
    return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
  }
  return d.toLocaleDateString("pt-BR");
}

function dayDividerLabel(date: Date) {
  const now = new Date();
  if (isSameDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ConversasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contactHeader, setContactHeader] = useState<{ name: string | null; wa_id: string } | null>(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    const qDigits = q.replace(/\D/g, "");
    return conversations.filter((c) => {
      const name = (c.contact_name || "").toLowerCase();
      if (name.includes(q)) return true;
      if (qDigits && c.wa_id.includes(qDigits)) return true;
      return false;
    });
  }, [conversations, search]);

  const groupedMessages = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    for (const m of messages) {
      const label = dayDividerLabel(new Date(m.timestamp));
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(m);
      } else {
        groups.push({ label, items: [m] });
      }
    }
    return groups;
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
      toast.error("Não foi possível enviar a mensagem");
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

  function openDeleteDialog(c: Conversation) {
    setDeleteTarget(c);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    if (!deletePassword) {
      setDeleteError("Digite sua senha pra confirmar");
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/whatsapp/conversations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Erro ao excluir conversa");
        return;
      }

      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      toast.success("Conversa excluída");
      setDeleteTarget(null);
      setDeletePassword("");
    } catch (err) {
      console.error(err);
      setDeleteError("Erro ao excluir conversa");
    } finally {
      setDeleting(false);
    }
  }

  if (loadingAuth) return null;

  return (
    <Layout fullWidth>
      <div className="flex h-[calc(100svh-5.5rem)] rounded-xl border border-border overflow-hidden shadow-sm">
        {/* ── Lista de conversas ─────────────────────────────── */}
        <div className="w-[340px] shrink-0 border-r border-border flex flex-col bg-background">
          <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33]">
            <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center">
              <WhatsAppIcon className="size-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Conversas</p>
              <p className="text-[11px] text-muted-foreground leading-tight">WhatsApp da equipe</p>
            </div>
          </div>

          <div className="shrink-0 px-3 py-2 border-b border-border bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar conversa"
                className="h-9 pl-9 rounded-full bg-muted/60 border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center text-muted-foreground">
                <MessageCircleOff className="size-6" />
                <p className="text-xs">
                  {conversations.length === 0
                    ? "Nenhuma conversa ainda. Mensagens recebidas no WhatsApp vão aparecer aqui."
                    : "Nenhuma conversa encontrada."}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const name = displayName(c);
                const active = c.id === selectedId;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(c.id)}
                    className={cn(
                      "group w-full flex items-center gap-3 px-3 py-3 text-left border-b border-border/60 cursor-pointer transition-colors hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942]/60",
                      active && "bg-[#f0f2f5] dark:bg-[#2a3942]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full text-white text-xs font-semibold",
                        colorForSeed(c.id)
                      )}
                    >
                      {initialsFor(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {c.last_message_at && (
                          <span
                            className={cn(
                              "text-[10.5px] shrink-0",
                              c.unread_count > 0
                                ? "text-[#00a884] font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {listTimestamp(c.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {c.last_message_preview || "—"}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {c.unread_count > 0 && (
                            <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-[#00a884] text-white text-[10px] font-semibold px-1.5">
                              {c.unread_count}
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-full p-1 hover:bg-muted transition-opacity"
                                aria-label="Mais opções"
                              >
                                <MoreVertical className="size-3.5 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openDeleteDialog(c)}
                              >
                                <Trash2 className="size-3.5" />
                                Excluir conversa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Thread ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a]">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <WhatsAppIcon className="size-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-[#f0f2f5] dark:bg-[#202c33]">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-semibold",
                    colorForSeed(selectedId)
                  )}
                >
                  {initialsFor(
                    contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {contactHeader?.wa_id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  title="Excluir conversa"
                  onClick={() => {
                    const c = conversations.find((x) => x.id === selectedId);
                    if (c) openDeleteDialog(c);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div
                className="flex-1 overflow-y-auto px-4 md:px-10 py-4 space-y-1"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.035) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              >
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.label}>
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] font-medium text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow-sm">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((m) => (
                          <MessageBubble key={m.id} message={m} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="shrink-0 px-4 py-3 border-t border-border bg-[#f0f2f5] dark:bg-[#202c33]">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem"
                    className="min-h-11 max-h-32 resize-none text-sm rounded-2xl bg-background"
                    rows={1}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    size="icon"
                    className="shrink-0 size-11 rounded-full bg-[#00a884] hover:bg-[#029074] text-white shadow-sm disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Diálogo de confirmação (senha) ─────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
            setDeletePassword("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <DialogTitle>Excluir conversa</DialogTitle>
            </div>
            <DialogDescription>
              Isso vai apagar permanentemente todo o histórico da conversa com{" "}
              <strong>{deleteTarget ? displayName(deleteTarget) : ""}</strong>. Essa ação não pode
              ser desfeita. Digite sua senha pra confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Sua senha"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
              disabled={deleting}
            />
            {deleteError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {deleteError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeletePassword("");
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "OUTBOUND";
  const time = new Date(message.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const bubbleBg = isOutbound
    ? "bg-[#d9fdd3] dark:bg-[#005c4b]"
    : "bg-white dark:bg-[#1f2c34]";

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div className="relative max-w-[70%]">
        {!isOutbound && (
          <span
            className={cn(
              "absolute -left-[6px] bottom-0 h-3 w-3 [clip-path:polygon(100%_0,100%_100%,0_100%)]",
              bubbleBg
            )}
          />
        )}
        <div
          className={cn(
            "relative rounded-lg px-2.5 py-1.5 text-sm leading-relaxed shadow-sm text-foreground",
            bubbleBg,
            isOutbound ? "rounded-br-none" : "rounded-bl-none"
          )}
        >
          <p className="whitespace-pre-wrap wrap-break-word pr-10">{message.body}</p>
          <div
            className={cn(
              "flex items-center gap-1 float-right -mb-1 ml-2 mt-1 text-[10px] text-muted-foreground"
            )}
          >
            {time}
            {isOutbound && <StatusIcon status={message.status} />}
          </div>
        </div>
        {isOutbound && (
          <span
            className={cn(
              "absolute -right-[6px] bottom-0 h-3 w-3 [clip-path:polygon(0_0,100%_100%,0_100%)]",
              bubbleBg
            )}
          />
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "READ") return <CheckCheck className="size-3.5 text-[#53bdeb]" />;
  if (status === "DELIVERED") return <CheckCheck className="size-3.5" />;
  if (status === "SENT") return <Check className="size-3.5" />;
  if (status === "FAILED") return <AlertCircle className="size-3.5 text-destructive" />;
  return <Clock className="size-3.5" />;
}
