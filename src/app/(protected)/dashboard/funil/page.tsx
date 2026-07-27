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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Filter,
  XCircle,
  CheckCircle2,
  Clock,
  Workflow,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";

import Image from "next/image";
import LeadCard, { Lead, OPERADORAS } from "@/components/LeadCard";

// ========================
// TIPOS
// ========================

type FunnelColumn = {
  id: string;
  title: string;
  color: string;
};

// ========================
// MINIMAPA
// ========================

const MINIMAP_W = 260;
const MINIMAP_H = 72;   // altura do canvas
const COL_W = 240;
const COL_GAP = 12;
const MM_PAD = 10;

function KanbanMinimap({
  scrollContainer,
  columns,
  getLeadCount,
}: {
  scrollContainer: HTMLDivElement | null;
  columns: FunnelColumn[];
  getLeadCount: (id: string) => number;
}) {
  const [scroll, setScroll] = React.useState({ left: 0, clientW: 0, totalW: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);

  React.useEffect(() => {
    if (!scrollContainer) return;
    const update = () =>
      setScroll({
        left: scrollContainer.scrollLeft,
        clientW: scrollContainer.clientWidth,
        totalW: scrollContainer.scrollWidth,
      });
    update();
    scrollContainer.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(scrollContainer);
    return () => {
      scrollContainer.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollContainer]);

  const { left, clientW, totalW } = scroll;
  if (!totalW || !clientW || totalW <= clientW) return null;

  const canvasW = MINIMAP_W - MM_PAD * 2;
  const scale = canvasW / totalW;
  const vpW = Math.max(clientW * scale, 24);
  const vpX = Math.min(left * scale, canvasW - vpW);
  const maxLeads = Math.max(...columns.map((c) => getLeadCount(c.id)), 1);

  // Barra de progresso no rodapé
  const progressLeft = (left / totalW) * 100;
  const progressWidth = (clientW / totalW) * 100;

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const startMouseX = e.clientX;
    const startScrollLeft = scrollContainer!.scrollLeft;
    const onMove = (ev: PointerEvent) => {
      if (!el.hasPointerCapture(ev.pointerId)) return;
      const delta = ev.clientX - startMouseX;
      scrollContainer!.scrollLeft = Math.max(0, startScrollLeft + delta / scale);
    };
    const onUp = (ev: PointerEvent) => {
      setIsDragging(false);
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  const colH = MINIMAP_H - MM_PAD * 2;

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none" style={{ width: MINIMAP_W }}>
      <div
        className="rounded-2xl overflow-hidden backdrop-blur-xl"
        style={{
          background: "rgba(var(--background), 0.96)",
          border: `1px solid ${isDragging ? "rgba(59,130,246,0.45)" : "rgba(var(--border), 0.5)"}`,
          boxShadow: isDragging
            ? "0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(59,130,246,0.1)"
            : "0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2.5 px-3.5 pt-2.5 pb-2">
          {/* Três bolinhas decorativas */}
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-400/50" />
            <div className="w-2 h-2 rounded-full bg-amber-400/50" />
            <div className="w-2 h-2 rounded-full bg-emerald-400/50" />
          </div>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70 leading-none">
            Navegação
          </span>
          <div className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground/40 font-medium">
            <span>{columns.length}</span>
            <span>colunas</span>
          </div>
        </div>

        {/* ── Separador ── */}
        <div style={{ height: 1, background: "rgba(var(--border), 0.25)", margin: "0 14px" }} />

        {/* ── Canvas ── */}
        <div
          className="relative"
          style={{
            height: MINIMAP_H,
            padding: `${MM_PAD}px ${MM_PAD}px`,
            background: "rgba(var(--muted), 0.15)",
          }}
        >
          {/* Colunas em escala */}
          {columns.map((col, i) => {
            const x = i * (COL_W + COL_GAP) * scale;
            const w = Math.max(COL_W * scale - 1, 3);
            const count = getLeadCount(col.id);
            const fillH = count > 0 ? Math.max((count / maxLeads) * (colH - 5), 5) : 0;

            return (
              <div
                key={col.id}
                style={{
                  position: "absolute",
                  left: x,
                  top: 0,
                  width: w,
                  height: colH,
                  borderRadius: 4,
                  overflow: "hidden",
                  backgroundColor: col.color + "16",
                }}
              >
                {/* Acento colorido no topo */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: col.color,
                    borderRadius: "4px 4px 0 0",
                    opacity: 0.85,
                  }}
                />
                {/* Barra de preenchimento proporcional ao número de leads */}
                {count > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: fillH,
                      background: `linear-gradient(to top, ${col.color}55, ${col.color}18)`,
                      borderRadius: "0 0 4px 4px",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* ── Viewport indicator ── */}
          <div
            onPointerDown={handleViewportPointerDown}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: vpX,
              width: vpW,
              borderRadius: 5,
              backgroundColor: isDragging
                ? "rgba(59,130,246,0.14)"
                : isHovering
                ? "rgba(59,130,246,0.10)"
                : "rgba(59,130,246,0.06)",
              border: `2px solid rgba(59,130,246,${isDragging ? 0.9 : isHovering ? 0.7 : 0.45})`,
              boxShadow: isDragging
                ? "0 0 10px rgba(59,130,246,0.25), inset 0 0 6px rgba(59,130,246,0.05)"
                : isHovering
                ? "0 0 6px rgba(59,130,246,0.15)"
                : "none",
              cursor: isDragging ? "grabbing" : "grab",
              transition: isDragging ? "none" : "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Grip: 2×3 pontos */}
            {vpW > 22 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gridTemplateRows: "repeat(3, 1fr)",
                  gap: 3,
                  opacity: isDragging ? 0.9 : isHovering ? 0.65 : 0.3,
                  transition: "opacity 0.15s",
                }}
              >
                {Array.from({ length: 6 }).map((_, j) => (
                  <div
                    key={j}
                    style={{
                      width: 2.5,
                      height: 2.5,
                      borderRadius: "50%",
                      backgroundColor: "rgb(59,130,246)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Barra de progresso no rodapé ── */}
        <div style={{ height: 3, background: "rgba(var(--muted), 0.3)", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${progressLeft}%`,
              width: `${progressWidth}%`,
              background: "rgba(59,130,246,0.55)",
              borderRadius: 99,
              transition: isDragging ? "none" : "left 0.1s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ========================
// COLUNAS FIXAS
// ========================

const FIXED_COLUMNS: FunnelColumn[] = [
  { id: "Backlog", title: "Backlog", color: "#94a3b8" },
  { id: "Triagem", title: "Triagem", color: "#6366f1" },
  { id: "Cotação", title: "Cotação", color: "#3b82f6" },
  { id: "Avaliando", title: "Avaliando", color: "#eab308" },
  { id: "Fechamento", title: "Fechamento", color: "#8b5cf6" },
  { id: "Concluído", title: "Concluído", color: "#22c55e" },
  { id: "Retornar", title: "Retornar Futuramente", color: "#f59e0b" },
  { id: "Dispensado", title: "Dispensado", color: "#6b7280" },
];

// ========================
// PAGE
// ========================

const FunilPage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [allLeads, setAllLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filtroFinalizados, setFiltroFinalizados] =
    React.useState<string>("este-mes");
  const [cardSort, setCardSort] = React.useState<"sem-atividade" | "data-criacao">("sem-atividade");

  const [commissionMap, setCommissionMap] = React.useState<Record<string, { interna: number; externa: number }>>({});

  // Scroll container para o minimapa
  const [scrollContainer, setScrollContainer] = React.useState<HTMLDivElement | null>(null);

  // Modal de dispensa
  const [showDispensaModal, setShowDispensaModal] = React.useState(false);
  const [dispensaLeadId, setDispensaLeadId] = React.useState<string>("");
  const [motivoDispensa, setMotivoDispensa] = React.useState<string>("");

  // Modal de conclusão
  const [showConclusaoModal, setShowConclusaoModal] = React.useState(false);
  const [conclusaoLeadId, setConclusaoLeadId] = React.useState<string>("");
  const [valorComissaoInput, setValorComissaoInput] = React.useState<string>("");
  const [dataVendaInput, setDataVendaInput] = React.useState<string>("");

  // Modal de "Retornar Futuramente" (Feature 5)
  const [showRetornarModal, setShowRetornarModal] = React.useState(false);
  const [retornarLeadId, setRetornarLeadId] = React.useState<string>("");
  const [retornarData, setRetornarData] = React.useState<string>("");

  // ========================
  // FILTRO DE DATAS
  // ========================

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

  // ========================
  // FETCH
  // ========================

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
        toast.error("Erro ao carregar leads: " + (body.error || res.statusText));
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
      setLeads(leadsData);
      return;
    }

    const filtered = leadsData.filter((lead) => {
      // Sempre mostra leads ativos (qualquer status que não seja finalizado)
      if (!["Dispensado", "Concluído"].includes(lead.status)) return true;
      // Finalizados só dentro do período selecionado
      return new Date(lead.updated_at) >= new Date(filterDate);
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

  React.useEffect(() => {
    if (!firebaseUser) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/configuracoes/comissoes?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { operadora: string; comissao_interna: number; comissao_externa: number }[]) => {
        const map: Record<string, { interna: number; externa: number }> = {};
        data.forEach((r) => { map[r.operadora] = { interna: r.comissao_interna, externa: r.comissao_externa }; });
        setCommissionMap(map);
      })
      .catch(() => {/* silently ignore */});
  }, [firebaseUser]);

  // ========================
  // DRAG & DROP
  // ========================

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId;
    const leadId = draggableId;

    if (newStatus === "Dispensado") {
      setDispensaLeadId(leadId);
      setShowDispensaModal(true);
      return;
    }

    if (newStatus === "Concluído") {
      const lead = leads.find((l) => l.id === leadId);
      const comInfo = lead?.operadora_ofertada ? commissionMap[lead.operadora_ofertada] : undefined;
      const pct = comInfo
        ? (lead?.tipo_comissao === "externo" ? comInfo.externa : comInfo.interna)
        : 100;
      const calc = lead?.valor_mensalidade
        ? lead.valor_mensalidade * (pct / 100)
        : 0;
      setConclusaoLeadId(leadId);
      setValorComissaoInput(calc > 0 ? calc.toFixed(2) : "");
      setDataVendaInput(new Date().toISOString().substring(0, 10));
      setShowConclusaoModal(true);
      return;
    }

    if (newStatus === "Retornar") {
      setRetornarLeadId(leadId);
      setRetornarData("");
      setShowRetornarModal(true);
      return;
    }

    if (!firebaseUser) return;

    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
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
        toast.error("Erro ao atualizar status: " + (body.error || res.statusText));
      } else {
        toast.success("Status atualizado com sucesso!");
        setAllLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      setAllLeads(previousAllLeads);
      toast.error("Erro ao atualizar status do lead");
    }
  };

  // ========================
  // DISPENSA
  // ========================

  const handleConfirmDispensa = async () => {
    if (!motivoDispensa.trim()) {
      toast.error("Por favor, informe o motivo da dispensa");
      return;
    }
    if (!firebaseUser) return;

    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

    setLeads((prev) =>
      prev.map((l) =>
        l.id === dispensaLeadId
          ? { ...l, status: "Dispensado", motivo_dispensa: motivoDispensa }
          : l
      )
    );
    setAllLeads((prev) =>
      prev.map((l) =>
        l.id === dispensaLeadId
          ? { ...l, status: "Dispensado", motivo_dispensa: motivoDispensa }
          : l
      )
    );

    setShowDispensaModal(false);
    const tempMotivo = motivoDispensa;
    const tempId = dispensaLeadId;
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
        body: JSON.stringify({ id: tempId, motivo_dispensa: tempMotivo }),
      });

      if (!res.ok) {
        setLeads(previousLeads);
        setAllLeads(previousAllLeads);
        const body = await res.json().catch(() => ({}));
        toast.error("Erro ao dispensar lead: " + (body.error || res.statusText));
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

  // ========================
  // CONCLUSÃO
  // ========================

  const handleConfirmConclusao = async () => {
    if (!dataVendaInput.trim()) {
      toast.error("Informe a data da venda.");
      return;
    }
    if (!firebaseUser) return;

    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

    const tempId = conclusaoLeadId;
    const valorNumber = parseFloat(valorComissaoInput);
    const dataVendaISO = dataVendaInput
      ? new Date(dataVendaInput + "T00:00:00").toISOString()
      : null;

    setShowConclusaoModal(false);
    setConclusaoLeadId("");
    setValorComissaoInput("");
    setDataVendaInput("");

    setLeads((prev) =>
      prev.map((l) =>
        l.id === tempId
          ? {
              ...l,
              status: "Concluído",
              valor_comissao: isNaN(valorNumber) ? null : valorNumber,
              data_venda: dataVendaISO,
            }
          : l
      )
    );
    setAllLeads((prev) =>
      prev.map((l) =>
        l.id === tempId
          ? {
              ...l,
              status: "Concluído",
              valor_comissao: isNaN(valorNumber) ? null : valorNumber,
              data_venda: dataVendaISO,
            }
          : l
      )
    );

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const [resStatus, resUpdate] = await Promise.all([
        fetch(`/api/leads/status?${params.toString()}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tempId, status: "Concluído" }),
        }),
        fetch(`/api/leads/update?${params.toString()}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: tempId,
            valor_comissao: isNaN(valorNumber) ? null : valorNumber,
            data_venda: dataVendaISO,
          }),
        }),
      ]);

      if (!resStatus.ok || !resUpdate.ok) {
        setLeads(previousLeads);
        setAllLeads(previousAllLeads);
        toast.error("Erro ao concluir lead");
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

  // ========================
  // RETORNAR FUTURAMENTE (Feature 5)
  // ========================

  const handleConfirmRetornar = async () => {
    if (!retornarData) {
      toast.error("Selecione a data de retorno");
      return;
    }
    if (!firebaseUser) return;

    const retornarISO = new Date(retornarData + "T00:00:00").toISOString();
    const tempId = retornarLeadId;

    setShowRetornarModal(false);
    setRetornarLeadId("");
    setRetornarData("");

    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

    setLeads((prev) =>
      prev.map((l) =>
        l.id === tempId ? { ...l, status: "Retornar", retornar_em: retornarISO } : l
      )
    );
    setAllLeads((prev) =>
      prev.map((l) =>
        l.id === tempId ? { ...l, status: "Retornar", retornar_em: retornarISO } : l
      )
    );

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const [resStatus, resUpdate] = await Promise.all([
        fetch(`/api/leads/status?${params.toString()}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tempId, status: "Retornar" }),
        }),
        fetch(`/api/leads/update?${params.toString()}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tempId, retornar_em: retornarISO }),
        }),
      ]);

      if (!resStatus.ok || !resUpdate.ok) {
        setLeads(previousLeads);
        setAllLeads(previousAllLeads);
        toast.error("Erro ao agendar retorno");
      } else {
        toast.success("Lead agendado para retornar!");
      }
    } catch (error) {
      console.error(error);
      setLeads(previousLeads);
      setAllLeads(previousAllLeads);
      toast.error("Erro ao agendar retorno");
    }
  };

  // ========================
  // HELPERS DE COLUNAS
  // ========================

  const getLeadsByStatus = (status: string) => {
    const filtered = leads.filter((l) => l.status === status);
    return [...filtered].sort((a, b) => {
      if (cardSort === "data-criacao") {
        return new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime();
      }
      // sem-atividade: mais tempo sem update sobe
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    });
  };

  const getColumnCommission = (status: string) => {
    const colLeads = leads.filter((l) => l.status === status);
    return colLeads.reduce((sum, l) => {
      if (!l.valor_mensalidade || !l.operadora_ofertada) return sum;
      const comInfo = commissionMap[l.operadora_ofertada];
      const pct = comInfo
        ? (l.tipo_comissao === "externo" ? comInfo.externa : comInfo.interna)
        : 100;
      return sum + l.valor_mensalidade * (pct / 100);
    }, 0);
  };

  const getHiddenCount = (status: string) => {
    if (!["Dispensado", "Concluído"].includes(status)) return 0;
    return (
      allLeads.filter((l) => l.status === status).length -
      leads.filter((l) => l.status === status).length
    );
  };

  // ========================
  // RENDER
  // ========================

  const KanbanSkeleton = () => (
    <Layout fullWidth>
      <div className="space-y-2 mb-6">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col min-w-60 w-60 shrink-0 gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl opacity-60" />
          </div>
        ))}
      </div>
    </Layout>
  );

  if (loadingAuth || loading) return <KanbanSkeleton />;

  if (!firebaseUser) {
    return (
      <Layout fullWidth>
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold tracking-tight">
            Você precisa estar logado para ver o funil.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  const allColumns = FIXED_COLUMNS;

  return (
    <Layout fullWidth>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Workflow className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Kanban</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cards para atualizar o status dos leads
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur-sm px-3 py-1.5 shadow-sm">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ordenar:</span>
            <Select value={cardSort} onValueChange={(v) => setCardSort(v as "sem-atividade" | "data-criacao")}>
              <SelectTrigger className="border-0 h-auto p-0 text-xs font-medium bg-transparent shadow-none w-auto gap-1 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="sem-atividade">Menor Tempo - Alteração</SelectItem>
                <SelectItem value="data-criacao">Menor Tempo - Criação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur-sm px-3 py-1.5 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Finalizados:</span>
            <Select value={filtroFinalizados} onValueChange={setFiltroFinalizados}>
              <SelectTrigger className="border-0 h-auto p-0 text-xs font-medium bg-transparent shadow-none w-auto gap-1 focus:ring-0">
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
      </header>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          ref={setScrollContainer}
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          {allColumns.map((column) => {
            const hiddenCount = getHiddenCount(column.id);
            const colLeads = getLeadsByStatus(column.id);
            const isRetornar = column.id === "Retornar";
            const colCommission = getColumnCommission(column.id);

            return (
              <div
                key={column.id}
                className="flex flex-col min-w-60 w-60 shrink-0"
              >
                {/* Cabeçalho da coluna */}
                <div
                  className="p-3 rounded-xl mb-2 border"
                  style={{
                    backgroundColor: column.color + "15",
                    borderColor: column.color + "30",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: column.color }}
                      />
                      <h3 className="font-semibold text-sm truncate">{column.title}</h3>
                    </div>
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                      style={{
                        color: column.color,
                        backgroundColor: column.color + "18",
                        boxShadow: `0 0 0 1px ${column.color}40`,
                      }}
                    >
                      {colLeads.length}
                    </span>
                  </div>
                  {colCommission > 0 && (
                    <p
                      className="text-[11px] font-semibold tabular-nums mt-1.5 pl-4"
                      style={{ color: column.color }}
                    >
                      {colCommission.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  )}
                  {(hiddenCount > 0 || isRetornar) && (
                    <p className="text-[10px] text-muted-foreground mt-1 pl-4">
                      {hiddenCount > 0 && `+${hiddenCount} ocultos`}
                      {isRetornar && "agenda"}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 space-y-2 rounded-xl p-1 transition-colors"
                      style={{
                        minHeight: 120,
                        backgroundColor: snapshot.isDraggingOver
                          ? column.color + "15"
                          : "transparent",
                      }}
                    >
                      {colLeads.map((lead, index) => (
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
                                commissionMap={commissionMap}
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

      {/* ── MODAL DISPENSA ── */}
      <Dialog open={showDispensaModal} onOpenChange={setShowDispensaModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">Motivo da Dispensa</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Informe o motivo pelo qual este lead está sendo dispensado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Ex: Cliente não tem interesse no momento, valores fora do orçamento..."
              value={motivoDispensa}
              onChange={(e) => setMotivoDispensa(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDispensaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDispensa} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="h-4 w-4" />
              Confirmar Dispensa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL CONCLUSÃO ── */}
      <Dialog open={showConclusaoModal} onOpenChange={setShowConclusaoModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">Concluir Venda</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Confirme o valor da comissão e a data da venda.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor da Comissão (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorComissaoInput}
                onChange={(e) => setValorComissaoInput(e.target.value)}
              />
              {(() => {
                const lead = leads.find((l) => l.id === conclusaoLeadId);
                if (!lead?.valor_mensalidade || !lead.operadora_ofertada) return null;
                const comInfo = commissionMap[lead.operadora_ofertada];
                const pct = comInfo
                  ? (lead.tipo_comissao === "externo" ? comInfo.externa : comInfo.interna)
                  : 100;
                const opInfo = OPERADORAS.find((o) => o.nome === lead.operadora_ofertada);
                return (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {opInfo?.logo ? (
                      <Image
                        src={opInfo.logo}
                        alt={lead.operadora_ofertada}
                        width={48}
                        height={14}
                        className="h-3.5 w-auto object-contain"
                      />
                    ) : (
                      lead.operadora_ofertada
                    )}
                    · {lead.tipo_comissao} · mensalidade{" "}
                    {lead.valor_mensalidade.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}{" "}
                    × {pct}%
                  </p>
                );
              })()}
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
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowConclusaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmConclusao} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL RETORNAR FUTURAMENTE (Feature 5) ── */}
      <Dialog open={showRetornarModal} onOpenChange={setShowRetornarModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">Retornar Futuramente</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Escolha a data em que este lead deve reaparecer em destaque no funil.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Retorno</Label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={retornarData}
                onChange={(e) => setRetornarData(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O lead ficará na coluna &quot;Retornar Futuramente&quot; e aparecerá destacado em
              âmbar na data selecionada.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowRetornarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRetornar} className="gap-2">
              <Clock className="h-4 w-4" />
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Minimapa de navegação */}
      <KanbanMinimap
        scrollContainer={scrollContainer}
        columns={allColumns}
        getLeadCount={(id) => leads.filter((l) => l.status === id).length}
      />
    </Layout>
  );
};

export default FunilPage;
