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
import { Settings, Plus, Trash2, GripVertical } from "lucide-react";

import LeadCard, { Lead } from "@/components/LeadCard";

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
// COLUNAS PADRÃO
// ========================

const DEFAULT_COLUMNS: FunnelColumn[] = [
  { id: "Dispensado", title: "Dispensado", color: "#6b7280" },
  { id: "Abordagem", title: "Abordagem", color: "#3b82f6" },
  { id: "Avaliando", title: "Avaliando", color: "#eab308" },
  { id: "Fechamento", title: "Fechamento", color: "#8b5cf6" },
  { id: "Concluído", title: "Concluído", color: "#22c55e" },
];

const RETORNAR_COLUMN: FunnelColumn = {
  id: "Retornar",
  title: "Retornar Futuramente",
  color: "#f59e0b",
};

const COLUMN_COLOR_OPTIONS = [
  { label: "Cinza", value: "#6b7280" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Roxo", value: "#8b5cf6" },
  { label: "Verde", value: "#22c55e" },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Laranja", value: "#f97316" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Ciano", value: "#06b6d4" },
];

const STORAGE_KEY = "winleads_funnel_columns";

function loadColumns(): FunnelColumn[] {
  if (typeof window === "undefined") return DEFAULT_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_COLUMNS;
}

function saveColumns(cols: FunnelColumn[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

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

  // Scroll container para o minimapa
  const [scrollContainer, setScrollContainer] = React.useState<HTMLDivElement | null>(null);

  // Colunas configuráveis (Feature 7)
  const [columns, setColumns] = React.useState<FunnelColumn[]>(DEFAULT_COLUMNS);
  const [showConfigModal, setShowConfigModal] = React.useState(false);
  const [editingColumns, setEditingColumns] = React.useState<FunnelColumn[]>([]);
  const editingColumnsRef = React.useRef<FunnelColumn[]>([]);
  const [newColTitle, setNewColTitle] = React.useState("");
  const [newColColor, setNewColColor] = React.useState("#3b82f6");

  React.useEffect(() => {
    editingColumnsRef.current = editingColumns;
  }, [editingColumns]);

  React.useEffect(() => {
    setColumns(loadColumns());
  }, []);

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
      setConclusaoLeadId(leadId);
      setValorComissaoInput("");
      setDataVendaInput("");
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
    if (!valorComissaoInput.trim() || !dataVendaInput.trim()) {
      toast.error("Informe o valor da comissão e a data da venda.");
      return;
    }
    if (!firebaseUser) return;

    const previousLeads = [...leads];
    const previousAllLeads = [...allLeads];

    const tempId = conclusaoLeadId;
    const valorNumber = parseFloat(
      valorComissaoInput.replace(".", "").replace(",", ".")
    );
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

  const getLeadsByStatus = (status: string) =>
    leads.filter((l) => l.status === status);

  const getHiddenCount = (status: string) => {
    if (!["Dispensado", "Concluído"].includes(status)) return 0;
    return (
      allLeads.filter((l) => l.status === status).length -
      leads.filter((l) => l.status === status).length
    );
  };

  // ========================
  // CONFIG DE COLUNAS (Feature 7)
  // ========================

  const openConfigModal = () => {
    setEditingColumns(columns.map((c) => ({ ...c })));
    setNewColTitle("");
    setNewColColor("#3b82f6");
    setShowConfigModal(true);
  };

  const handleSaveColumns = () => {
    const saved = editingColumnsRef.current.filter((c) => c.title.trim() !== "");
    setColumns(saved);
    saveColumns(saved);
    setShowConfigModal(false);
    toast.success("Funil atualizado!");
  };

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const id = newColTitle.trim().replace(/\s+/g, "_") + "_" + Date.now();
    const newCol = { id, title: newColTitle.trim(), color: newColColor };
    setEditingColumns((prev) => [...prev, newCol]);
    setNewColTitle("");
    setNewColColor("#3b82f6");
  };

  const handleDeleteColumn = (index: number) => {
    const col = editingColumnsRef.current[index];
    if (!col) return;
    const hasLeads = allLeads.some((l) => l.status === col.id);
    if (hasLeads) {
      toast.error(`Mova os leads da coluna "${col.title}" antes de excluí-la`);
      return;
    }
    setEditingColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveColumn = (index: number, direction: -1 | 1) => {
    setEditingColumns((prev) => {
      const newArr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= newArr.length) return prev;
      [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
      return newArr;
    });
  };

  // ========================
  // RENDER
  // ========================

  if (loadingAuth) {
    return (
      <Layout fullWidth>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout fullWidth>
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-lg font-semibold">Você precisa estar logado para ver o funil.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout fullWidth>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  const allColumns = [...columns, RETORNAR_COLUMN];

  return (
    <Layout fullWidth>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-muted-foreground text-sm">
            Arraste os cards para atualizar o status dos leads
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Finalizados:</Label>
            <Select value={filtroFinalizados} onValueChange={setFiltroFinalizados}>
              <SelectTrigger className="w-40">
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

          <Button variant="outline" size="sm" onClick={openConfigModal}>
            <Settings className="h-4 w-4 mr-1.5" />
            Configurar Funil
          </Button>
        </div>
      </div>

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

            return (
              <div
                key={column.id}
                className="flex flex-col min-w-60 w-60 shrink-0"
              >
                {/* Cabeçalho da coluna */}
                <div
                  className="p-2.5 rounded-lg mb-2"
                  style={{ backgroundColor: column.color + "25" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-semibold text-sm truncate">{column.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 pl-4">
                    {colLeads.length} leads
                    {hiddenCount > 0 && (
                      <span className="ml-1 opacity-60">(+{hiddenCount} ocultos)</span>
                    )}
                    {isRetornar && (
                      <span className="ml-1 opacity-70">• agenda</span>
                    )}
                  </p>
                </div>

                {/* Cards */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 space-y-2 rounded-lg p-1 transition-colors"
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
            <DialogTitle>Motivo da Dispensa</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo pelo qual este lead está sendo dispensado.
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
            <Button variant="outline" onClick={() => setShowDispensaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDispensa}>Confirmar Dispensa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL CONCLUSÃO ── */}
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
            <Button variant="outline" onClick={() => setShowConclusaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmConclusao}>Confirmar Conclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL RETORNAR FUTURAMENTE (Feature 5) ── */}
      <Dialog open={showRetornarModal} onOpenChange={setShowRetornarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Futuramente</DialogTitle>
            <DialogDescription>
              Escolha a data em que este lead deve reaparecer em destaque no funil.
            </DialogDescription>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetornarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRetornar}>Confirmar Agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL CONFIGURAR FUNIL (Feature 7) ── */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Funil</DialogTitle>
            <DialogDescription>
              Renomeie, reordene, mude as cores ou adicione/remova etapas do seu funil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {editingColumns.map((col, i) => (
              <div key={col.id} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                {/* Cor */}
                <Select
                  value={col.color}
                  onValueChange={(v) => {
                    setEditingColumns((prev) => {
                      const updated = [...prev];
                      updated[i] = { ...updated[i], color: v };
                      return updated;
                    });
                  }}
                >
                  <SelectTrigger className="w-10 h-8 p-0 border-0">
                    <div
                      className="w-5 h-5 rounded-full mx-auto"
                      style={{ backgroundColor: col.color }}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {COLUMN_COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Nome */}
                <Input
                  value={col.title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditingColumns((prev) => {
                      const updated = [...prev];
                      updated[i] = { ...updated[i], title: value };
                      return updated;
                    });
                  }}
                  className="flex-1 h-8"
                />

                {/* Mover */}
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveColumn(i, -1)}
                    disabled={i === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveColumn(i, 1)}
                    disabled={i === editingColumns.length - 1}
                  >
                    ↓
                  </Button>
                </div>

                {/* Excluir */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteColumn(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {/* Adicionar nova coluna */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-sm font-medium">Adicionar etapa</p>
              <div className="flex gap-2">
                <Select value={newColColor} onValueChange={setNewColColor}>
                  <SelectTrigger className="w-10 h-8 p-0 border-0">
                    <div
                      className="w-5 h-5 rounded-full mx-auto"
                      style={{ backgroundColor: newColColor }}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {COLUMN_COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Nome da etapa..."
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddColumn(); } }}
                  className="flex-1 h-8"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddColumn}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveColumns}>Salvar Configurações</Button>
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
