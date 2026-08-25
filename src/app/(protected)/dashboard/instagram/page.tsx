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
  Mic,
  Paperclip,
  Square,
  X as XIcon,
  Play,
  Pause,
  FileText,
  ChevronLeft,
  ImageIcon,
  Download,
  ZoomIn,
  InstagramIcon,
} from "lucide-react";

type Conversation = {
  id: string;
  igsid: string;
  username: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
};

type LeadInfo = {
  id: string;
  status: string;
  operadora_ofertada: string | null;
  valor_mensalidade: number | null;
};

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  error_message?: string | null;
  transcription?: string | null;
  filename?: string | null;
  timestamp: string;
};

const CONVERSATIONS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;
const ACCENT = "#E1306C";

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

function displayName(c: { username: string | null; igsid: string }) {
  return c.username ? `@${c.username}` : `Contato ${c.igsid.slice(-6)}`;
}

function initialsFor(name: string) {
  return name
    .replace(/^@/, "")
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

// O servidor transcodifica qualquer gravação pra ogg/opus antes de mandar (mesmo
// helper usado no áudio do WhatsApp), então aqui é só pegar o que o navegador
// consegue gravar nativamente.
const RECORDABLE_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
];

function pickSupportedAudioMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of RECORDABLE_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
}

function extensionForMime(mime: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("mpeg")) return "mp3";
  return "audio";
}

function formatRecordingTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function InstagramPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contactHeader, setContactHeader] = useState<{ username: string | null; igsid: string } | null>(
    null
  );
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [micMime, setMicMime] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMicMime(pickSupportedAudioMime());
  }, []);

  const authHeader = useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchConversations = useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/instagram/conversations", { headers });
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
        const res = await fetch(`/api/instagram/conversations/${conversationId}/messages`, {
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (selectedIdRef.current !== conversationId) return;
        setMessages(data.messages ?? []);
        setContactHeader({
          username: data.conversation?.username ?? null,
          igsid: data.conversation?.igsid ?? "",
        });
        setLeadInfo(data.lead ?? null);
      } catch {
        // silencioso — próximo polling tenta de novo
      }
    },
    [authHeader]
  );

  useEffect(() => {
    if (!firebaseUser) return;
    setLoadingConversations(true);
    fetchConversations().finally(() => setLoadingConversations(false));
    const interval = setInterval(fetchConversations, CONVERSATIONS_POLL_MS);
    return () => clearInterval(interval);
  }, [firebaseUser, fetchConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setContactHeader(null);
      setLeadInfo(null);
      return;
    }
    setLoadingMessages(true);
    fetchMessages(selectedId).finally(() => setLoadingMessages(false));

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
    return conversations.filter((c) => {
      const username = (c.username || "").toLowerCase();
      if (username.includes(q)) return true;
      if (c.igsid.includes(q)) return true;
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

  const selfInitials = useMemo(
    () => initialsFor(firebaseUser?.displayName || firebaseUser?.email || "Eu"),
    [firebaseUser]
  );

  const contactInitials = useMemo(
    () => initialsFor(contactHeader?.username ? `@${contactHeader.username}` : contactHeader?.igsid || ""),
    [contactHeader]
  );

  const handleTranscribed = useCallback((messageId: string, transcription: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, transcription } : m)));
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || !selectedId || sending) return;

    setSending(true);
    setInput("");
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/instagram/conversations/${selectedId}/messages`, {
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

  async function sendAudio(blob: Blob, filename: string) {
    if (!selectedId || uploadingAttachment) return;

    setUploadingAttachment(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const form = new FormData();
      form.append("file", blob, filename);

      const res = await fetch(`/api/instagram/conversations/${selectedId}/audio`, {
        method: "POST",
        headers,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar áudio");

      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, last_message_preview: "🎤 Áudio", last_message_at: data.message.timestamp }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar o áudio");
    } finally {
      setUploadingAttachment(false);
    }
  }

  function handleAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Áudio muito grande (máx. 16MB)");
      return;
    }
    void sendAudio(file, file.name);
  }

  async function sendMedia(file: File) {
    if (!selectedId || uploadingAttachment) return;

    setUploadingAttachment(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch(`/api/instagram/conversations/${selectedId}/media`, {
        method: "POST",
        headers,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar arquivo");

      const isImage = file.type.startsWith("image/");
      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                last_message_preview: isImage ? "📷 Foto" : `📎 ${file.name}`,
                last_message_at: data.message.timestamp,
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar o arquivo");
    } finally {
      setUploadingAttachment(false);
    }
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 4MB)");
      return;
    }
    void sendMedia(file);
  }

  function handleDocFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 4MB)");
      return;
    }
    void sendMedia(file);
  }

  async function startRecording() {
    if (!micMime || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: micMime });
      audioChunksRef.current = [];
      discardRecordingRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!discardRecordingRef.current && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: micMime });
          void sendAudio(blob, `audio-${Date.now()}.${extensionForMime(micMime)}`);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function stopRecordingAndSend() {
    discardRecordingRef.current = false;
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }

  function cancelRecording() {
    discardRecordingRef.current = true;
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
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
      const res = await fetch(`/api/instagram/conversations/${deleteTarget.id}`, {
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
        <div
          className={cn(
            "w-full md:w-[340px] shrink-0 md:border-r border-border flex-col bg-background",
            selectedId ? "hidden md:flex" : "flex"
          )}
        >
          <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/40">
            <div className="h-9 w-9 rounded-full bg-linear-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center">
              <InstagramIcon className="size-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Instagram</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Direct da equipe</p>
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
                    ? "Nenhuma conversa ainda. Mensagens recebidas no Instagram vão aparecer aqui."
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
                      "group w-full flex items-center gap-3 px-3 py-3 text-left border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/60",
                      active && "bg-muted"
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
                              c.unread_count > 0 ? "font-medium" : "text-muted-foreground"
                            )}
                            style={c.unread_count > 0 ? { color: ACCENT } : undefined}
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
                            <span
                              className="h-5 min-w-5 flex items-center justify-center rounded-full text-white text-[10px] font-semibold px-1.5"
                              style={{ backgroundColor: ACCENT }}
                            >
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
        <div
          className={cn(
            "flex-1 flex-col min-w-0 bg-muted/20",
            selectedId ? "flex" : "hidden md:flex"
          )}
        >
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <InstagramIcon className="size-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-2 px-2 md:px-4 py-2.5 border-b border-border bg-muted/40">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden size-9 shrink-0 text-foreground"
                  onClick={() => setSelectedId(null)}
                  aria-label="Voltar pra lista de conversas"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-semibold",
                    colorForSeed(selectedId)
                  )}
                >
                  {initialsFor(
                    contactHeader?.username ? `@${contactHeader.username}` : contactHeader?.igsid || ""
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {contactHeader?.username
                      ? `@${contactHeader.username}`
                      : `Contato ${contactHeader?.igsid?.slice(-6) || ""}`}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] text-muted-foreground truncate">Instagram Direct</p>
                    {leadInfo?.operadora_ofertada && (
                      <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium truncate max-w-40">
                        {leadInfo.operadora_ofertada}
                      </span>
                    )}
                    {leadInfo?.valor_mensalidade != null && (
                      <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground/70 font-medium">
                        {formatCurrency(leadInfo.valor_mensalidade)}
                      </span>
                    )}
                  </div>
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

              <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 space-y-1">
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
                          <MessageBubble
                            key={m.id}
                            message={m}
                            getAuthHeader={authHeader}
                            selfInitials={selfInitials}
                            contactInitials={contactInitials}
                            contactColor={colorForSeed(selectedId ?? "")}
                            onTranscribed={handleTranscribed}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="shrink-0 px-4 py-3 border-t border-border bg-muted/40">
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <input
                  ref={docFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleDocFileChange}
                />
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioFileChange}
                />
                {recording ? (
                  <div className="flex items-center gap-3 h-11">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 size-9 text-destructive hover:text-destructive"
                      title="Cancelar gravação"
                      onClick={cancelRecording}
                    >
                      <XIcon className="size-4" />
                    </Button>
                    <div className="flex-1 flex items-center gap-2 text-sm text-foreground">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                      Gravando {formatRecordingTime(recordingSeconds)}
                    </div>
                    <Button
                      onClick={stopRecordingAndSend}
                      size="icon"
                      className="shrink-0 size-11 rounded-full text-white shadow-sm"
                      style={{ backgroundColor: ACCENT }}
                      title="Parar e enviar"
                    >
                      <Square className="size-4 fill-current" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 size-11 text-muted-foreground hover:text-foreground rounded-full"
                          title="Anexar"
                          disabled={uploadingAttachment}
                        >
                          {uploadingAttachment ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Paperclip className="size-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="top">
                        <DropdownMenuItem onClick={() => imageFileInputRef.current?.click()}>
                          <ImageIcon className="size-3.5" />
                          Foto
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => docFileInputRef.current?.click()}>
                          <FileText className="size-3.5" />
                          Documento
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => audioFileInputRef.current?.click()}>
                          <Mic className="size-3.5" />
                          Áudio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite uma mensagem"
                      className="min-h-11 max-h-32 resize-none text-sm rounded-2xl bg-background"
                      rows={1}
                      disabled={sending || uploadingAttachment}
                    />
                    {input.trim() ? (
                      <Button
                        onClick={handleSend}
                        disabled={sending}
                        size="icon"
                        className="shrink-0 size-11 rounded-full text-white shadow-sm disabled:opacity-40"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </Button>
                    ) : (
                      <Button
                        onClick={startRecording}
                        disabled={uploadingAttachment || !micMime}
                        size="icon"
                        title={micMime ? "Gravar áudio" : "Seu navegador não grava áudio compatível — use o anexo"}
                        className="shrink-0 size-11 rounded-full text-white shadow-sm disabled:opacity-40"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {uploadingAttachment ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
                      </Button>
                    )}
                  </div>
                )}
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

const WAVEFORM_BARS = 42;

function extractPeaksFromAudioBuffer(buffer: AudioBuffer, bucketCount: number) {
  const channel = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / bucketCount));
  const peaks: number[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) sum += Math.abs(channel[start + j] || 0);
    peaks.push(sum / blockSize);
  }
  const max = Math.max(...peaks, 0.0001);
  return peaks.map((p) => 0.18 + (p / max) * 0.82);
}

function fallbackPeaks(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    peaks.push(0.25 + ((h % 1000) / 1000) * 0.7);
  }
  return peaks;
}

function VoiceAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className={cn(
        "relative shrink-0 flex size-8 items-center justify-center rounded-full text-white text-[10px] font-semibold",
        color
      )}
    >
      {initials}
      <span
        className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full ring-2 ring-background"
        style={{ backgroundColor: ACCENT }}
      >
        <Mic className="size-2.5 text-white" />
      </span>
    </div>
  );
}

function BubbleTail({ side, bubbleBg }: { side: "left" | "right"; bubbleBg: string }) {
  return (
    <span
      className={cn(
        "absolute bottom-0 h-3 w-3",
        side === "left"
          ? "-left-1.5 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
          : "-right-1.5 [clip-path:polygon(0_0,100%_100%,0_100%)]",
        bubbleBg
      )}
    />
  );
}

function MessageBubble({
  message,
  getAuthHeader,
  selfInitials,
  contactInitials,
  contactColor,
  onTranscribed,
}: {
  message: Message;
  getAuthHeader: () => Promise<Record<string, string> | null>;
  selfInitials: string;
  contactInitials: string;
  contactColor: string;
  onTranscribed: (messageId: string, transcription: string) => void;
}) {
  const isOutbound = message.direction === "OUTBOUND";
  const canPreview = !isOutbound; // mídia que a gente manda não tem URL de volta (ver lib/instagram.ts)
  const isAudio = message.type === "audio";
  const isImage = message.type === "image";
  const isDocument = message.type === "file";
  const isFixedWidth = isAudio || isImage || isDocument;
  const time = new Date(message.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const bubbleBg = isOutbound ? "text-white" : "bg-card text-foreground";

  return (
    <div
      className={cn(
        "flex",
        isAudio ? "items-start gap-1.5" : "",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      {isAudio && !isOutbound && <VoiceAvatar initials={contactInitials} color={contactColor} />}

      <div className={cn("relative", isFixedWidth ? "w-64 sm:w-72" : "max-w-[70%]")}>
        {!isOutbound && <BubbleTail side="left" bubbleBg="bg-card" />}
        <div
          className={cn(
            "relative rounded-lg text-sm leading-relaxed shadow-sm",
            bubbleBg,
            isImage ? "p-1" : "px-2.5 py-1.5",
            isOutbound ? "rounded-br-none" : "rounded-bl-none"
          )}
          style={isOutbound ? { backgroundColor: ACCENT } : undefined}
        >
          {isAudio ? (
            <>
              <AudioPlayer
                messageId={message.id}
                getAuthHeader={getAuthHeader}
                isOutbound={isOutbound}
                canPreview={canPreview}
                transcription={message.transcription}
                onTranscribed={onTranscribed}
              />
              <div
                className={cn(
                  "flex items-center justify-end gap-1 mt-1 text-[10px]",
                  isOutbound ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {time}
                {isOutbound && <StatusIcon status={message.status} />}
              </div>
            </>
          ) : isImage ? (
            <>
              <ImageMessage messageId={message.id} getAuthHeader={getAuthHeader} canPreview={canPreview} />
              {message.body && (
                <p className="whitespace-pre-wrap wrap-break-word px-1.5 pt-1.5 pr-10">
                  {message.body}
                </p>
              )}
              <div
                className={cn(
                  "flex items-center justify-end gap-1 px-1.5 pb-0.5 pt-1 text-[10px]",
                  isOutbound ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {time}
                {isOutbound && <StatusIcon status={message.status} />}
              </div>
            </>
          ) : isDocument ? (
            <>
              <DocumentMessage
                messageId={message.id}
                filename={message.filename || "arquivo"}
                getAuthHeader={getAuthHeader}
                canPreview={canPreview}
              />
              <div
                className={cn(
                  "flex items-center justify-end gap-1 mt-1 text-[10px]",
                  isOutbound ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {time}
                {isOutbound && <StatusIcon status={message.status} />}
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap wrap-break-word pr-10">{message.body}</p>
              <div
                className={cn(
                  "flex items-center gap-1 float-right -mb-1 ml-2 mt-1 text-[10px]",
                  isOutbound ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {time}
                {isOutbound && <StatusIcon status={message.status} />}
              </div>
            </>
          )}
        </div>
        {isOutbound && (
          <span
            className="absolute bottom-0 -right-1.5 h-3 w-3 [clip-path:polygon(0_0,100%_100%,0_100%)]"
            style={{ backgroundColor: ACCENT }}
          />
        )}
      </div>

      {isAudio && isOutbound && <VoiceAvatar initials={selfInitials} color="bg-neutral-700" />}
    </div>
  );
}

function AudioPlayer({
  messageId,
  getAuthHeader,
  isOutbound,
  canPreview,
  transcription,
  onTranscribed,
}: {
  messageId: string;
  getAuthHeader: () => Promise<Record<string, string> | null>;
  isOutbound: boolean;
  canPreview: boolean;
  transcription?: string | null;
  onTranscribed: (messageId: string, transcription: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(canPreview);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canPreview) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      const headers = await getAuthHeader();
      if (!headers) return;
      try {
        const res = await fetch(`/api/instagram/media/${messageId}`, { headers });
        if (!res.ok) throw new Error();
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(new Blob([arrayBuffer]));
        setSrc(objectUrl);

        try {
          const AudioCtx = window.AudioContext;
          const ctx = new AudioCtx();
          const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
          if (!cancelled) setPeaks(extractPeaksFromAudioBuffer(decoded, WAVEFORM_BARS));
          void ctx.close();
        } catch {
          if (!cancelled) setPeaks(fallbackPeaks(messageId, WAVEFORM_BARS));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, getAuthHeader, canPreview]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    const wave = waveRef.current;
    if (!el || !wave || !duration) return;
    const rect = wave.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  }

  async function handleTranscribe() {
    if (transcribing) return;
    setTranscribing(true);
    try {
      const headers = await getAuthHeader();
      if (!headers) return;
      const res = await fetch(`/api/instagram/messages/${messageId}/transcribe`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao transcrever");
      onTranscribed(messageId, data.transcription);
      setShowTranscript(true);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível transcrever o áudio");
    } finally {
      setTranscribing(false);
    }
  }

  if (!canPreview) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 text-xs w-full",
          isOutbound ? "text-white/90" : "text-muted-foreground"
        )}
      >
        <Mic className="size-3.5" />
        Áudio enviado
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground w-full">
        <Loader2 className="size-3.5 animate-spin" />
        Carregando áudio…
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="flex items-center gap-1.5 py-1.5 text-xs text-destructive w-full">
        <AlertCircle className="size-3.5" />
        Áudio indisponível
      </div>
    );
  }

  const progressRatio = duration ? currentTime / duration : 0;
  const bars = peaks ?? fallbackPeaks(messageId, WAVEFORM_BARS);
  const playedColor = isOutbound ? "bg-white" : "";
  const unplayedColor = isOutbound ? "bg-white/35" : "bg-black/15 dark:bg-white/25";
  const displaySeconds = currentTime > 0 ? currentTime : duration;

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className={cn(
            "shrink-0 flex items-center justify-center size-8 rounded-full shadow-sm",
            isOutbound ? "bg-white/20 text-white" : "text-white"
          )}
          style={!isOutbound ? { backgroundColor: ACCENT } : undefined}
          aria-label={playing ? "Pausar áudio" : "Tocar áudio"}
        >
          {playing ? (
            <Pause className="size-3.5 fill-current" />
          ) : (
            <Play className="size-3.5 fill-current ml-0.5" />
          )}
        </button>

        <div
          ref={waveRef}
          onClick={handleSeek}
          className="relative flex items-center gap-0.5 h-8 flex-1 cursor-pointer select-none"
        >
          {bars.map((h, i) => {
            const barRatio = (i + 0.5) / bars.length;
            const played = barRatio <= progressRatio;
            return (
              <span
                key={i}
                className={cn("w-[3px] rounded-full", played ? playedColor : unplayedColor)}
                style={played && !isOutbound ? { backgroundColor: ACCENT } : undefined}
              />
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between mt-0.5 pl-10",
          isOutbound && "text-white/80"
        )}
      >
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatRecordingTime(Math.floor(displaySeconds))}
        </span>

        {transcription ? (
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium underline decoration-dotted underline-offset-2",
              isOutbound ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-foreground"
            )}
          >
            <FileText className="size-3" />
            {showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
          </button>
        ) : (
          <button
            onClick={handleTranscribe}
            disabled={transcribing}
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium underline decoration-dotted underline-offset-2 disabled:opacity-50",
              isOutbound ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-foreground"
            )}
          >
            {transcribing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <FileText className="size-3" />
            )}
            {transcribing ? "Transcrevendo…" : "Ver transcrição"}
          </button>
        )}
      </div>

      {showTranscript && transcription && (
        <p
          className={cn(
            "mt-1.5 pl-2 text-xs italic border-l-2",
            isOutbound ? "text-white/90 border-white/30" : "text-foreground/80 border-foreground/20"
          )}
        >
          {transcription}
        </p>
      )}
    </div>
  );
}

function ImageMessage({
  messageId,
  getAuthHeader,
  canPreview,
}: {
  messageId: string;
  getAuthHeader: () => Promise<Record<string, string> | null>;
  canPreview: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(canPreview);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!canPreview) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      const headers = await getAuthHeader();
      if (!headers) return;
      try {
        const res = await fetch(`/api/instagram/media/${messageId}`, { headers });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, getAuthHeader, canPreview]);

  if (!canPreview) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 h-32 w-full rounded-md bg-black/10 text-white/90">
        <ImageIcon className="size-6" />
        <span className="text-xs">Foto enviada</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 w-full rounded-md bg-black/5 dark:bg-white/5 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 h-40 w-full rounded-md bg-black/5 dark:bg-white/5 text-muted-foreground">
        <ImageIcon className="size-6" />
        <span className="text-xs">Imagem indisponível</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="group relative block w-full overflow-hidden rounded-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Imagem" className="w-full max-h-72 object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <ZoomIn className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </span>
      </button>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton
          className="max-w-[95vw] sm:max-w-3xl p-0 bg-transparent border-0 shadow-none"
        >
          <DialogTitle className="sr-only">Imagem</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Imagem" className="w-full max-h-[85vh] object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentMessage({
  messageId,
  filename,
  getAuthHeader,
  canPreview,
}: {
  messageId: string;
  filename: string;
  getAuthHeader: () => Promise<Record<string, string> | null>;
  canPreview: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading || !canPreview) return;
    setDownloading(true);
    try {
      const headers = await getAuthHeader();
      if (!headers) return;
      const res = await fetch(`/api/instagram/media/${messageId}`, { headers });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar o arquivo");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading || !canPreview}
      className="flex items-center gap-2.5 w-full text-left disabled:opacity-80 disabled:cursor-default"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/10 dark:bg-white/10">
        {downloading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename}</p>
        <p className="text-[11px] flex items-center gap-1 opacity-80">
          {canPreview ? (
            <>
              <Download className="size-3" />
              Toque para baixar
            </>
          ) : (
            "Arquivo enviado"
          )}
        </p>
      </div>
    </button>
  );
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "READ") return <CheckCheck className="size-3.5 text-blue-300" />;
  if (status === "DELIVERED") return <CheckCheck className="size-3.5" />;
  if (status === "SENT") return <Check className="size-3.5" />;
  if (status === "FAILED") return <AlertCircle className="size-3.5 text-destructive" />;
  return <Clock className="size-3.5" />;
}
