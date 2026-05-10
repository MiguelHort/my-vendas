"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import Image from "next/image";
import { OPERADORAS } from "@/components/LeadCard";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  MapPin,
  Users,
  Heart,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  History,
  Sparkles,
  FileSpreadsheet,
  PenLine,
  Upload,
  X,
  AlertCircle,
  ChevronLeft,
  Trash2,
} from "lucide-react";

// ========================
// CONSTANTES
// ========================

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const ORIGENS = ["Lead Novo", "Retrabalho", "Ligação", "Indicação", "Presencial"];
const MODALIDADES = ["PF", "Adesão", "Empresarial", "PME"];
const ACOMODACOES = ["Enfermaria", "Apartamento", "Ambulatorial"];
const COPARTICIPACOES = ["Total", "Parcial", "Isenta"];
const OPERADORA_NOMES = OPERADORAS.map((o) => o.nome);

type CommissionMap = Record<string, { interna: number; externa: number }>;

type ImportedLead = {
  nome: string;
  telefone: string;
  origem: string;
  estado: string;
  cidade: string;
  qtd_vidas: string;
  idades: string;
  data_venda: string;
  valor_mensalidade: string;
  valor_comissao: string;
  operadora_ofertada: string;
  modalidade: string;
  tipo_comissao: "interno" | "externo";
};

type View = "choice" | "manual" | "upload" | "preview";

// ========================
// PAGE
// ========================

export default function MinhasVendasPage() {
  const router = useRouter();
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [view, setView] = useState<View>("choice");
  const [loading, setLoading] = useState(false);
  const [commissionMap, setCommissionMap] = useState<CommissionMap>({});

  // ---- upload states ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importedLeads, setImportedLeads] = useState<ImportedLead[]>([]);

  // ---- manual form states ----
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [qtdVidas, setQtdVidas] = useState("");
  const [idades, setIdades] = useState("");
  const [operadoraOfertada, setOperadoraOfertada] = useState("");
  const [tipoComissao, setTipoComissao] = useState<"interno" | "externo">("interno");
  const [modalidade, setModalidade] = useState("");
  const [acomodacao, setAcomodacao] = useState("");
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [coparticipacao, setCoparticipacao] = useState("");
  const [dataVenda, setDataVenda] = useState("");
  const [valorComissao, setValorComissao] = useState("");
  const [comissaoAutoCalc, setComissaoAutoCalc] = useState(false);

  // ========================
  // BUSCA DO COMMISSION MAP
  // ========================

  useEffect(() => {
    if (!firebaseUser) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/configuracoes/comissoes?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { operadora: string; comissao_interna: number; comissao_externa: number }[]) => {
        const map: CommissionMap = {};
        data.forEach((r) => {
          map[r.operadora] = { interna: r.comissao_interna, externa: r.comissao_externa };
        });
        setCommissionMap(map);
      })
      .catch(() => {});
  }, [firebaseUser]);

  // ========================
  // AUTO-CÁLCULO DA COMISSÃO (manual)
  // ========================

  useEffect(() => {
    if (!operadoraOfertada || !valorMensalidade) return;
    const comInfo = commissionMap[operadoraOfertada];
    if (!comInfo) return;
    const pct = tipoComissao === "externo" ? comInfo.externa : comInfo.interna;
    const mensalidade = parseFloat(valorMensalidade);
    if (isNaN(mensalidade) || mensalidade <= 0) return;
    setValorComissao(String(parseFloat((mensalidade * (pct / 100)).toFixed(2))));
    setComissaoAutoCalc(true);
  }, [operadoraOfertada, valorMensalidade, tipoComissao, commissionMap]);

  const pctVigente = (() => {
    if (!operadoraOfertada) return null;
    const comInfo = commissionMap[operadoraOfertada];
    if (!comInfo) return null;
    return tipoComissao === "externo" ? comInfo.externa : comInfo.interna;
  })();

  // ========================
  // UPLOAD + GEMINI
  // ========================

  const processFile = async (file: File) => {
    if (!firebaseUser) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv"].includes(ext)) {
      toast.error("Formato inválido. Envie .xlsx ou .csv");
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads/import-preview?${params}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Erro ao processar planilha");
        return;
      }

      const { leads } = await res.json();

      const normalized: ImportedLead[] = (leads as Record<string, unknown>[]).map((l) => ({
        nome: String(l.nome ?? ""),
        telefone: String(l.telefone ?? ""),
        origem: ORIGENS.includes(String(l.origem ?? "")) ? String(l.origem) : "",
        estado: ESTADOS.includes(String(l.estado ?? "").toUpperCase())
          ? String(l.estado).toUpperCase()
          : "",
        cidade: String(l.cidade ?? ""),
        qtd_vidas: String(l.qtd_vidas ?? "1"),
        idades: String(l.idades ?? ""),
        data_venda: String(l.data_venda ?? ""),
        valor_mensalidade: String(l.valor_mensalidade ?? ""),
        valor_comissao: String(l.valor_comissao ?? ""),
        operadora_ofertada: OPERADORA_NOMES.includes(String(l.operadora_ofertada ?? ""))
          ? String(l.operadora_ofertada)
          : "",
        modalidade: MODALIDADES.includes(String(l.modalidade ?? "")) ? String(l.modalidade) : "",
        tipo_comissao: l.tipo_comissao === "externo" ? "externo" : "interno",
      }));

      setImportedLeads(normalized);
      setView("preview");
    } catch {
      toast.error("Erro inesperado ao processar planilha");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ========================
  // EDIÇÃO DA TABELA
  // ========================

  const updateLead = (idx: number, field: keyof ImportedLead, value: string) => {
    setImportedLeads((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  const removeLead = (idx: number) => {
    setImportedLeads((prev) => prev.filter((_, i) => i !== idx));
  };

  // ========================
  // SALVAR IMPORTAÇÃO (bulk)
  // ========================

  const handleBulkSave = async () => {
    if (!firebaseUser) return;
    const invalid = importedLeads.filter((l) => !l.nome.trim());
    if (invalid.length > 0) {
      toast.error(`${invalid.length} lead(s) sem nome — preencha ou remova`);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const leads = importedLeads.map((l) => ({
        nome: l.nome.trim(),
        telefone: l.telefone || null,
        origem: l.origem || "Lead Novo",
        estado: l.estado || "",
        cidade: l.cidade || "",
        qtd_vidas: parseInt(l.qtd_vidas) || 1,
        idades: l.idades || "",
        data_venda: l.data_venda || null,
        valor_mensalidade: l.valor_mensalidade ? parseFloat(l.valor_mensalidade) : null,
        valor_comissao: l.valor_comissao ? parseFloat(l.valor_comissao) : null,
        operadora_ofertada: l.operadora_ofertada || null,
        modalidade: l.modalidade || null,
        tipo_comissao: l.tipo_comissao,
      }));

      const res = await fetch(`/api/leads/bulk?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Erro ao salvar leads");
        return;
      }

      const { created } = await res.json();
      toast.success(`${created} venda${created !== 1 ? "s" : ""} importada${created !== 1 ? "s" : ""} com sucesso!`);
      router.push("/dashboard/funil");
    } catch {
      toast.error("Erro ao salvar leads");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // SALVAR MANUAL
  // ========================

  const canSubmitManual =
    !!nome.trim() && !!origem && !!estado && !!cidade.trim() &&
    !!qtdVidas && !!idades.trim() && !!dataVenda;

  const handleManualSubmit = async () => {
    if (!firebaseUser || !canSubmitManual) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });
      const res = await fetch(`/api/leads?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(), telefone: telefone || null, origem, estado,
          cidade: cidade.trim(), qtd_vidas: parseInt(qtdVidas), idades: idades.trim(),
          status: "Concluído", lote_producao_id: null,
          data_venda: dataVenda ? new Date(dataVenda + "T00:00:00").toISOString() : null,
          valor_comissao: valorComissao ? parseFloat(valorComissao) : null,
          tipo_comissao: tipoComissao,
          operadora_ofertada: operadoraOfertada || null,
          modalidade: modalidade || null,
          acomodacao: acomodacao || null,
          valor_mensalidade: valorMensalidade ? parseFloat(valorMensalidade) : null,
          coparticipacao: coparticipacao || null,
        }),
      });
      setLoading(false);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Erro ao salvar venda: " + (body.error || res.statusText));
        return;
      }
      toast.success("Venda registrada com sucesso!");
      router.push("/dashboard/funil");
    } catch {
      setLoading(false);
      toast.error("Erro ao salvar venda");
    }
  };

  // ========================
  // RENDER
  // ========================

  if (loadingAuth) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={`mx-auto py-8 px-4 space-y-6 ${view === "preview" ? "max-w-6xl" : "max-w-2xl"}`}>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          {view !== "choice" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setView("choice")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Minhas Vendas</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre vendas realizadas antes de usar o WinLeads
            </p>
          </div>
        </div>

        {/* ============== TELA DE ESCOLHA ============== */}
        {view === "choice" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => setView("upload")}
              className="group text-left rounded-xl border-2 border-border hover:border-primary p-6 space-y-3 transition-all"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Importar planilha</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Suba um arquivo .xlsx ou .csv e a IA extrai os dados automaticamente
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> Powered by Gemini
              </Badge>
            </button>

            <button
              onClick={() => setView("manual")}
              className="group text-left rounded-xl border-2 border-border hover:border-primary p-6 space-y-3 transition-all"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <PenLine className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Adicionar manualmente</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Preencha um formulário com os dados de uma venda por vez
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ============== UPLOAD ============== */}
        {view === "upload" && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploadLoading && fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <div>
                    <p className="font-medium">Analisando planilha com Gemini...</p>
                    <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">
                      Arraste e solte ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Suporta <strong>.xlsx</strong> e <strong>.csv</strong>
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                A IA vai tentar reconhecer automaticamente colunas como nome, telefone, data de venda, comissão, operadora etc.
                Você poderá revisar e editar os dados antes de confirmar.
              </p>
            </div>
          </div>
        )}

        {/* ============== PREVIEW / TABELA EDITÁVEL ============== */}
        {view === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{importedLeads.length}</span> lead{importedLeads.length !== 1 ? "s" : ""} encontrado{importedLeads.length !== 1 ? "s" : ""} — revise e confirme
              </p>
              <Button
                onClick={handleBulkSave}
                disabled={loading || importedLeads.length === 0}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {loading ? "Salvando..." : `Confirmar ${importedLeads.length} venda${importedLeads.length !== 1 ? "s" : ""}`}
              </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40">Nome</TableHead>
                    <TableHead className="min-w-[110px]">Data venda</TableHead>
                    <TableHead className="min-w-[130px]">Comissão (R$)</TableHead>
                    <TableHead className="min-w-[130px]">Mensalidade (R$)</TableHead>
                    <TableHead className="min-w-[140px]">Operadora</TableHead>
                    <TableHead className="min-w-[110px]">Origem</TableHead>
                    <TableHead className="min-w-[70px]">UF</TableHead>
                    <TableHead className="min-w-[120px]">Cidade</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedLeads.map((lead, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={lead.nome}
                          onChange={(e) => updateLead(idx, "nome", e.target.value)}
                          className={`h-8 text-sm ${!lead.nome.trim() ? "border-destructive" : ""}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={lead.data_venda}
                          onChange={(e) => updateLead(idx, "data_venda", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={lead.valor_comissao}
                          onChange={(e) => updateLead(idx, "valor_comissao", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={lead.valor_mensalidade}
                          onChange={(e) => updateLead(idx, "valor_mensalidade", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.operadora_ofertada || "__none__"}
                          onValueChange={(v) => updateLead(idx, "operadora_ofertada", v === "__none__" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {OPERADORA_NOMES.map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.origem}
                          onValueChange={(v) => updateLead(idx, "origem", v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {ORIGENS.map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.estado}
                          onValueChange={(v) => updateLead(idx, "estado", v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={lead.cidade}
                          onChange={(e) => updateLead(idx, "cidade", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLead(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ============== FORMULÁRIO MANUAL ============== */}
        {view === "manual" && (
          <div className="space-y-6">
            {/* Dados do Cliente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Dados do Cliente
                </CardTitle>
                <CardDescription>Identificação e contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nome">Nome <span className="text-destructive">*</span></Label>
                    <Input id="nome" placeholder="Nome completo do cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhoneNumber(e.target.value))} maxLength={15} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origem">Origem <span className="text-destructive">*</span></Label>
                    <Select value={origem} onValueChange={setOrigem}>
                      <SelectTrigger id="origem"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Localização
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado <span className="text-destructive">*</span></Label>
                    <Select value={estado} onValueChange={setEstado}>
                      <SelectTrigger id="estado"><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>{ESTADOS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade <span className="text-destructive">*</span></Label>
                    <Input id="cidade" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Perfil */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Perfil
                </CardTitle>
                <CardDescription>Quantidade de vidas e idades</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qtdVidas">Qtd. de vidas <span className="text-destructive">*</span></Label>
                  <Input id="qtdVidas" type="number" min="1" placeholder="Ex: 3" value={qtdVidas} onChange={(e) => setQtdVidas(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idades">Idades <span className="text-destructive">*</span></Label>
                  <Input id="idades" placeholder="Ex: 34, 30, 5" value={idades} onChange={(e) => setIdades(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Plano Vendido */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-primary" />
                  Plano Vendido
                </CardTitle>
                <CardDescription>Preencha a operadora e mensalidade para calcular a comissão automaticamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Operadora</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {OPERADORAS.map((op) => {
                      const selected = operadoraOfertada === op.nome;
                      return (
                        <button key={op.nome} type="button" onClick={() => setOperadoraOfertada(selected ? "" : op.nome)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all ${selected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                          <div className="relative h-6 w-12">
                            <Image src={op.logo} alt={op.nome} fill className="object-contain" />
                          </div>
                          <span className="text-[10px] text-center leading-tight text-muted-foreground">{op.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de comissão</Label>
                  <RadioGroup value={tipoComissao} onValueChange={(v) => setTipoComissao(v as "interno" | "externo")} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="interno" id="tipo-interno" />
                      <Label htmlFor="tipo-interno" className="cursor-pointer font-normal">Interno</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="externo" id="tipo-externo" />
                      <Label htmlFor="tipo-externo" className="cursor-pointer font-normal">Externo</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valorMensalidade">Valor da mensalidade (R$)</Label>
                    <Input id="valorMensalidade" type="number" step="0.01" min="0" placeholder="0.00" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modalidade">Modalidade</Label>
                    <Select value={modalidade} onValueChange={setModalidade}>
                      <SelectTrigger id="modalidade"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{MODALIDADES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acomodacao">Acomodação</Label>
                    <Select value={acomodacao} onValueChange={setAcomodacao}>
                      <SelectTrigger id="acomodacao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{ACOMODACOES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coparticipacao">Coparticipação</Label>
                    <Select value={coparticipacao} onValueChange={setCoparticipacao}>
                      <SelectTrigger id="coparticipacao"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{COPARTICIPACOES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados da Venda */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Dados da Venda
                </CardTitle>
                <CardDescription>Data de fechamento e comissão recebida</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataVenda">Data da venda <span className="text-destructive">*</span></Label>
                  <Input id="dataVenda" type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="valorComissao">Valor da comissão (R$)</Label>
                    {comissaoAutoCalc && pctVigente !== null && (
                      <Badge variant="secondary" className="gap-1 text-xs font-normal">
                        <Sparkles className="h-3 w-3" /> {pctVigente}% da mensalidade
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="valorComissao" type="number" step="0.01" min="0" placeholder="0.00"
                    value={valorComissao}
                    onChange={(e) => { setValorComissao(e.target.value); setComissaoAutoCalc(false); }}
                  />
                  {comissaoAutoCalc && (
                    <p className="text-xs text-muted-foreground">Calculado automaticamente — edite se necessário</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2 pb-8">
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Campos obrigatórios
              </p>
              <Button onClick={handleManualSubmit} disabled={!canSubmitManual || loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {loading ? "Salvando..." : "Registrar venda"}
              </Button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
