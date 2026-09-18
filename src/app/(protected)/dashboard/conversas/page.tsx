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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tag as TagIcon,
  ListFilter,
  ClipboardList,
  CircleDot,
  FileStack,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsappIcon";
import { NECESSIDADE_PRINCIPAL_LABEL } from "@/lib/quiz/definition";
import { translateWhatsAppErrorTitle } from "@/lib/whatsappErrors";

type Tag = { id: string; name: string; color: string };

type Conversation = {
  id: string;
  wa_id: string;
  contact_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  tags: Tag[];
};

type LeadInfo = {
  id: string;
  status: string;
  operadora_ofertada: string | null;
  valor_mensalidade: number | null;
  tags: Tag[];
};

type QuizAnswer = { step: string; question: string; answer: string; at: string };

type QuizInfo = {
  status: "EM_ANDAMENTO" | "CONCLUIDO" | "INTERROMPIDO";
  tem_plano_atual: boolean | null;
  necessidade_principal: string | null;
  answers: QuizAnswer[];
};

type MessageButton = { id: string; title: string };

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  buttons?: MessageButton[] | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  error_message?: string | null;
  transcription?: string | null;
  filename?: string | null;
  timestamp: string;
};

type WhatsAppTemplate = {
  id: string;
  name: string;
  category: string;
  language: string;
  body_text: string | null;
  param_tokens: string[];
  params_are_named: boolean;
};

const QUIZ_STATUS_LABEL: Record<QuizInfo["status"], string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  INTERROMPIDO: "Interrompido",
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

/** Tempo decorrido desde a última mensagem — minutos, depois horas, depois dias. */
function timeSince(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

function dayDividerLabel(date: Date) {
  const now = new Date();
  if (isSameDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// O servidor transcodifica qualquer gravação pra ogg/opus antes de mandar pra Meta
// (ver api/whatsapp/conversations/[id]/audio), então aqui é só pegar o que o
// navegador consegue gravar nativamente — qualquer um funciona.
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

export default function ConversasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contactHeader, setContactHeader] = useState<{ name: string | null; wa_id: string } | null>(null);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [quizModalOpen, setQuizModalOpen] = useState(false);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateParamValues, setTemplateParamValues] = useState<string[]>([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [micMime, setMicMime] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [imageCaption, setImageCaption] = useState("");

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

  // detecção de formato de gravação é client-only (MediaRecorder não existe no server)
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

  const fetchLeadInfo = useCallback(
    async (conversationId: string) => {
      const headers = await authHeader();
      if (!headers) return;
      try {
        const res = await fetch(`/api/whatsapp/conversations/${conversationId}/lead`, {
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (selectedIdRef.current !== conversationId) return;
        setLeadInfo(data.lead ?? null);
        setQuizInfo(data.quiz ?? null);
      } catch {
        setLeadInfo(null);
        setQuizInfo(null);
      }
    },
    [authHeader]
  );

  const fetchTags = useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/tags", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setAllTags(data.tags ?? []);
    } catch {
      // silencioso
    }
  }, [authHeader]);

  // Etiquetas cadastradas: carga inicial (recarrega ao abrir o modal também)
  useEffect(() => {
    if (!firebaseUser) return;
    fetchTags();
  }, [firebaseUser, fetchTags]);

  const fetchTemplates = useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/whatsapp/templates", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      // silencioso
    }
  }, [authHeader]);

  // Modelos aprovados: carga inicial — usados quando a janela de 24h fecha.
  useEffect(() => {
    if (!firebaseUser) return;
    fetchTemplates();
  }, [firebaseUser, fetchTemplates]);

  async function handleSaveLeadTags(tagIds: string[]) {
    if (!leadInfo || savingTags) return;
    setSavingTags(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/leads/${leadInfo.id}/tags`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar etiquetas");

      const newTags: Tag[] = data.tags ?? [];
      setLeadInfo((prev) => (prev ? { ...prev, tags: newTags } : prev));
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, tags: newTags } : c))
      );
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar as etiquetas");
    } finally {
      setSavingTags(false);
    }
  }

  function toggleLeadTag(tagId: string) {
    if (!leadInfo) return;
    const current = new Set(leadInfo.tags.map((t) => t.id));
    if (current.has(tagId)) current.delete(tagId);
    else current.add(tagId);
    void handleSaveLeadTags([...current]);
  }

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
      setLeadInfo(null);
      setQuizInfo(null);
      setTagModalOpen(false);
      setQuizModalOpen(false);
      return;
    }
    setLoadingMessages(true);
    fetchMessages(selectedId).finally(() => setLoadingMessages(false));
    fetchLeadInfo(selectedId); // só na abertura — não precisa de polling

    // zera badge de não lidas localmente pra resposta imediata
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
    );

    const interval = setInterval(() => fetchMessages(selectedId), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages, fetchLeadInfo]);

  // Troca de conversa com uma pré-visualização de imagem aberta: descarta, pra
  // nunca mandar a imagem pro contato errado.
  useEffect(() => {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setImageCaption("");
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return conversations.filter((c) => {
      if (tagFilter.size > 0) {
        const has = c.tags.some((t) => tagFilter.has(t.id));
        if (!has) return false;
      }
      if (!q) return true;
      const name = (c.contact_name || "").toLowerCase();
      if (name.includes(q)) return true;
      if (qDigits && c.wa_id.includes(qDigits)) return true;
      return false;
    });
  }, [conversations, search, tagFilter]);

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

  // Janela de atendimento de 24h da Meta: só dá pra mandar texto livre até 24h
  // depois da ÚLTIMA mensagem do CONTATO (inbound). Passado isso, só um Message
  // Template aprovado reabre a conversa — é regra da plataforma, não um bug.
  const lastInboundAt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === "INBOUND") return messages[i].timestamp;
    }
    return null;
  }, [messages]);

  const windowClosed = useMemo(() => {
    if (!lastInboundAt) return false;
    return Date.now() - new Date(lastInboundAt).getTime() > 24 * 60 * 60 * 1000;
  }, [lastInboundAt]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const templatePreview = useMemo(() => {
    if (!selectedTemplate?.body_text) return "";
    let text = selectedTemplate.body_text;
    selectedTemplate.param_tokens.forEach((token, i) => {
      const value = templateParamValues[i]?.trim() || `{{${token}}}`;
      text = text.replace(`{{${token}}}`, value);
    });
    return text;
  }, [selectedTemplate, templateParamValues]);

  function openTemplateModal() {
    setSelectedTemplateId(templates[0]?.id ?? "");
    setTemplateParamValues(templates[0] ? Array(templates[0].param_tokens.length).fill("") : []);
    setTemplateModalOpen(true);
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const t = templates.find((x) => x.id === templateId);
    setTemplateParamValues(t ? Array(t.param_tokens.length).fill("") : []);
  }

  async function handleSendTemplate() {
    if (!selectedId || !selectedTemplate || sendingTemplate) return;

    setSendingTemplate(true);
    try {
      const headers = await authHeader();
      if (!headers) return;

      const bodyParams = selectedTemplate.param_tokens.map((token, i) => ({
        ...(selectedTemplate.params_are_named ? { name: token } : {}),
        value: templateParamValues[i]?.trim() || "",
      }));

      const res = await fetch(`/api/whatsapp/conversations/${selectedId}/template`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: selectedTemplate.name,
          language: selectedTemplate.language,
          body_params: bodyParams,
          preview_text: templatePreview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar modelo");

      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, last_message_preview: data.message.body, last_message_at: data.message.timestamp }
            : c
        )
      );
      toast.success("Modelo enviado");
      setTemplateModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o modelo");
    } finally {
      setSendingTemplate(false);
    }
  }

  const selfInitials = useMemo(
    () => initialsFor(firebaseUser?.displayName || firebaseUser?.email || "Eu"),
    [firebaseUser]
  );

  const contactInitials = useMemo(
    () =>
      initialsFor(
        contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")
      ),
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
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem");
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

      const res = await fetch(`/api/whatsapp/conversations/${selectedId}/audio`, {
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

  async function sendMedia(file: File, caption?: string) {
    if (!selectedId || uploadingAttachment) return;

    setUploadingAttachment(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const form = new FormData();
      form.append("file", file, file.name);
      if (caption?.trim()) form.append("caption", caption.trim());

      const res = await fetch(`/api/whatsapp/conversations/${selectedId}/media`, {
        method: "POST",
        headers,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar arquivo");

      const isImage = file.type.startsWith("image/");
      const preview = isImage
        ? caption?.trim()
          ? `📷 ${caption.trim()}`
          : "📷 Foto"
        : `📎 ${file.name}`;
      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, last_message_preview: preview, last_message_at: data.message.timestamp }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar o arquivo");
      throw err;
    } finally {
      setUploadingAttachment(false);
    }
  }

  // Abre a pré-visualização em vez de mandar direto — igual o WhatsApp mostra a
  // imagem antes de confirmar o envio (com campo de legenda opcional).
  function openImagePreview(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 4MB)");
      return;
    }
    setImageCaption("");
    setImagePreview({ file, url: URL.createObjectURL(file) });
  }

  function closeImagePreview() {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setImageCaption("");
  }

  async function confirmImageSend() {
    if (!imagePreview || uploadingAttachment) return;
    try {
      await sendMedia(imagePreview.file, imageCaption);
      closeImagePreview();
    } catch {
      // sendMedia já mostra o toast de erro — mantém a pré-visualização aberta pra tentar de novo
    }
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    openImagePreview(file);
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

  // Cola uma imagem copiada (print, "copiar imagem" do navegador etc.) direto no
  // campo de digitar e abre a pré-visualização — igual o WhatsApp Web.
  function handlePasteImage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = [...e.clipboardData.items].find((it) => it.type.startsWith("image/"));
    if (!item) return; // texto colado normal — segue o fluxo padrão do textarea

    e.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    openImagePreview(file);
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
        <div
          className={cn(
            "w-full md:w-[340px] shrink-0 md:border-r border-border flex-col bg-background",
            selectedId ? "hidden md:flex" : "flex"
          )}
        >
          <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33]">
            <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center">
              <WhatsAppIcon className="size-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Conversas</p>
              <p className="text-[11px] text-muted-foreground leading-tight">WhatsApp da equipe</p>
            </div>
          </div>

          <div className="shrink-0 px-3 py-2 border-b border-border bg-background space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar conversa"
                className="h-9 pl-9 rounded-full bg-muted/60 border-transparent text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 rounded-full gap-1.5 text-xs",
                      tagFilter.size > 0 && "border-[#00a884] text-[#00a884]"
                    )}
                  >
                    <ListFilter className="size-3.5" />
                    {tagFilter.size > 0 ? `${tagFilter.size} etiqueta${tagFilter.size > 1 ? "s" : ""}` : "Filtrar por etiqueta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1.5">
                  {allTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                      Nenhuma etiqueta cadastrada.
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {allTags.map((t) => {
                        const checked = tagFilter.has(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() =>
                              setTagFilter((prev) => {
                                const next = new Set(prev);
                                if (next.has(t.id)) next.delete(t.id);
                                else next.add(t.id);
                                return next;
                              })
                            }
                            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
                          >
                            <Checkbox checked={checked} className="pointer-events-none" />
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {[...tagFilter].map((id) => {
                const t = allTags.find((x) => x.id === id);
                if (!t) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                    <button
                      onClick={() =>
                        setTagFilter((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        })
                      }
                      className="rounded-full hover:bg-black/20 p-0.5"
                      aria-label={`Remover filtro ${t.name}`}
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  </span>
                );
              })}

              {tagFilter.size > 0 && (
                <button
                  onClick={() => setTagFilter(new Set())}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                >
                  limpar
                </button>
              )}
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {c.tags.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: t.color }}
                              title={t.name}
                            />
                          ))}
                        </div>
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.last_message_at && (
                            <span
                              className="text-[10px] text-muted-foreground border-blue-400 border-2 p-1 rounded tabular-nums"
                              title="Tempo desde a última mensagem"
                            >
                              {timeSince(c.last_message_at)}
                            </span>
                          )}
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
        <div
          className={cn(
            "flex-1 flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a]",
            selectedId ? "flex" : "hidden md:flex"
          )}
        >
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <WhatsAppIcon className="size-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-2 px-2 md:px-4 py-2.5 border-b border-border bg-[#f0f2f5] dark:bg-[#202c33]">
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
                    contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {contactHeader?.name || formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] text-muted-foreground truncate">
                      {contactHeader?.wa_id}
                    </p>
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
                    {leadInfo?.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="text-[10px] leading-none px-1.5 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.name}
                      </span>
                    ))}
                    {leadInfo && leadInfo.tags.length > 3 && (
                      <button
                        onClick={() => {
                          void fetchTags();
                          setTagModalOpen(true);
                        }}
                        className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground/70 font-medium hover:bg-black/10 dark:hover:bg-white/20"
                        title="Ver todas as etiquetas"
                      >
                        +{leadInfo.tags.length - 3}
                      </button>
                    )}
                  </div>
                </div>
                {quizInfo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title="Respostas do quiz"
                    onClick={() => setQuizModalOpen(true)}
                  >
                    <ClipboardList className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  title="Adicionar etiqueta"
                  onClick={() => {
                    void fetchTags();
                    setTagModalOpen(true);
                  }}
                >
                  <TagIcon className="size-4" />
                </Button>
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

              {windowClosed && (
                <div className="shrink-0 mx-4 mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="flex-1">
                    Mais de 24h desde a última mensagem do contato — só dá pra responder com um
                    modelo aprovado pela Meta.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
                    onClick={openTemplateModal}
                    disabled={templates.length === 0}
                    title={templates.length === 0 ? "Nenhum modelo aprovado disponível" : undefined}
                  >
                    Enviar modelo
                  </Button>
                </div>
              )}

              <div className="shrink-0 px-4 py-3 border-t border-border bg-[#f0f2f5] dark:bg-[#202c33]">
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
                      className="shrink-0 size-11 rounded-full bg-[#00a884] hover:bg-[#029074] text-white shadow-sm"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 size-11 text-muted-foreground hover:text-foreground rounded-full"
                      title="Enviar modelo aprovado"
                      onClick={openTemplateModal}
                      disabled={templates.length === 0}
                    >
                      <FileStack className="size-4" />
                    </Button>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePasteImage}
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
                        className="shrink-0 size-11 rounded-full bg-[#00a884] hover:bg-[#029074] text-white shadow-sm disabled:opacity-40"
                      >
                        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </Button>
                    ) : (
                      <Button
                        onClick={startRecording}
                        disabled={uploadingAttachment || !micMime}
                        size="icon"
                        title={micMime ? "Gravar áudio" : "Seu navegador não grava áudio compatível — use o anexo"}
                        className="shrink-0 size-11 rounded-full bg-[#00a884] hover:bg-[#029074] text-white shadow-sm disabled:opacity-40"
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

      {/* ── Modal de etiquetas do contato ──────────────────── */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <TagIcon className="size-5" />
              <DialogTitle>Etiquetas do contato</DialogTitle>
            </div>
            <DialogDescription>
              {contactHeader?.name ||
                formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")}
            </DialogDescription>
          </DialogHeader>

          {!leadInfo ? (
            <p className="text-sm text-muted-foreground py-2">
              Essa conversa não tem um lead vinculado, então não dá pra aplicar etiquetas.
            </p>
          ) : allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma etiqueta cadastrada ainda. Crie etiquetas na tela{" "}
              <strong>Etiquetas</strong> do menu.
            </p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
              {allTags.map((t) => {
                const checked = leadInfo.tags.some((x) => x.id === t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleLeadTag(t.id)}
                    disabled={savingTags}
                    className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-muted text-left disabled:opacity-60"
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      <TagIcon className="size-3" />
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {savingTags && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Salvando…
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTagModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de respostas do quiz ─────────────────────── */}
      <Dialog open={quizModalOpen} onOpenChange={setQuizModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5" />
              <DialogTitle>Respostas do quiz</DialogTitle>
            </div>
            <DialogDescription>
              {contactHeader?.name ||
                formatPhoneNumber(contactHeader?.wa_id?.replace(/^55/, "") || "")}
            </DialogDescription>
          </DialogHeader>

          {!quizInfo ? (
            <p className="text-sm text-muted-foreground py-2">
              Esse contato não passou pelo quiz de qualificação.
            </p>
          ) : (
            <div className="space-y-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  quizInfo.status === "CONCLUIDO"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : quizInfo.status === "EM_ANDAMENTO"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                )}
              >
                <CircleDot className="size-3" />
                {QUIZ_STATUS_LABEL[quizInfo.status]}
              </span>

              {quizInfo.answers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma resposta registrada ainda.
                </p>
              ) : (
                <ol className="space-y-3">
                  {quizInfo.answers.map((a, i) => (
                    <li key={`${a.step}-${i}`} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{a.question}</p>
                      <p className="text-sm font-medium">{a.answer}</p>
                    </li>
                  ))}
                </ol>
              )}

              {(quizInfo.tem_plano_atual != null ||
                quizInfo.necessidade_principal != null) && (
                <div className="border-t border-border pt-3 space-y-1.5">
                  {quizInfo.tem_plano_atual != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Já tem plano</span>
                      <span className="font-medium">
                        {quizInfo.tem_plano_atual ? "Sim" : "Não"}
                      </span>
                    </div>
                  )}
                  {quizInfo.necessidade_principal != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Necessidade principal</span>
                      <span className="font-medium">
                        {NECESSIDADE_PRINCIPAL_LABEL[
                          quizInfo.necessidade_principal as "prevencao" | "tratamento"
                        ] ??
                          quizInfo.necessidade_principal}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de envio de modelo (template) ─────────────── */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileStack className="size-5" />
              <DialogTitle>Enviar modelo</DialogTitle>
            </div>
            <DialogDescription>
              Modelos (templates) são a única forma de mensagem que a Meta aceita mais de 24h
              depois da última resposta do contato.
            </DialogDescription>
          </DialogHeader>

          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum modelo aprovado encontrado na conta.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {t.language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate?.param_tokens.map((token, i) => (
                <div key={`${token}-${i}`} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {selectedTemplate.params_are_named ? token : `Variável ${token}`}
                  </label>
                  <Input
                    value={templateParamValues[i] ?? ""}
                    onChange={(e) =>
                      setTemplateParamValues((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                  />
                </div>
              ))}

              {templatePreview && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Pré-visualização
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{templatePreview}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendTemplate} disabled={!selectedTemplate || sendingTemplate}>
              {sendingTemplate ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pré-visualização de imagem antes de enviar ──────── */}
      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && closeImagePreview()}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              <DialogTitle>Enviar imagem</DialogTitle>
            </div>
          </DialogHeader>

          {imagePreview && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center max-h-96">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview.url}
                  alt="Pré-visualização"
                  className="max-w-full max-h-96 object-contain"
                />
              </div>
              <Input
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmImageSend()}
                placeholder="Adicionar legenda (opcional)"
                disabled={uploadingAttachment}
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeImagePreview} disabled={uploadingAttachment}>
              Cancelar
            </Button>
            <Button
              onClick={confirmImageSend}
              disabled={uploadingAttachment}
              className="bg-[#00a884] hover:bg-[#029074] text-white"
            >
              {uploadingAttachment ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar
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

// Waveform "de mentira", determinística por mensagem — só usada quando o
// navegador não consegue decodificar o áudio (formato não suportado pelo Web Audio API).
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
      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#00a884] ring-2 ring-[#efeae2] dark:ring-[#0b141a]">
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
  const isAudio = message.type === "audio";
  const isImage = message.type === "image";
  const isDocument = message.type === "document";
  const isFixedWidth = isAudio || isImage || isDocument;
  const time = new Date(message.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const bubbleBg = isOutbound
    ? "bg-[#d9fdd3] dark:bg-[#005c4b]"
    : "bg-white dark:bg-[#1f2c34]";

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
        {!isOutbound && <BubbleTail side="left" bubbleBg={bubbleBg} />}
        <div
          className={cn(
            "relative rounded-lg text-sm leading-relaxed shadow-sm text-foreground",
            bubbleBg,
            isImage ? "p-1" : "px-2.5 py-1.5",
            isOutbound ? "rounded-br-none" : "rounded-bl-none"
          )}
        >
          {isAudio ? (
            <>
              <AudioPlayer
                messageId={message.id}
                getAuthHeader={getAuthHeader}
                isOutbound={isOutbound}
                transcription={message.transcription}
                onTranscribed={onTranscribed}
              />
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
                {time}
                {isOutbound && <StatusIcon status={message.status} errorMessage={message.error_message} />}
              </div>
            </>
          ) : isImage ? (
            <>
              <ImageMessage messageId={message.id} getAuthHeader={getAuthHeader} />
              {message.body && (
                <p className="whitespace-pre-wrap wrap-break-word px-1.5 pt-1.5 pr-10">
                  {message.body}
                </p>
              )}
              <div className="flex items-center justify-end gap-1 px-1.5 pb-0.5 pt-1 text-[10px] text-muted-foreground">
                {time}
                {isOutbound && <StatusIcon status={message.status} errorMessage={message.error_message} />}
              </div>
            </>
          ) : isDocument ? (
            <>
              <DocumentMessage
                messageId={message.id}
                filename={message.filename || "arquivo"}
                getAuthHeader={getAuthHeader}
              />
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
                {time}
                {isOutbound && <StatusIcon status={message.status} errorMessage={message.error_message} />}
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap wrap-break-word pr-10">{message.body}</p>
              {message.buttons && message.buttons.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1 border-t border-black/10 dark:border-white/10 pt-1.5">
                  {message.buttons.map((b) => (
                    <span
                      key={b.id}
                      className="rounded-md bg-black/5 dark:bg-white/10 px-2 py-1 text-center text-xs font-medium text-[#00a884] dark:text-[#7ee0c8]"
                    >
                      {b.title}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 float-right -mb-1 ml-2 mt-1 text-[10px] text-muted-foreground">
                {time}
                {isOutbound && <StatusIcon status={message.status} errorMessage={message.error_message} />}
              </div>
            </>
          )}
        </div>
        {isOutbound && <BubbleTail side="right" bubbleBg={bubbleBg} />}
      </div>

      {isAudio && isOutbound && <VoiceAvatar initials={selfInitials} color="bg-[#00a884]" />}
    </div>
  );
}

function AudioPlayer({
  messageId,
  getAuthHeader,
  isOutbound,
  transcription,
  onTranscribed,
}: {
  messageId: string;
  getAuthHeader: () => Promise<Record<string, string> | null>;
  isOutbound: boolean;
  transcription?: string | null;
  onTranscribed: (messageId: string, transcription: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      const headers = await getAuthHeader();
      if (!headers) return;
      try {
        const res = await fetch(`/api/whatsapp/media/${messageId}`, { headers });
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
  }, [messageId, getAuthHeader]);

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
      const res = await fetch(`/api/whatsapp/messages/${messageId}/transcribe`, {
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
  const playedColor = isOutbound ? "bg-[#0a6a55]" : "bg-[#00a884]";
  const unplayedColor = isOutbound ? "bg-[#0a6a55]/30" : "bg-black/15 dark:bg-white/25";
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
            "shrink-0 flex items-center justify-center size-8 rounded-full text-white shadow-sm",
            isOutbound ? "bg-[#0a6a55]" : "bg-[#00a884]"
          )}
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
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-0.5 pl-10">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatRecordingTime(Math.floor(displaySeconds))}
        </span>

        {transcription ? (
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-medium text-foreground/70 hover:text-foreground underline decoration-dotted underline-offset-2"
          >
            <FileText className="size-3" />
            {showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
          </button>
        ) : (
          <button
            onClick={handleTranscribe}
            disabled={transcribing}
            className="flex items-center gap-1 text-[10px] font-medium text-foreground/70 hover:text-foreground underline decoration-dotted underline-offset-2 disabled:opacity-50"
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
        <p className="mt-1.5 pl-2 text-xs italic text-foreground/80 border-l-2 border-foreground/20">
          {transcription}
        </p>
      )}
    </div>
  );
}

function ImageMessage({
  messageId,
  getAuthHeader,
}: {
  messageId: string;
  getAuthHeader: () => Promise<Record<string, string> | null>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      const headers = await getAuthHeader();
      if (!headers) return;
      try {
        const res = await fetch(`/api/whatsapp/media/${messageId}`, { headers });
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
  }, [messageId, getAuthHeader]);

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
}: {
  messageId: string;
  filename: string;
  getAuthHeader: () => Promise<Record<string, string> | null>;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const headers = await getAuthHeader();
      if (!headers) return;
      const res = await fetch(`/api/whatsapp/media/${messageId}`, { headers });
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
      disabled={downloading}
      className="flex items-center gap-2.5 w-full text-left disabled:opacity-60"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/10 dark:bg-white/10">
        {downloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileText className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename}</p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Download className="size-3" />
          Toque para baixar
        </p>
      </div>
    </button>
  );
}

function StatusIcon({
  status,
  errorMessage,
}: {
  status: Message["status"];
  errorMessage?: string | null;
}) {
  if (status === "READ") return <CheckCheck className="size-3.5 text-[#53bdeb]" />;
  if (status === "DELIVERED") return <CheckCheck className="size-3.5" />;
  if (status === "SENT") return <Check className="size-3.5" />;
  if (status === "FAILED") {
    return (
      <span title={translateWhatsAppErrorTitle(null, errorMessage ?? null)}>
        <AlertCircle className="size-3.5 text-destructive" />
      </span>
    );
  }
  return <Clock className="size-3.5" />;
}
