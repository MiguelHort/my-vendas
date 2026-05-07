// components/funil/LeadCard.tsx
"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  CalendarDays,
  CheckCheck,
  Clock3,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  StickyNote,
  Tag,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatPhoneNumber } from "@/lib/phoneMask";
import WhatsappIcon from "@/components/icons/WhatsappIcon";

// ========================
// TIPOS
// ========================

export type Etiqueta = {
  label: string;
  color: string;
};

export type Lead = {
  id: string;
  nome: string;
  origem: string;
  status: string;
  data_entrada: string;
  estado: string;
  cidade: string | null;
  telefone: string | null;
  operadora_ofertada: string | null;
  qtd_vidas: number;
  idades: string;
  possui_cnpj: boolean | null;
  tem_plano_anterior: boolean | null;
  operadora_anterior: string | null;
  tempo_plano_anterior: string | null;
  modalidade: string | null;
  acomodacao: string | null;
  valor_mensalidade: number | null;
  coparticipacao: string | null;
  motivo_dispensa: string | null;
  updated_at: string;
  valor_comissao: number | null;
  data_venda: string | null;
  last_chamado_at: string | null;
  card_color: string | null;
  notas: string | null;
  etiquetas: string | null; // JSON string: Etiqueta[]
  retornar_em: string | null;
};

type LeadCardProps = {
  lead: Lead;
  firebaseUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  onRefreshLeads: () => void;
};

// ========================
// OPERADORAS COM CORES
// ========================

export const OPERADORAS = [
  { nome: "Bradesco Saúde", cor: "#cc0000", textoCor: "#ffffff" },
  { nome: "Amil", cor: "#0066cc", textoCor: "#ffffff" },
  { nome: "Unimed", cor: "#009b3a", textoCor: "#ffffff" },
  { nome: "SulAmérica", cor: "#e30613", textoCor: "#ffffff" },
  { nome: "Hapvida", cor: "#f7941d", textoCor: "#ffffff" },
  { nome: "NotreDame Intermédica", cor: "#003087", textoCor: "#ffffff" },
  { nome: "Porto Seguro Saúde", cor: "#0055a5", textoCor: "#ffffff" },
  { nome: "Prevent Senior", cor: "#e85d04", textoCor: "#ffffff" },
  { nome: "Assim Saúde", cor: "#00b451", textoCor: "#ffffff" },
  { nome: "Golden Cross", cor: "#c8a300", textoCor: "#ffffff" },
  { nome: "Omint", cor: "#e4002b", textoCor: "#ffffff" },
  { nome: "Geap", cor: "#1a3f73", textoCor: "#ffffff" },
  { nome: "Fusex", cor: "#0a3d6b", textoCor: "#ffffff" },
  { nome: "Medial", cor: "#6d28d9", textoCor: "#ffffff" },
];

// Cores para personalização do card
const CARD_PRESET_COLORS = [
  { label: "Padrão", value: "" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Roxo", value: "#8b5cf6" },
  { label: "Rosa", value: "#ec4899" },
];

// Cores para etiquetas
const ETIQUETA_PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

// ========================
// HELPERS
// ========================

const getLeadWaitTime = (lead: Lead) => {
  if (["Dispensado", "Concluído", "Retornar"].includes(lead.status)) return "";

  if (!lead.last_chamado_at) return "Nunca";

  const last = new Date(lead.last_chamado_at);
  if (Number.isNaN(last.getTime())) return "";

  const diffHours = (Date.now() - last.getTime()) / 3600000;

  if (diffHours <= 24) return "";
  if (diffHours <= 48) return "24 - 48h";
  if (diffHours <= 72) return "48 - 72h";
  return "72h+";
};

const getLeadCardColor = (lead: Lead) => {
  if (lead.card_color) return lead.card_color;
  if (["Dispensado", "Concluído", "Retornar"].includes(lead.status)) return "";

  if (!lead.last_chamado_at) return "#b91c1c";

  const last = new Date(lead.last_chamado_at);
  if (Number.isNaN(last.getTime())) return "";

  const diffHours = (Date.now() - last.getTime()) / 3600000;

  if (diffHours <= 24) return "";
  if (diffHours <= 48) return "#f87171";
  if (diffHours <= 72) return "#ef4444";
  return "#b91c1c";
};

const parseEtiquetas = (raw: string | null): Etiqueta[] => {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const getOperadoraInfo = (nome: string | null) => {
  if (!nome) return null;
  return OPERADORAS.find((o) => o.nome === nome) ?? null;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "L";

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

const InfoPill = ({
  icon,
  children,
  title,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) => (
  <span
    title={title}
    className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur"
  >
    <span className="shrink-0 text-muted-foreground/80">{icon}</span>
    <span className="truncate">{children}</span>
  </span>
);

// ========================
// COMPONENTE PRINCIPAL
// ========================

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  firebaseUser,
  onRefreshLeads,
}) => {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<Partial<Lead>>({});

  // estado local para gerenciar etiquetas no modal
  const [novaEtiquetaLabel, setNovaEtiquetaLabel] = React.useState("");
  const [novaEtiquetaCor, setNovaEtiquetaCor] = React.useState(
    ETIQUETA_PRESET_COLORS[0],
  );
  // estado para controlar se mostra input de operadora customizada
  const [operadoraCustom, setOperadoraCustom] = React.useState(false);

  const openWhatsApp = (telefone: string | null) => {
    if (!telefone) {
      toast.error("Este lead não possui telefone cadastrado.");
      return;
    }
    const digits = telefone.replace(/\D/g, "");
    if (!digits) {
      toast.error("Telefone inválido para este lead.");
      return;
    }
    window.open(
      `https://wa.me/${digits.startsWith("55") ? digits : "55" + digits}`,
      "_blank",
    );
  };

  const handleOpenEditModal = () => {
    const opInfo = getOperadoraInfo(lead.operadora_ofertada);
    setOperadoraCustom(!opInfo && !!lead.operadora_ofertada);
    setNovaEtiquetaLabel("");
    setNovaEtiquetaCor(ETIQUETA_PRESET_COLORS[0]);
    setEditFormData({
      nome: lead.nome,
      origem: lead.origem,
      estado: lead.estado,
      cidade: lead.cidade,
      telefone: lead.telefone,
      qtd_vidas: lead.qtd_vidas,
      idades: lead.idades,
      possui_cnpj: lead.possui_cnpj,
      tem_plano_anterior: lead.tem_plano_anterior,
      operadora_anterior: lead.operadora_anterior,
      tempo_plano_anterior: lead.tempo_plano_anterior,
      modalidade: lead.modalidade,
      operadora_ofertada: lead.operadora_ofertada,
      acomodacao: lead.acomodacao,
      valor_mensalidade: lead.valor_mensalidade,
      coparticipacao: lead.coparticipacao,
      valor_comissao: lead.valor_comissao,
      data_entrada: lead.data_entrada,
      data_venda: lead.data_venda,
      last_chamado_at: lead.last_chamado_at,
      status: lead.status,
      card_color: lead.card_color,
      notas: lead.notas,
      etiquetas: lead.etiquetas,
    });
    setShowEditModal(true);
  };

  const etiquetasAtuais = parseEtiquetas(editFormData.etiquetas ?? null);

  const handleAddEtiqueta = () => {
    if (!novaEtiquetaLabel.trim()) return;
    const updated: Etiqueta[] = [
      ...etiquetasAtuais,
      { label: novaEtiquetaLabel.trim(), color: novaEtiquetaCor },
    ];
    setEditFormData({ ...editFormData, etiquetas: JSON.stringify(updated) });
    setNovaEtiquetaLabel("");
  };

  const handleRemoveEtiqueta = (index: number) => {
    const updated = etiquetasAtuais.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, etiquetas: JSON.stringify(updated) });
  };

  const handleSaveEdit = async () => {
    if (!firebaseUser) return;

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads/update?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          ...editFormData,
          valor_comissao: editFormData.valor_comissao ?? null,
          data_venda: editFormData.data_venda ?? null,
          last_chamado_at: editFormData.last_chamado_at ?? null,
          card_color: editFormData.card_color ?? null,
          notas: editFormData.notas ?? null,
          etiquetas: editFormData.etiquetas ?? null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao atualizar lead: " + (body.error || res.statusText),
        );
      } else {
        toast.success("Lead atualizado com sucesso!");
        setShowEditModal(false);
        setEditFormData({});
        onRefreshLeads();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar lead");
    }
  };

  const handleMarkLeadChamado = async () => {
    if (!firebaseUser) return;

    const nowISO = new Date().toISOString();
    setEditFormData((prev) => ({ ...prev, last_chamado_at: nowISO }));

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads/update?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, last_chamado_at: nowISO }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao marcar lead como chamado: " + (body.error || res.statusText),
        );
      } else {
        toast.success("Lead marcado como chamado agora.");
        onRefreshLeads();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao marcar lead como chamado.");
    }
  };

  const cardBorderColor = getLeadCardColor(lead);
  const etiquetasCard = parseEtiquetas(lead.etiquetas);
  const operadoraInfo = getOperadoraInfo(lead.operadora_ofertada);

  // Verifica se o lead "retornou" (retornar_em no passado)
  const retornouAgora =
    lead.status === "Retornar" &&
    lead.retornar_em &&
    new Date(lead.retornar_em) <= new Date();

  const urgencyAccentColor = retornouAgora
    ? "#f59e0b"
    : cardBorderColor || null;

  const urgencyRingClass = retornouAgora
    ? "ring-2 ring-amber-500/60"
    : cardBorderColor === "#b91c1c"
      ? "ring-2 ring-red-700/50"
      : cardBorderColor === "#ef4444"
        ? "ring-1 ring-red-500/40"
        : cardBorderColor === "#f87171"
          ? "ring-1 ring-red-300/40"
          : "ring-1 ring-border/70";

  const waitTime = getLeadWaitTime(lead);
  const leadInitials = getInitials(lead.nome);
  const monthlyValue = formatCurrency(lead.valor_mensalidade);
  const commissionValue = formatCurrency(lead.valor_comissao);
  const locationText =
    [lead.cidade, lead.estado].filter(Boolean).join(" / ") || lead.estado;
  const primaryAccent = urgencyAccentColor || operadoraInfo?.cor || "#2563eb";

  return (
    <>
      {/* CARD VISUAL */}
      <Card
        className={`group relative cursor-move overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:border-foreground/20 hover:shadow-md p-1 ${urgencyRingClass}`}
        style={
          lead.card_color
            ? { backgroundColor: `${lead.card_color}08` }
            : undefined
        }
      >
        {/* Faixa lateral colorida (substitui o gradiente do topo) */}
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: primaryAccent }}
        />

        <CardContent className="relative space-y-3 p-3.5 pl-4">
          {/* Header sem avatar */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-snug text-foreground">
                {lead.nome}
              </p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-0.5">
              {lead.notas && (
                <span
                  title={lead.notas}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-amber-600 dark:text-amber-400"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                </span>
              )}
              {lead.telefone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    openWhatsApp(lead.telefone);
                  }}
                  title="Abrir WhatsApp"
                >
                  <WhatsappIcon />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal();
                }}
                title="Editar lead"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Origem, status e operadora — badges mais sóbrias */}
          <div className="flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className="h-5 rounded-md border-border/60 px-1.5 py-0 text-[10px] font-medium"
            >
              {lead.origem}
            </Badge>
            <Badge
              variant="outline"
              className="h-5 rounded-md border-border/60 px-1.5 py-0 text-[10px] font-medium"
            >
              {lead.status}
            </Badge>
            {lead.operadora_ofertada && (
              <Badge
                className="h-5 rounded-md border-0 px-1.5 py-0 text-[10px] font-medium"
                style={
                  operadoraInfo
                    ? {
                      backgroundColor: `${operadoraInfo.cor}20`,
                      color: operadoraInfo.cor,
                    }
                    : { backgroundColor: "#6b728020", color: "#6b7280" }
                }
              >
                {lead.operadora_ofertada}
              </Badge>
            )}
          </div>

          {/* Etiquetas */}
          {etiquetasCard.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {etiquetasCard.map((et, i) => (
                <span
                  key={i}
                  className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 py-0 text-[10px] font-medium"
                  style={{
                    color: et.color,
                    backgroundColor: `${et.color}15`,
                  }}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {et.label}
                </span>
              ))}
            </div>
          )}

          {/* Informações rápidas — linhas limpas em vez de pills */}
          <div className="flex flex-col gap-2 text-[11px] border p-2 rounded-md">
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate text-foreground/80">
                  {lead.qtd_vidas} {lead.qtd_vidas === 1 ? "vida" : "vidas"}
                </span>
              </div>
              {lead.modalidade && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate text-foreground/80">
                    {lead.modalidade}
                  </span>
                </div>
              )}
              {monthlyValue && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <WalletCards className="h-3 w-3 shrink-0" />
                  <span className="truncate text-foreground/80">{monthlyValue}</span>
                </div>
              )}
            </div>

            {lead.telefone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate text-foreground/80">{lead.telefone}</span>
              </div>
            )}
          </div>

          {/* Notas — borda lateral em vez de bloco colorido */}
          {lead.notas && (
            <div className="line-clamp-2 border-l-2 border-amber-500/40 pl-2 text-[11px] leading-relaxed text-muted-foreground">
              {lead.notas}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
            <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {new Date(lead.data_entrada).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {commissionValue && (
                <span className="text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {commissionValue}
                </span>
              )}

              {retornouAgora ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                  </span>
                  Retornou
                </span>
              ) : waitTime ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium tabular-nums"
                  style={{ color: cardBorderColor || undefined }}
                >
                  <Clock3 className="h-3 w-3" />
                  {waitTime}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border-0 p-0 shadow-2xl sm:max-h-[90vh]">
          <DialogHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-background px-6 py-5 text-left">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm ring-1 ring-white/40"
                style={{
                  background: `linear-gradient(135deg, ${primaryAccent}, ${primaryAccent}B3)`,
                }}
              >
                {leadInitials}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-lg font-semibold tracking-tight">
                  Editar {lead.nome}
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 ring-1 ring-border/60">
                    <MapPin className="h-3 w-3" /> {locationText}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 ring-1 ring-border/60">
                    <Users className="h-3 w-3" /> {lead.qtd_vidas}{" "}
                    {lead.qtd_vidas === 1 ? "vida" : "vidas"}
                  </span>
                  {lead.operadora_ofertada && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 ring-1 ring-border/60">
                      <Sparkles className="h-3 w-3" /> {lead.operadora_ofertada}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-172px)] space-y-5 overflow-y-auto px-6 py-5">
            {/* Lead Chamado */}
            <div className="flex items-center justify-between rounded-2xl border bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                  <CheckCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Último contato</p>
                  {editFormData.last_chamado_at ? (
                    <p className="text-xs text-muted-foreground">
                      {new Date(editFormData.last_chamado_at).toLocaleString(
                        "pt-BR",
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nunca chamado
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkLeadChamado}
                className="rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shrink-0"
              >
                Marcar chamado
              </Button>
            </div>

            {/* Início de Contato */}
            <div className="flex items-center justify-between rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Início de Contato</p>
                  <p className="text-xs text-muted-foreground">
                    Data de entrada do lead
                  </p>
                </div>
              </div>
              <Input
                type="date"
                className="w-40 rounded-xl text-sm"
                value={
                  editFormData.data_entrada
                    ? editFormData.data_entrada.substring(0, 10)
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setEditFormData({
                    ...editFormData,
                    data_entrada: value
                      ? new Date(value + "T12:00:00").toISOString()
                      : editFormData.data_entrada ?? "",
                  });
                }}
              />
            </div>

            {/* ── PERSONALIZAÇÃO DO CARD ── */}
            <div className="space-y-4 rounded-2xl border bg-card/70 p-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                  <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  Personalização do Card
                </p>
              </div>

              {/* Cor do card */}
              <div className="space-y-1.5">
                <Label className="text-xs">Cor do card</Label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() =>
                        setEditFormData({
                          ...editFormData,
                          card_color: c.value || null,
                        })
                      }
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c.value || "#e5e7eb",
                        borderColor:
                          (editFormData.card_color ?? "") === c.value
                            ? "#000"
                            : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label className="text-xs">Notas internas</Label>
                <Textarea
                  placeholder="Anotações sobre este lead..."
                  value={editFormData.notas || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notas: e.target.value })
                  }
                  className="min-h-[70px] text-sm"
                />
              </div>

              {/* Etiquetas */}
              <div className="space-y-1.5">
                <Label className="text-xs">Etiquetas</Label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {etiquetasAtuais.map((et, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: et.color }}
                    >
                      {et.label}
                      <button
                        type="button"
                        onClick={() => handleRemoveEtiqueta(i)}
                        className="hover:opacity-70"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Nova etiqueta..."
                    value={novaEtiquetaLabel}
                    onChange={(e) => setNovaEtiquetaLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEtiqueta();
                      }
                    }}
                    className="h-8 text-sm flex-1"
                  />
                  <div className="flex gap-1">
                    {ETIQUETA_PRESET_COLORS.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => setNovaEtiquetaCor(cor)}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: cor,
                          borderColor:
                            novaEtiquetaCor === cor ? "#000" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={handleAddEtiqueta}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ── DADOS BÁSICOS ── */}
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  Dados básicos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editFormData.nome || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, nome: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origem *</Label>
                  <Select
                    value={editFormData.origem || ""}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, origem: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Lead Novo">Lead Novo</SelectItem>
                      <SelectItem value="Retrabalho">Retrabalho</SelectItem>
                      <SelectItem value="Ligação">Ligação</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select
                    value={editFormData.estado || ""}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-[300px]">
                      {[
                        "SP",
                        "RJ",
                        "MG",
                        "BA",
                        "PR",
                        "RS",
                        "PE",
                        "CE",
                        "SC",
                        "GO",
                        "MA",
                        "ES",
                        "PB",
                        "RN",
                        "MT",
                        "AL",
                        "PI",
                        "DF",
                        "MS",
                        "SE",
                        "RO",
                        "TO",
                        "AC",
                        "AP",
                        "RR",
                        "AM",
                        "PA",
                      ].map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={editFormData.cidade || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, cidade: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone/WhatsApp</Label>
                <Input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={editFormData.telefone || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      telefone: formatPhoneNumber(e.target.value),
                    })
                  }
                  maxLength={15}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  Perfil do lead
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Qtd. Vidas *</Label>
                  <Input
                    type="number"
                    value={editFormData.qtd_vidas ?? ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        qtd_vidas: parseInt(e.target.value || "0"),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idades *</Label>
                  <Input
                    value={editFormData.idades || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        idades: e.target.value,
                      })
                    }
                    placeholder="Ex: 34, 30, 5"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={!!editFormData.possui_cnpj}
                  onCheckedChange={(checked) =>
                    setEditFormData({ ...editFormData, possui_cnpj: checked })
                  }
                />
                <Label>Possui CNPJ</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={!!editFormData.tem_plano_anterior}
                  onCheckedChange={(checked) =>
                    setEditFormData({
                      ...editFormData,
                      tem_plano_anterior: checked,
                    })
                  }
                />
                <Label>Tem Plano Anterior</Label>
              </div>

              {editFormData.tem_plano_anterior && (
                <>
                  <div className="space-y-2">
                    <Label>Operadora Anterior</Label>
                    <Input
                      value={editFormData.operadora_anterior || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          operadora_anterior: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo no Plano Anterior</Label>
                    <Input
                      value={editFormData.tempo_plano_anterior || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          tempo_plano_anterior: e.target.value,
                        })
                      }
                      placeholder="Ex: 2 anos"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  Oferta e venda
                </p>
              </div>

              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select
                  value={editFormData.modalidade || ""}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, modalidade: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="PF">PF</SelectItem>
                    <SelectItem value="Adesão">Adesão</SelectItem>
                    <SelectItem value="Empresarial">Empresarial</SelectItem>
                    <SelectItem value="PME">PME</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── OPERADORA OFERTADA - VISUAL SELECTOR ── */}
              <div className="space-y-2">
                <Label>Operadora Ofertada</Label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {OPERADORAS.map((op) => (
                    <button
                      key={op.nome}
                      type="button"
                      onClick={() => {
                        setEditFormData({
                          ...editFormData,
                          operadora_ofertada: op.nome,
                        });
                        setOperadoraCustom(false);
                      }}
                      className="px-2 py-1.5 rounded text-xs font-medium border-2 transition-all text-left"
                      style={{
                        backgroundColor: op.cor + "22",
                        borderColor:
                          editFormData.operadora_ofertada === op.nome &&
                            !operadoraCustom
                            ? op.cor
                            : "transparent",
                        color: op.cor,
                      }}
                    >
                      {op.nome}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setOperadoraCustom(true);
                      if (!operadoraCustom) {
                        setEditFormData({
                          ...editFormData,
                          operadora_ofertada: "",
                        });
                      }
                    }}
                    className="px-2 py-1.5 rounded text-xs font-medium border-2 transition-all"
                    style={{
                      borderColor: operadoraCustom ? "#6b7280" : "transparent",
                      backgroundColor: "#6b728022",
                      color: "#6b7280",
                    }}
                  >
                    Outra...
                  </button>
                </div>
                {operadoraCustom && (
                  <Input
                    placeholder="Nome da operadora"
                    value={editFormData.operadora_ofertada || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        operadora_ofertada: e.target.value,
                      })
                    }
                  />
                )}
                {editFormData.operadora_ofertada && !operadoraCustom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-6 px-2"
                    onClick={() =>
                      setEditFormData({
                        ...editFormData,
                        operadora_ofertada: null,
                      })
                    }
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remover operadora
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Acomodação</Label>
                <Select
                  value={editFormData.acomodacao || ""}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, acomodacao: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                    <SelectItem value="Apartamento">Apartamento</SelectItem>
                    <SelectItem value="Ambulatorial">Ambulatorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Mensalidade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.valor_mensalidade ?? ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        valor_mensalidade: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coparticipação</Label>
                  <Select
                    value={editFormData.coparticipacao || ""}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        coparticipacao: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Total">Total</SelectItem>
                      <SelectItem value="Parcial">Parcial</SelectItem>
                      <SelectItem value="Isenta">Isenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comissão e data - SEMPRE editável (Feature 1) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Comissão (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.valor_comissao ?? ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        valor_comissao: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input
                    type="date"
                    value={
                      editFormData.data_venda
                        ? editFormData.data_venda.substring(0, 10)
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditFormData({
                        ...editFormData,
                        data_venda: value
                          ? new Date(value + "T00:00:00").toISOString()
                          : null,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="gap-2 rounded-xl shadow-sm"
            >
              <CheckCheck className="h-4 w-4" />
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadCard;
