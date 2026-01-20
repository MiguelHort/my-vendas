// app/funil/page.tsx
"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

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

import LeadCard, { Lead } from "@/components/LeadCard";

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
    color: "bg-blue-500/20",
    tooltip: "Primeiro contato realizado",
  },
  {
    id: "Avaliando",
    title: "Avaliando",
    color: "bg-yellow-500/20",
    tooltip: "Lead interessado, em análise",
  },
  {
    id: "Fechamento",
    title: "Fechamento",
    color: "bg-purple-500/20",
    tooltip: "Negociação final em andamento",
  },
  {
    id: "Concluído",
    title: "Concluído",
    color: "bg-green-500/20",
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

  // Modal de conclusão (comissão + data)
  const [showConclusaoModal, setShowConclusaoModal] = React.useState(false);
  const [conclusaoLeadId, setConclusaoLeadId] = React.useState<string>("");
  const [valorComissaoInput, setValorComissaoInput] =
    React.useState<string>("");
  const [dataVendaInput, setDataVendaInput] = React.useState<string>("");

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
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case "3-meses": {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 3);
        return d.toISOString();
      }
      case "todo-historico":
        return null;
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
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

    // Se arrastar para "Dispensado", abrir modal de dispensa
    if (newStatus === "Dispensado") {
      setDispensaLeadId(leadId);
      setShowDispensaModal(true);
      return;
    }

    // Se arrastar para "Concluído", abrir modal de comissão + data
    if (newStatus === "Concluído") {
      setConclusaoLeadId(leadId);
      setValorComissaoInput("");
      setDataVendaInput("");
      setShowConclusaoModal(true);
      return;
    }

    if (!firebaseUser) return;

    // Atualização otimista para outros status
    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

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

      const res = await fetch(`/api/leads/status?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });

      if (!res.ok) {
        setLeads(previousLeads);
        setAllLeads(previousAllLeads);
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao atualizar status: " + (body.error || res.statusText)
        );
      } else {
        toast.success("Status atualizado com sucesso!");
        setAllLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      setAllLeads(previousAllLeads);
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
    const previousAllLeads = [...allLeads];

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
    setAllLeads((prev) =>
      prev.map((lead) =>
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

      const res = await fetch(`/api/leads/dispensa?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tempLeadId,
          motivo_dispensa: tempMotivoDispensa,
        }),
      });

      if (!res.ok) {
        setLeads(previousLeads);
        setAllLeads(previousAllLeads);
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao dispensar lead: " + (body.error || res.statusText)
        );
      } else {
        toast.success("Lead dispensado com sucesso!");
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      setAllLeads(previousAllLeads);
      toast.error("Erro ao dispensar lead");
    }
  };

  const handleConfirmConclusao = async () => {
    if (!valorComissaoInput.trim() || !dataVendaInput.trim()) {
      toast.error("Informe o valor da comissão e a data da venda.");
      return;
    }
    if (!firebaseUser) return;

    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

    const tempLeadId = conclusaoLeadId;
    const valorNumber = parseFloat(
      valorComissaoInput.replace(".", "").replace(",", ".")
    );

    // converte "YYYY-MM-DD" para ISO (DateTime)
    const dataVendaISO = dataVendaInput
      ? new Date(dataVendaInput + "T00:00:00").toISOString()
      : null;

    setShowConclusaoModal(false);
    setConclusaoLeadId("");
    setValorComissaoInput("");
    setDataVendaInput("");

    // Atualização otimista
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === tempLeadId
          ? {
              ...lead,
              status: "Concluído",
              valor_comissao: isNaN(valorNumber) ? null : valorNumber,
              data_venda: dataVendaISO,
            }
          : lead
      )
    );

    setAllLeads((prev) =>
      prev.map((lead) =>
        lead.id === tempLeadId
          ? {
              ...lead,
              status: "Concluído",
              valor_comissao: isNaN(valorNumber) ? null : valorNumber,
              data_venda: dataVendaISO,
            }
          : lead
      )
    );

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      // 1) Atualiza STATUS no /status
      const resStatus = await fetch(`/api/leads/status?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tempLeadId,
          status: "Concluído",
        }),
      });

      // 2) Atualiza COMISSÃO + DATA no /update
      const resUpdate = await fetch(`/api/leads/update?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tempLeadId,
          valor_comissao: isNaN(valorNumber) ? null : valorNumber,
          data_venda: dataVendaISO,
        }),
      });

      if (!resStatus.ok || !resUpdate.ok) {
        setLeads(previousLeads);
        setAllLeads(previousAllLeads);

        const badRes = !resStatus.ok ? resStatus : resUpdate;
        const body = await badRes.json().catch(() => ({}));

        toast.error(
          "Erro ao concluir lead: " + (body.error || badRes.statusText)
        );
      } else {
        toast.success("Lead concluído com sucesso!");
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      setAllLeads(previousAllLeads);
      toast.error("Erro ao concluir lead");
    }
  };

  const getLeadsByStatus = (status: string) =>
    leads.filter((lead) => lead.status === status);

  const getHiddenCount = (status: string) => {
    if (!["Dispensado", "Concluído"].includes(status)) return 0;

    const allStatusLeads = allLeads.filter((lead) => lead.status === status);
    const visibleStatusLeads = leads.filter((lead) => lead.status === status);

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
                <SelectItem value="todo-historico">Todo o Histórico</SelectItem>
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
                    <h3 className="font-semibold text-sm">{column.title}</h3>
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
                        {getLeadsByStatus(column.id).map((lead, index) => (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={index}
                            isDragDisabled={lead.status === "Concluído"}
                          >
                            {(providedDraggable) => (
                              <div
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                {...providedDraggable.dragHandleProps}
                              >
                                <LeadCard
                                  lead={lead}
                                  firebaseUser={{
                                    uid: firebaseUser.uid,
                                    email: firebaseUser.email,
                                    displayName: firebaseUser.displayName,
                                  }}
                                  onRefreshLeads={fetchLeads}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
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
        <Dialog open={showDispensaModal} onOpenChange={setShowDispensaModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Motivo da Dispensa</DialogTitle>
              <DialogDescription>
                Por favor, informe o motivo pelo qual este lead está sendo
                dispensado.
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

        {/* Modal de Conclusão (Comissão + Data de Venda) */}
        <Dialog open={showConclusaoModal} onOpenChange={setShowConclusaoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Concluir Venda</DialogTitle>
              <DialogDescription>
                Informe o valor da comissão recebida e a data da venda.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Valor da Comissão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 350.00"
                  value={valorComissaoInput}
                  onChange={(e) => setValorComissaoInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Input
                  type="date"
                  value={dataVendaInput}
                  onChange={(e) => setDataVendaInput(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConclusaoModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmConclusao}>
                Confirmar Conclusão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FunilPage;
