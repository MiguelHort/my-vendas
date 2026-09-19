"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dataHora, type AuthHeader, type StatusSyncDto } from "./comum";

export function SincronizacaoPx({
  authHeader,
  status,
  carregando,
  onAtualizada,
}: {
  authHeader: AuthHeader;
  status: StatusSyncDto | null;
  carregando: boolean;
  onAtualizada: () => void;
}) {
  const [sincronizando, setSincronizando] = React.useState(false);

  async function sincronizar() {
    setSincronizando(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/px/sync", { method: "POST", headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao sincronizar");

      if (data.status === "ok") {
        const atualizados = (data.relatorio as { status: string }[]).filter(
          (r) => r.status === "atualizado"
        ).length;
        toast.success(
          atualizados > 0
            ? `Sincronização concluída: ${atualizados} produto(s) atualizado(s)`
            : "Sincronização concluída: sem mudanças nas tabelas"
        );
      } else {
        toast.error("Sincronização terminou com erros — veja os detalhes abaixo");
      }
      onAtualizada();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSincronizando(false);
    }
  }

  const ultima = status?.ultima ?? null;
  const inconsistencias = (ultima?.detalhes ?? []).flatMap((d) =>
    (d.inconsistencias ?? []).map((i) => `${d.nome ?? `Produto ${d.produto}`}: ${i}`)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Sincronização das tabelas da PX</CardTitle>
            <Button onClick={sincronizar} disabled={sincronizando} className="gap-2">
              {sincronizando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {carregando && !status ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <>
              {status?.defasada && (
                <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0" />
                  {status.ultima_ok_em
                    ? `A última sincronização com sucesso foi em ${dataHora(status.ultima_ok_em)} (mais de 3 dias). Sincronize pra atualizar os preços.`
                    : "As tabelas ainda nunca foram sincronizadas."}
                </div>
              )}

              {ultima ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {ultima.status === "ok" ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-destructive" />
                  )}
                  <span>
                    Última execução: <strong>{dataHora(ultima.finalizado_em)}</strong>
                  </span>
                  <Badge variant={ultima.status === "ok" ? "secondary" : "destructive"}>
                    {ultima.status === "ok" ? "sem erros" : "com erros"}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma sincronização registrada.</p>
              )}

              {ultima && ultima.detalhes.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {ultima.detalhes.map((d, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{d.nome ?? `Produto ${d.produto ?? "?"}`}</span>
                      <Badge
                        variant={d.status === "erro" ? "destructive" : "outline"}
                        className="font-normal"
                      >
                        {d.status}
                      </Badge>
                      {d.status === "atualizado" && (
                        <span className="text-xs text-muted-foreground">
                          {d.tabelas} tabelas, {d.precos} preços
                        </span>
                      )}
                      {d.erro && <span className="text-xs text-destructive">{d.erro}</span>}
                    </li>
                  ))}
                </ul>
              )}

              {inconsistencias.length > 0 && (
                <details className="rounded-md border px-3 py-2 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    {inconsistencias.length} inconsistência(s) nos dados da PX (última atualização)
                  </summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {inconsistencias.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </details>
              )}

              <p className="text-xs text-muted-foreground">
                A sincronização é manual: baixa as tabelas da PX e grava aqui. A cotação em si
                nunca chama a PX. Se a sessão da PX expirar, atualize a variável PX_COOKIE.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Produtos sincronizados</CardTitle>
        </CardHeader>
        <CardContent>
          {!status || status.produtos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum produto sincronizado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID PX</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead className="text-right">Tabelas</TableHead>
                    <TableHead className="text-right">Com inconsistência</TableHead>
                    <TableHead>Última mudança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.produtos.map((p) => (
                    <TableRow key={p.px_id}>
                      <TableCell className="tabular-nums">{p.px_id}</TableCell>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.operadora ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.tabelas}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.tabelas_com_inconsistencia}
                      </TableCell>
                      <TableCell>{dataHora(p.sincronizado_em)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
