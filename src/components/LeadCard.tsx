// components/funil/LeadCard.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Pencil,
  Phone,
  Sparkles,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneMask";
import WhatsappIcon from "@/components/icons/WhatsappIcon";

// ========================
// TIPOS
// ========================

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
  retornar_em: string | null;
  tipo_comissao: string;
};

type LeadCardProps = {
  lead: Lead;
  firebaseUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  onRefreshLeads: () => void;
  commissionMap?: Record<string, { interna: number; externa: number }>;
};

// ========================
// OPERADORAS COM CORES
// ========================

export const OPERADORAS = [
  { nome: "Amil", cor: "#0066cc", textoCor: "#ffffff", logo: "/imgs/planos/amil.png" },
  { nome: "Bradesco Saúde", cor: "#cc0000", textoCor: "#ffffff", logo: "/imgs/planos/bradesco.png" },
  { nome: "Hapvida", cor: "#f7941d", textoCor: "#ffffff", logo: "/imgs/planos/hapvida.png" },
  { nome: "LevMed", cor: "#00a86b", textoCor: "#ffffff", logo: "/imgs/planos/levmed.png" },
  { nome: "Nossa Saúde", cor: "#0091cf", textoCor: "#ffffff", logo: "/imgs/planos/nossasaude.png" },
  { nome: "SulAmérica", cor: "#e30613", textoCor: "#ffffff", logo: "/imgs/planos/sulamerica.png" },
  { nome: "Unimed", cor: "#009b3a", textoCor: "#ffffff", logo: "/imgs/planos/unimed.png" },
  { nome: "Select", cor: "#8b5cf6", textoCor: "#ffffff", logo: "/imgs/planos/select.png" },
  { nome: "Notre Dame", cor: "#f7941d", textoCor: "#ffffff", logo: "/imgs/planos/notredame.png" },
  { nome: "Clinipam", cor: "#0066cc", textoCor: "#ffffff", logo: "/imgs/planos/clinipam.png" },
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
  commissionMap = {},
}) => {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<Partial<Lead>>({});

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
      tipo_comissao: lead.tipo_comissao || "interno",
      status: lead.status,
    });
    // pré-calcula valor_comissao se ainda não definido
    const opNome = lead.operadora_ofertada;
    const tipo = lead.tipo_comissao || "interno";
    const comInfo = opNome ? commissionMap[opNome] : undefined;
    const pct = comInfo ? (tipo === "externo" ? comInfo.externa : comInfo.interna) : 100;
    if (!lead.valor_comissao && lead.valor_mensalidade) {
      setEditFormData((prev) => ({
        ...prev,
        valor_comissao: parseFloat((lead.valor_mensalidade! * (pct / 100)).toFixed(2)),
      }));
    }
    setShowEditModal(true);
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
          tipo_comissao: editFormData.tipo_comissao ?? "interno",
          data_venda: editFormData.data_venda ?? null,
          last_chamado_at: editFormData.last_chamado_at ?? null,
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
  const commissionInfo = lead.operadora_ofertada
    ? commissionMap[lead.operadora_ofertada]
    : undefined;
  const commissionPct = commissionInfo
    ? lead.tipo_comissao === "externo"
      ? commissionInfo.externa
      : commissionInfo.interna
    : 100;
  const estimatedCommission =
    lead.valor_mensalidade != null
      ? lead.valor_mensalidade * (commissionPct / 100)
      : null;
  const commissionValue = formatCurrency(
    lead.valor_comissao ?? estimatedCommission,
  );
  const locationText =
    [lead.cidade, lead.estado].filter(Boolean).join(" / ") || lead.estado;
  const primaryAccent = urgencyAccentColor || operadoraInfo?.cor || "#2563eb";

  return (
    <>
      {/* CARD VISUAL */}
      <Card
        className={`group relative cursor-move overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:border-foreground/20 hover:shadow-md p-1 ${urgencyRingClass}`}
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
                className="h-5 rounded-md border-0 px-1.5 py-0 flex items-center"
                style={{
                  backgroundColor: operadoraInfo
                    ? `${operadoraInfo.cor}20`
                    : "#6b728020",
                }}
              >
                {operadoraInfo?.logo ? (
                  <Image
                    src={operadoraInfo.logo}
                    alt={lead.operadora_ofertada}
                    width={48}
                    height={14}
                    className="h-3.5 w-auto object-contain"
                  />
                ) : (
                  <span className="text-[10px] font-medium" style={{ color: "#6b7280" }}>
                    {lead.operadora_ofertada}
                  </span>
                )}
              </Badge>
            )}
          </div>

          {/* Informações rápidas — linhas limpas em vez de pills */}
          <div className="flex flex-col gap-2 text-[11px] border p-2 rounded-md">
            <div className="flex gap-1.5">
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
        <DialogContent className="max-w-3xl lg:max-w-5xl overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl sm:max-h-[90vh]">

          {/* ── Header ── */}
          <DialogHeader className="border-b px-6 py-5 text-left">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {getInitials(lead.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="truncate text-base font-bold tracking-tight">
                    {lead.nome}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {lead.origem} · {lead.cidade ? `${lead.cidade}, ` : ""}{lead.estado}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-172px)] space-y-4 overflow-y-auto px-6 py-5">
            {/* Lead Chamado */}
            <div className="flex items-center justify-between rounded-xl border border-muted-foreground/10 bg-card p-4 shadow-sm">
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
            <div className="flex items-center justify-between rounded-xl border border-muted-foreground/10 bg-card p-4 shadow-sm">
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

            {/* ── MOTIVO DA DISPENSA ── */}
            {lead.status === "Dispensado" && (
              <div className="space-y-1.5 rounded-xl border border-red-500/20 bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-sm font-semibold tracking-tight">
                    Motivo da Dispensa
                  </p>
                </div>
                <p className="text-sm text-muted-foreground pl-[42px]">
                  {lead.motivo_dispensa || "Nenhum motivo informado."}
                </p>
              </div>
            )}

            {/* ── DADOS BÁSICOS ── */}
            <div className="rounded-xl border border-muted-foreground/10 bg-card p-4 shadow-sm space-y-4">
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

            <div className="rounded-xl border border-muted-foreground/10 bg-card p-4 shadow-sm space-y-4">
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

            <div className="rounded-xl border border-muted-foreground/10 bg-card p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  Oferta e venda
                </p>
              </div>

              {/* Tipo de comissão */}
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
                <div className="flex gap-2">
                  {(["interno", "externo"] as const).map((tipo) => {
                    const active = (editFormData.tipo_comissao ?? "interno") === tipo;
                    const opNome = editFormData.operadora_ofertada;
                    const comInfo = opNome ? commissionMap[opNome] : undefined;
                    const pct = comInfo ? (tipo === "externo" ? comInfo.externa : comInfo.interna) : null;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                          const newPct = comInfo ? (tipo === "externo" ? comInfo.externa : comInfo.interna) : 100;
                          const newValor = editFormData.valor_mensalidade
                            ? parseFloat((editFormData.valor_mensalidade * (newPct / 100)).toFixed(2))
                            : editFormData.valor_comissao ?? null;
                          setEditFormData({ ...editFormData, tipo_comissao: tipo, valor_comissao: newValor });
                        }}
                        className={cn(
                          "flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all capitalize",
                          active
                            ? "border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                            : "border-transparent bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                      >
                        {tipo}{pct !== null ? ` (${pct}%)` : ""}
                      </button>
                    );
                  })}
                </div>
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
                      className="flex items-center justify-center p-2 rounded border-2 transition-all"
                      style={{
                        backgroundColor: op.cor + "22",
                        borderColor:
                          editFormData.operadora_ofertada === op.nome &&
                            !operadoraCustom
                            ? op.cor
                            : "transparent",
                      }}
                      title={op.nome}
                    >
                      <Image
                        src={op.logo}
                        alt={op.nome}
                        width={80}
                        height={20}
                        className="h-5 w-auto object-contain"
                      />
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
          <DialogFooter className="border-t border-muted-foreground/10 bg-card px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              className="rounded-xl text-muted-foreground hover:text-foreground"
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
