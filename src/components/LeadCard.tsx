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
import { Pencil, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { formatPhoneNumber } from "@/lib/phoneMask";
import WhatsappIcon from "@/components/icons/WhatsappIcon";

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
  // novos campos
  valor_comissao: number | null;
  data_venda: string | null; // ISO string (DateTime no Prisma)
  last_chamado_at: string | null; // última vez que o lead foi chamado
};

type LeadCardProps = {
  lead: Lead;
  firebaseUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  /**
   * Função para o pai recarregar a lista de leads (ex: fetchLeads).
   */
  onRefreshLeads: () => void;
};

/**
 * Card de Lead reutilizável, com:
 * - visual do card
 * - cores/badge de "tempo desde o último chamado"
 * - botão de WhatsApp
 * - modal de edição completo
 * - botão "Lead Chamado"
 */
const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  firebaseUser,
  onRefreshLeads,
}) => {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<Partial<Lead>>({});

  // Cálculo da tag do card com base no tempo desde o último chamado
  const getLeadWaitTime = (lead: Lead) => {
    // Só faz sentido colorir leads ativos
    if (["Dispensado", "Concluído"].includes(lead.status)) {
      return "";
    }

    if (!lead.last_chamado_at) {
      // Nunca foi chamado -> vermelho forte
      return "Nunca";
    }

    const last = new Date(lead.last_chamado_at);
    if (Number.isNaN(last.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 24) return ""; // branco
    if (diffHours <= 48) return "24 - 48h"; // vermelho claro
    if (diffHours <= 72) return "48 - 72h"; // vermelho intermediário

    return "72h+"; // vermelho forte
  };

  // Cálculo da cor do card com base no tempo desde o último chamado
  const getLeadCardColor = (lead: Lead) => {
    // Só faz sentido colorir leads ativos
    if (["Dispensado", "Concluído"].includes(lead.status)) {
      return "";
    }

    if (!lead.last_chamado_at) {
      // Nunca foi chamado -> vermelho forte
      return "#b91c1c";
    }

    const last = new Date(lead.last_chamado_at);
    if (Number.isNaN(last.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 24) return ""; // branco
    if (diffHours <= 48) return "#f87171"; // vermelho claro
    if (diffHours <= 72) return "#ef4444"; // vermelho intermediário

    return "#b91c1c"; // vermelho forte
  };

  // Abre WhatsApp com base no telefone do lead
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

    let waNumber = digits;

    // se não vier com DDI, assume Brasil (55)
    if (!waNumber.startsWith("55")) {
      waNumber = "55" + waNumber;
    }

    const url = `https://wa.me/${waNumber}`;
    window.open(url, "_blank");
  };

  const handleOpenEditModal = () => {
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
      // novos campos
      valor_comissao: lead.valor_comissao,
      data_venda: lead.data_venda,
      last_chamado_at: lead.last_chamado_at,
      status: lead.status,
    });
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
          data_venda: editFormData.data_venda ?? null,
          last_chamado_at: editFormData.last_chamado_at ?? null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao atualizar lead: " + (body.error || res.statusText)
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

  // Marca que o lead foi chamado agora
  const handleMarkLeadChamado = async () => {
    if (!firebaseUser) return;

    const nowISO = new Date().toISOString();

    setEditFormData((prev) => ({
      ...prev,
      last_chamado_at: nowISO,
    }));

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
          last_chamado_at: nowISO,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao marcar lead como chamado: " + (body.error || res.statusText)
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

  return (
    <>
      {/* CARD VISUAL */}
      <Card
        className="cursor-move p-0 hover:shadow-md transition-shadow relative group"
        style={{
          borderLeftWidth: "5px",
          borderLeftColor: getLeadCardColor(lead),
        }}
      >
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium text-sm">{lead.nome}</p>

            <div className="flex items-center gap-1">
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

          <div className="flex gap-2 flex-wrap mb-2">
            <Badge variant="outline" className="text-xs">
              {lead.origem}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {lead.estado}
            </Badge>
            {lead.operadora_ofertada && (
              <Badge
                variant="default"
                className="text-xs bg-muted text-foreground"
              >
                {lead.operadora_ofertada}
              </Badge>
            )}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {new Date(lead.data_entrada).toLocaleDateString("pt-BR")}
            </p>
            <Badge
              variant="outline"
              style={{ borderColor: getLeadCardColor(lead) }}
            >
              {getLeadWaitTime(lead)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO DE LEAD (ESPECÍFICO DO CARD) */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
            <DialogDescription>Atualize as informações do lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              {editFormData.last_chamado_at && (
                <p className="text-xs text-muted-foreground">
                  Última vez chamado:{" "}
                  {new Date(
                    editFormData.last_chamado_at
                  ).toLocaleString("pt-BR")}
                </p>
              )}
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

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={editFormData.nome || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    nome: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Select
                  value={editFormData.origem || ""}
                  onValueChange={(value) =>
                    setEditFormData({
                      ...editFormData,
                      origem: value,
                    })
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
                    setEditFormData({
                      ...editFormData,
                      estado: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[300px]">
                    <SelectItem value="SP">São Paulo</SelectItem>
                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                    <SelectItem value="MG">Minas Gerais</SelectItem>
                    <SelectItem value="BA">Bahia</SelectItem>
                    <SelectItem value="PR">Paraná</SelectItem>
                    <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                    <SelectItem value="PE">Pernambuco</SelectItem>
                    <SelectItem value="CE">Ceará</SelectItem>
                    <SelectItem value="SC">Santa Catarina</SelectItem>
                    <SelectItem value="GO">Goiás</SelectItem>
                    <SelectItem value="MA">Maranhão</SelectItem>
                    <SelectItem value="ES">Espírito Santo</SelectItem>
                    <SelectItem value="PB">Paraíba</SelectItem>
                    <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                    <SelectItem value="MT">Mato Grosso</SelectItem>
                    <SelectItem value="AL">Alagoas</SelectItem>
                    <SelectItem value="PI">Piauí</SelectItem>
                    <SelectItem value="DF">Distrito Federal</SelectItem>
                    <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                    <SelectItem value="SE">Sergipe</SelectItem>
                    <SelectItem value="RO">Rondônia</SelectItem>
                    <SelectItem value="TO">Tocantins</SelectItem>
                    <SelectItem value="AC">Acre</SelectItem>
                    <SelectItem value="AP">Amapá</SelectItem>
                    <SelectItem value="RR">Roraima</SelectItem>
                    <SelectItem value="AM">Amazonas</SelectItem>
                    <SelectItem value="PA">Pará</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={editFormData.cidade || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    cidade: e.target.value,
                  })
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
                  setEditFormData({
                    ...editFormData,
                    possui_cnpj: checked,
                  })
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

            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select
                value={editFormData.modalidade || ""}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    modalidade: value,
                  })
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

            <div className="space-y-2">
              <Label>Operadora Ofertada</Label>
              <Input
                value={editFormData.operadora_ofertada || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    operadora_ofertada: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Acomodação</Label>
              <Select
                value={editFormData.acomodacao || ""}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    acomodacao: value,
                  })
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

            {/* NOVOS CAMPOS NO MODAL DE EDIÇÃO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Comissão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.valor_comissao ?? ""}
                  disabled={editFormData.status === "Concluído"}
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
                  disabled={editFormData.status === "Concluído"}
                  onChange={(e) => {
                    const value = e.target.value; // YYYY-MM-DD
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