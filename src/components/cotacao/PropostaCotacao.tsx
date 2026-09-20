"use client";

import * as React from "react";
import type { ResultadoCotacao } from "@/lib/px/cotacao";
import { agruparPorFaixa, brl, rotuloTabela } from "./comum";

/**
 * Cartão da proposta de UMA opção, feito pra tirar print e mandar pro lead.
 * Cores fixas (não seguem o tema escuro) pra imagem sair sempre igual.
 */
export function PropostaCotacao({
  opcao,
  cliente,
  corretor,
  email,
  geradoEm,
}: {
  opcao: ResultadoCotacao;
  cliente: string | null;
  corretor: string | null;
  email: string | null;
  geradoEm: Date;
}) {
  const faixas = agruparPorFaixa(opcao.detalhamento);
  const dataTexto = geradoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const linhas: [string, string | null][] = [
    ["Categoria", "Saúde"],
    ["Modalidade", opcao.modalidade],
    ["Operadora", opcao.operadora],
    ["Produto", opcao.produto],
    ["Tabela", rotuloTabela(opcao)],
    ["Plano", opcao.plano],
    ["Acomodação", opcao.acomodacao],
    ["Coparticipação", opcao.coparticipacao],
  ];

  return (
    <div
      className="mx-auto w-full max-w-xl rounded-xl bg-white p-5 text-[13px] text-neutral-900 shadow-sm"
      style={{ colorScheme: "light" }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/imgs/logo02.png" alt="" width={36} height={36} className="size-9 object-contain" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-green-700">WinLeads</p>
          <p className="text-[11px] text-neutral-500">Cotação de plano de saúde</p>
        </div>
      </div>

      {/* Quem cotou */}
      <dl className="mt-3 space-y-0.5">
        {cliente && (
          <div className="flex gap-1.5">
            <dt className="font-semibold">Cliente:</dt>
            <dd>{cliente}</dd>
          </div>
        )}
        {corretor && (
          <div className="flex gap-1.5">
            <dt className="font-semibold">Corretor:</dt>
            <dd>{corretor}</dd>
          </div>
        )}
        {email && (
          <div className="flex gap-1.5">
            <dt className="font-semibold">E-mail:</dt>
            <dd>{email}</dd>
          </div>
        )}
      </dl>

      <p className="my-3 text-center text-[12px] text-neutral-600">Cotação criada em {dataTexto}</p>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-neutral-300">
        <table className="w-full border-collapse">
          <tbody>
            {linhas
              .filter(([, valor]) => valor)
              .map(([rotulo, valor], i) => (
                <tr key={rotulo} className={i % 2 === 0 ? "bg-[#c3cff6]" : "bg-white"}>
                  <td className="w-36 px-2.5 py-1.5 text-left">{rotulo}</td>
                  <td className="px-2.5 py-1.5 text-center">{valor}</td>
                </tr>
              ))}
            {faixas.map((f, i) => (
              <tr
                key={`${f.faixa}-${f.valor}`}
                className={(linhas.filter(([, v]) => v).length + i) % 2 === 0 ? "bg-[#c3cff6]" : "bg-white"}
              >
                <td className="px-2.5 py-1.5 text-left">{f.faixa}:</td>
                <td className="px-2.5 py-1.5 text-center">
                  {f.qtd} x {brl(f.valor)}
                </td>
              </tr>
            ))}
            {opcao.desconto > 0 && (
              <tr className="bg-white">
                <td className="px-2.5 py-1.5 text-left">Desconto</td>
                <td className="px-2.5 py-1.5 text-center text-emerald-700">- {brl(opcao.desconto)}</td>
              </tr>
            )}
            <tr className="bg-neutral-200 font-bold">
              <td className="px-2.5 py-2 text-left">Total</td>
              <td className="px-2.5 py-2 text-center">{brl(opcao.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-center text-[10.5px] leading-snug text-neutral-500">
        Valores mensais, sujeitos a reajuste e à aprovação da operadora.
      </p>
    </div>
  );
}
