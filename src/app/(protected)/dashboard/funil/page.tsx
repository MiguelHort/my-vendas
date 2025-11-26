// app/funil/page.tsx
"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

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
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Pencil } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneMask";

type Lead = {
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
};

const statusColumns = [
  {
    id: "Dispensado",
    title: "Dispensado",
    color: "bg-muted",
    tooltip: "Leads sem potencial de conversão",
  },
  {
    id: "Abordagem",
    title: "Abordagem",
    color: "bg-blue-500/10",
    tooltip: "Primeiro contato realizado",
  },
  {
    id: "Avaliando",
    title: "Avaliando",
    color: "bg-yellow-500/10",
    tooltip: "Lead interessado, em análise",
  },
  {
    id: "Fechamento",
    title: "Fechamento",
    color: "bg-purple-500/10",
    tooltip: "Negociação final em andamento",
  },
  {
    id: "Concluído",
    title: "Concluído",
    color: "bg-green-500/10",
    tooltip: "Venda realizada com sucesso",
  },
];

const FunilPage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [allLeads, setAllLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filtroFinalizados, setFiltroFinalizados] =
    React.useState<string>("este-mes");

  // Modal de dispensa
  const [showDispensaModal, setShowDispensaModal] = React.useState(false);
  const [dispensaLeadId, setDispensaLeadId] = React.useState<string>("");
  const [motivoDispensa, setMotivoDispensa] = React.useState<string>("");

  // Modal de edição
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingLead, setEditingLead] = React.useState<Lead | null>(null);
  const [editFormData, setEditFormData] =
    React.useState<Partial<Lead>>({});

  const getFilterDate = () => {
    const now = new Date();
    switch (filtroFinalizados) {
      case "7-dias": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d.toISOString();
      }
      case "15-dias": {
        const d = new Date(now);
        d.setDate(d.getDate() - 15);
        return d.toISOString();
      }
      case "este-mes":
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();
      case "3-meses": {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 3);
        return d.toISOString();
      }
      case "todo-historico":
        return null;
      default:
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();
    }
  };

  const fetchLeads = async () => {
    if (!firebaseUser) return;

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao carregar leads: " + (body.error || res.statusText)
        );
        setLoading(false);
        return;
      }

      const data: Lead[] = await res.json();
      setAllLeads(data || []);
      applyFilter(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (leadsData: Lead[]) => {
    const filterDate = getFilterDate();

    if (!filterDate) {
      // Todo o histórico
      setLeads(leadsData);
      return;
    }

    const filtered = leadsData.filter((lead) => {
      const statusAtivos = ["Abordagem", "Avaliando", "Fechamento"];
      const statusFinalizados = ["Dispensado", "Concluído"];

      if (statusAtivos.includes(lead.status)) {
        return true; // Sempre mostrar leads ativos
      }

      if (statusFinalizados.includes(lead.status)) {
        return new Date(lead.updated_at) >= new Date(filterDate);
      }

      return true;
    });

    setLeads(filtered);
  };

  React.useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loadingAuth]);

  React.useEffect(() => {
    applyFilter(allLeads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroFinalizados]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;

    if (!destination) return;

    const newStatus = destination.droppableId;
    const leadId = draggableId;

    // Se arrastar para "Dispensado", abrir modal
    if (newStatus === "Dispensado") {
      setDispensaLeadId(leadId);
      setShowDispensaModal(true);
      return;
    }

    if (!firebaseUser) return;

    // Atualização otimista
    const previousLeads = [...leads];
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(
        `/api/leads/status?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: leadId, status: newStatus }),
        }
      );

      if (!res.ok) {
        setLeads(previousLeads);
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao atualizar status: " + (body.error || res.statusText)
        );
      } else {
        toast.success("Status atualizado com sucesso!");
        // Atualiza allLeads também pra manter consistente
        setAllLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      toast.error("Erro ao atualizar status do lead");
    }
  };

  const handleConfirmDispensa = async () => {
    if (!motivoDispensa.trim()) {
      toast.error("Por favor, informe o motivo da dispensa");
      return;
    }
    if (!firebaseUser) return;

    const previousLeads = [...leads];

    // Atualização otimista
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === dispensaLeadId
          ? {
              ...lead,
              status: "Dispensado",
              motivo_dispensa: motivoDispensa,
            }
          : lead
      )
    );

    setShowDispensaModal(false);
    const tempMotivoDispensa = motivoDispensa;
    const tempLeadId = dispensaLeadId;
    setDispensaLeadId("");
    setMotivoDispensa("");

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(
        `/api/leads/dispensa?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: tempLeadId,
            motivo_dispensa: tempMotivoDispensa,
          }),
        }
      );

      if (!res.ok) {
        setLeads(previousLeads);
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao dispensar lead: " + (body.error || res.statusText)
        );
      } else {
        toast.success("Lead dispensado com sucesso!");
        // Atualiza allLeads também
        setAllLeads((prev) =>
          prev.map((lead) =>
            lead.id === tempLeadId
              ? {
                  ...lead,
                  status: "Dispensado",
                  motivo_dispensa: tempMotivoDispensa,
                }
              : lead
          )
        );
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      toast.error("Erro ao dispensar lead");
    }
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
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
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLead || !firebaseUser) return;

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(
        `/api/leads/update?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLead.id,
            ...editFormData,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao atualizar lead: " + (body.error || res.statusText)
        );
      } else {
        toast.success("Lead atualizado com sucesso!");
        setShowEditModal(false);
        setEditingLead(null);
        setEditFormData({});

        // Recarrega os leads para refletir as mudanças
        fetchLeads();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar lead");
    }
  };

  const getLeadsByStatus = (status: string) =>
    leads.filter((lead) => lead.status === status);

  const getHiddenCount = (status: string) => {
    if (!["Dispensado", "Concluído"].includes(status)) return 0;

    const allStatusLeads = allLeads.filter(
      (lead) => lead.status === status
    );
    const visibleStatusLeads = leads.filter(
      (lead) => lead.status === status
    );

    return allStatusLeads.length - visibleStatusLeads.length;
  };

  if (loadingAuth) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-lg font-semibold">
            Você precisa estar logado para ver o funil.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground mt-1">
              Arraste os cards para atualizar o status dos leads
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">
              Exibir Finalizados:
            </Label>
            <Select
              value={filtroFinalizados}
              onValueChange={setFiltroFinalizados}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="7-dias">Últimos 7 dias</SelectItem>
                <SelectItem value="15-dias">Últimos 15 dias</SelectItem>
                <SelectItem value="este-mes">Este Mês</SelectItem>
                <SelectItem value="3-meses">Últimos 3 meses</SelectItem>
                <SelectItem value="todo-historico">
                  Todo o Histórico
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {statusColumns.map((column) => {
              const hiddenCount = getHiddenCount(column.id);
              return (
                <div key={column.id} className="space-y-3">
                  <div
                    className={`${column.color} p-3 rounded-lg`}
                    title={column.tooltip}
                  >
                    <h3 className="font-semibold text-sm">
                      {column.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getLeadsByStatus(column.id).length} leads
                      {hiddenCount > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          (+{hiddenCount} ocultos)
                        </span>
                      )}
                    </p>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[200px]"
                      >
                        {getLeadsByStatus(column.id).map(
                          (lead, index) => (
                            <Draggable
                              key={lead.id}
                              draggableId={lead.id}
                              index={index}
                            >
                              {(provided) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="cursor-move p-0 hover:shadow-md transition-shadow relative group"
                                >
                                  <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-medium text-sm">
                                        {lead.nome}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditModal(lead);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="flex gap-2 flex-wrap mb-2">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {lead.origem}
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {lead.estado}
                                      </Badge>
                                      {lead.operadora_ofertada && (
                                        <Badge
                                          variant="default"
                                          className="text-xs bg-muted text-foreground"
                                        >
                                          {
                                            lead.operadora_ofertada
                                          }
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {new Date(
                                        lead.data_entrada
                                      ).toLocaleDateString("pt-BR")}
                                    </p>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          )
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>

        {/* Modal de Motivo da Dispensa */}
        <Dialog
          open={showDispensaModal}
          onOpenChange={setShowDispensaModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Motivo da Dispensa</DialogTitle>
              <DialogDescription>
                Por favor, informe o motivo pelo qual este lead está
                sendo dispensado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Ex: Cliente não tem interesse no momento, valores fora do orçamento..."
                value={motivoDispensa}
                onChange={(e) => setMotivoDispensa(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDispensaModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmDispensa}>
                Confirmar Dispensa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Lead */}
        <Dialog
          open={showEditModal}
          onOpenChange={setShowEditModal}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Lead</DialogTitle>
              <DialogDescription>
                Atualize as informações do lead
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                      <SelectItem value="Lead Novo">
                        Lead Novo
                      </SelectItem>
                      <SelectItem value="Retrabalho">
                        Retrabalho
                      </SelectItem>
                      <SelectItem value="Ligação">
                        Ligação
                      </SelectItem>
                      <SelectItem value="Indicação">
                        Indicação
                      </SelectItem>
                      <SelectItem value="Presencial">
                        Presencial
                      </SelectItem>
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
                      <SelectItem value="RJ">
                        Rio de Janeiro
                      </SelectItem>
                      <SelectItem value="MG">
                        Minas Gerais
                      </SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="RS">
                        Rio Grande do Sul
                      </SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="SC">
                        Santa Catarina
                      </SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="ES">
                        Espírito Santo
                      </SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="RN">
                        Rio Grande do Norte
                      </SelectItem>
                      <SelectItem value="MT">
                        Mato Grosso
                      </SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="DF">
                        Distrito Federal
                      </SelectItem>
                      <SelectItem value="MS">
                        Mato Grosso do Sul
                      </SelectItem>
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
                      telefone: formatPhoneNumber(
                        e.target.value
                      ),
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
                      value={
                        editFormData.tempo_plano_anterior || ""
                      }
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
                    <SelectItem value="Empresarial">
                      Empresarial
                    </SelectItem>
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
                    <SelectItem value="Enfermaria">
                      Enfermaria
                    </SelectItem>
                    <SelectItem value="Apartamento">
                      Apartamento
                    </SelectItem>
                    <SelectItem value="Ambulatorial">
                      Ambulatorial
                    </SelectItem>
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
                      <SelectItem value="Parcial">
                        Parcial
                      </SelectItem>
                      <SelectItem value="Isenta">
                        Isenta
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FunilPage;
