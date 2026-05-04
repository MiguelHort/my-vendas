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
import { Pencil, CheckCheck, StickyNote, X, Plus } from "lucide-react";
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
  { label: "Vermelho", value: "#ef4444" },
  { label: "Laranja", value: "#f97316" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Verde", value: "#22c55e" },
  { label: "Ciano", value: "#06b6d4" },
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

// ========================
// COMPONENTE PRINCIPAL
// ========================

const LeadCard: React.FC<LeadCardProps> = ({ lead, firebaseUser, onRefreshLeads }) => {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<Partial<Lead>>({});

  // estado local para gerenciar etiquetas no modal
  const [novaEtiquetaLabel, setNovaEtiquetaLabel] = React.useState("");
  const [novaEtiquetaCor, setNovaEtiquetaCor] = React.useState(ETIQUETA_PRESET_COLORS[0]);
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
    window.open(`https://wa.me/${digits.startsWith("55") ? digits : "55" + digits}`, "_blank");
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
        toast.error("Erro ao atualizar lead: " + (body.error || res.statusText));
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
        toast.error("Erro ao marcar lead como chamado: " + (body.error || res.statusText));
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

  return (
    <>
      {/* CARD VISUAL */}
      <Card
        className="cursor-move p-0 hover:shadow-md transition-shadow relative group"
        style={{
          borderLeftWidth: "5px",
          borderLeftColor: retornouAgora ? "#f59e0b" : cardBorderColor || undefined,
          ...(retornouAgora ? { boxShadow: "0 0 0 2px #f59e0b55" } : {}),
          ...(lead.card_color
            ? { backgroundColor: lead.card_color + "18" }
            : {}),
        }}
      >
        <CardContent className="p-3">
          {/* Header: nome + ações */}
          <div className="flex justify-between items-start mb-1.5">
            <p className="font-medium text-sm leading-snug pr-1">{lead.nome}</p>

            <div className="flex items-center gap-0.5 shrink-0">
              {lead.notas && (
                <span title={lead.notas}>
                  <StickyNote className="h-3 w-3 text-amber-500 opacity-70" />
                </span>
              )}
              {lead.telefone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    openWhatsApp(lead.telefone);
                  }}
                >
                  <WhatsappIcon />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal();
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Badges de origem, estado, operadora */}
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            <Badge variant="outline" className="text-xs py-0 px-1.5">
              {lead.origem}
            </Badge>
            <Badge variant="secondary" className="text-xs py-0 px-1.5">
              {lead.estado}
            </Badge>
            {lead.operadora_ofertada && (
              <Badge
                className="text-xs py-0 px-1.5 border-0"
                style={
                  operadoraInfo
                    ? {
                        backgroundColor: operadoraInfo.cor,
                        color: operadoraInfo.textoCor,
                      }
                    : { backgroundColor: "#6b7280", color: "#fff" }
                }
              >
                {lead.operadora_ofertada}
              </Badge>
            )}
          </div>

          {/* Etiquetas */}
          {etiquetasCard.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-1.5">
              {etiquetasCard.map((et, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: et.color }}
                >
                  {et.label}
                </span>
              ))}
            </div>
          )}

          {/* Footer: data + badge de tempo */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {new Date(lead.data_entrada).toLocaleDateString("pt-BR")}
            </p>
            {retornouAgora ? (
              <Badge className="text-xs bg-amber-500 text-white border-0 py-0 px-1.5">
                Retornou!
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs py-0 px-1.5"
                style={
                  cardBorderColor
                    ? { borderColor: cardBorderColor }
                    : { border: "none" }
                }
              >
                {getLeadWaitTime(lead)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
            <DialogDescription>Atualize as informações do lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Lead Chamado */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Último contato</p>
                {editFormData.last_chamado_at ? (
                  <p className="text-xs text-muted-foreground">
                    {new Date(editFormData.last_chamado_at).toLocaleString("pt-BR")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Nunca chamado</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkLeadChamado}
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Lead Chamado
              </Button>
            </div>

            {/* ── PERSONALIZAÇÃO DO CARD ── */}
            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-sm font-semibold">Personalização do Card</p>

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
                        setEditFormData({ ...editFormData, card_color: c.value || null })
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
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEtiqueta(); } }}
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
                          borderColor: novaEtiquetaCor === cor ? "#000" : "transparent",
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
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={editFormData.nome || ""}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Select
                  value={editFormData.origem || ""}
                  onValueChange={(value) => setEditFormData({ ...editFormData, origem: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  onValueChange={(value) => setEditFormData({ ...editFormData, estado: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover max-h-[300px]">
                    {["SP","RJ","MG","BA","PR","RS","PE","CE","SC","GO","MA","ES","PB","RN","MT","AL","PI","DF","MS","SE","RO","TO","AC","AP","RR","AM","PA"].map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={editFormData.cidade || ""}
                onChange={(e) => setEditFormData({ ...editFormData, cidade: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone/WhatsApp</Label>
              <Input
                type="tel"
                placeholder="(11) 98765-4321"
                value={editFormData.telefone || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, telefone: formatPhoneNumber(e.target.value) })
                }
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd. Vidas *</Label>
                <Input
                  type="number"
                  value={editFormData.qtd_vidas ?? ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, qtd_vidas: parseInt(e.target.value || "0") })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Idades *</Label>
                <Input
                  value={editFormData.idades || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, idades: e.target.value })}
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
                  setEditFormData({ ...editFormData, tem_plano_anterior: checked })
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
                      setEditFormData({ ...editFormData, operadora_anterior: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tempo no Plano Anterior</Label>
                  <Input
                    value={editFormData.tempo_plano_anterior || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, tempo_plano_anterior: e.target.value })
                    }
                    placeholder="Ex: 2 anos"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select
                value={editFormData.modalidade || ""}
                onValueChange={(value) => setEditFormData({ ...editFormData, modalidade: value })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                      setEditFormData({ ...editFormData, operadora_ofertada: op.nome });
                      setOperadoraCustom(false);
                    }}
                    className="px-2 py-1.5 rounded text-xs font-medium border-2 transition-all text-left"
                    style={{
                      backgroundColor: op.cor + "22",
                      borderColor:
                        editFormData.operadora_ofertada === op.nome && !operadoraCustom
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
                      setEditFormData({ ...editFormData, operadora_ofertada: "" });
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
                    setEditFormData({ ...editFormData, operadora_ofertada: e.target.value })
                  }
                />
              )}
              {editFormData.operadora_ofertada && !operadoraCustom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-6 px-2"
                  onClick={() => setEditFormData({ ...editFormData, operadora_ofertada: null })}
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
                onValueChange={(value) => setEditFormData({ ...editFormData, acomodacao: value })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                      valor_mensalidade: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Coparticipação</Label>
                <Select
                  value={editFormData.coparticipacao || ""}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, coparticipacao: value })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                      valor_comissao: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Input
                  type="date"
                  value={editFormData.data_venda ? editFormData.data_venda.substring(0, 10) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditFormData({
                      ...editFormData,
                      data_venda: value ? new Date(value + "T00:00:00").toISOString() : null,
                    });
                  }}
                />
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadCard;
