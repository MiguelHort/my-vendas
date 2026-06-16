export type ReportMember = {
  id: string;
  name: string | null;
  email: string;
  totalLeads: number;
  totalVendas: number;
  totalComissao: number;
  conversionRate: number;
  monthSales: number;
  monthTarget: number;
  byStatus: Record<string, number>;
};

export type ReportTeam = {
  totalLeads: number;
  totalVendas: number;
  totalComissao: number;
  avgConversionRate: number;
  byStatus: Record<string, number>;
};

export type ReportOptions = {
  period: string;
  memberIds: string[];
  showSummary: boolean;
  showRanking: boolean;
  showGoals: boolean;
  showStatus: boolean;
  showCommissions: boolean;
};

const PERIOD_LABELS: Record<string, string> = {
  "este-mes":       "Este Mês",
  "7-dias":         "Últimos 7 dias",
  "15-dias":        "Últimos 15 dias",
  "3-meses":        "Últimos 3 meses",
  "todo-historico": "Todo o Histórico",
};

const memberName = (m: Pick<ReportMember, "name" | "email">) =>
  m.name || m.email;

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const pct = (v: number) => `${v.toFixed(1)}%`;

export async function generateTeamReport(
  members: ReportMember[],
  _team: ReportTeam,
  options: ReportOptions
): Promise<void> {
  // Dynamic imports — keeps jspdf out of the server bundle
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const filtered = members.filter((m) => options.memberIds.includes(m.id));

  // Re-compute team totals from filtered members
  const filteredByStatus: Record<string, number> = {};
  for (const m of filtered) {
    for (const [st, count] of Object.entries(m.byStatus)) {
      filteredByStatus[st] = (filteredByStatus[st] || 0) + count;
    }
  }
  const filteredTotalLeads  = filtered.reduce((a, m) => a + m.totalLeads, 0);
  const filteredTotalVendas = filtered.reduce((a, m) => a + m.totalVendas, 0);
  const filteredTotalComis  = filtered.reduce((a, m) => a + m.totalComissao, 0);
  const filteredAvgConv     =
    filtered.length > 0
      ? Math.round((filtered.reduce((a, m) => a + m.conversionRate, 0) / filtered.length) * 10) / 10
      : 0;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const periodLabel = PERIOD_LABELS[options.period] ?? options.period;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 28, "F");

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Relatório da Equipe", 14, 12);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodLabel}`, 14, 21);
  doc.text(`Gerado em ${dateStr}`, 196, 21, { align: "right" });

  let y = 36;

  // helper: draws a section title and returns the new y
  function sectionTitle(title: string): number {
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(title, 14, y);
    doc.setDrawColor(210, 205, 245);
    doc.setLineWidth(0.3);
    doc.line(14, y + 2, 196, y + 2);
    doc.setTextColor(30, 30, 30);
    return y + 9;
  }

  // ── Resumo geral ─────────────────────────────────────────────────────────────
  if (options.showSummary) {
    y = sectionTitle("Resumo Geral");

    const stats = [
      { label: "TOTAL DE LEADS",  value: filteredTotalLeads.toLocaleString("pt-BR") },
      { label: "TOTAL DE VENDAS", value: filteredTotalVendas.toLocaleString("pt-BR") },
      { label: "CONVERSÃO MÉDIA", value: pct(filteredAvgConv) },
      ...(options.showCommissions
        ? [{ label: "COMISSÃO TOTAL", value: brl(filteredTotalComis) }]
        : []),
    ];

    const cols = stats.length;
    const gap  = 4;
    const boxW = (182 - gap * (cols - 1)) / cols;

    stats.forEach((stat, i) => {
      const x = 14 + i * (boxW + gap);
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(210, 205, 245);
      doc.roundedRect(x, y, boxW, 15, 2, 2, "FD");

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 110, 180);
      doc.text(stat.label, x + boxW / 2, y + 5, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 48, 163);
      doc.text(stat.value, x + boxW / 2, y + 12, { align: "center" });
    });

    doc.setTextColor(30, 30, 30);
    y += 25;
  }

  // ── Ranking de vendas ─────────────────────────────────────────────────────────
  if (options.showRanking) {
    y = sectionTitle("Ranking de Vendas");

    const ranked = [...filtered].sort((a, b) => b.totalVendas - a.totalVendas);

    const head = [
      ["#", "Corretor", "Leads", "Vendas", "Conversão", ...(options.showCommissions ? ["Comissão"] : [])],
    ];
    const body = ranked.map((m, i) => [
      String(i + 1),
      memberName(m),
      m.totalLeads.toString(),
      m.totalVendas.toString(),
      pct(m.conversionRate),
      ...(options.showCommissions ? [brl(m.totalComissao)] : []),
    ]);

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: { 0: { cellWidth: 8, halign: "center" } },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Meta do mês ───────────────────────────────────────────────────────────────
  if (options.showGoals) {
    y = sectionTitle("Meta do Mês vs Realizado");

    const head = [["Corretor", "Meta", "Realizado", "% da Meta"]];
    const body = filtered.map((m) => {
      const goalPct = m.monthTarget > 0
        ? `${Math.round((m.monthSales / m.monthTarget) * 100)}%`
        : "—";
      return [memberName(m), m.monthTarget > 0 ? brl(m.monthTarget) : "—", brl(m.monthSales), goalPct];
    });

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Distribuição por status ───────────────────────────────────────────────────
  if (options.showStatus) {
    y = sectionTitle("Distribuição por Status");

    const totalInStatus = Object.values(filteredByStatus).reduce((a, b) => a + b, 0);
    const head = [["Status", "Quantidade", "% do Total"]];
    const body = Object.entries(filteredByStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([st, count]) => [
        st,
        count.toString(),
        totalInStatus > 0 ? `${Math.round((count / totalInStatus) * 100)}%` : "—",
      ]);

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Footer em todas as páginas ────────────────────────────────────────────────
  const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("WinLeads CRM", 14, 290);
    doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: "right" });
  }

  const filename = `relatorio-equipe-${options.period}-${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
