"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Award, Star, Trophy, Crown, Check, Lock, Medal } from "lucide-react";
import { type LucideIcon } from "lucide-react";

/* ========================
   TYPES
======================== */

type LevelDef = {
  number: number;
  name: string;
  minCommission: number;
  maxCommission: number | null;
  description: string;
  topPercent: string | null;
  icon: LucideIcon;
  borderClass: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  barClass: string;
  iconBgClass: string;
  iconRingClass: string;
  dot: string;
};

/* ========================
   LEVEL DEFINITIONS
======================== */

// Colors aligned with the tier palette: zinc / amber-600 / slate-300 / yellow-400 / cyan-300
const LEVELS: LevelDef[] = [
  {
    number: 1,
    name: "Aspirante",
    minCommission: 0,
    maxCommission: 2_000,
    description: "O corretor que está começando ou teve um mês fraco. Foco do mês: fazer a primeira venda relevante.",
    topPercent: null,
    icon: User,
    borderClass: "border-zinc-300 dark:border-zinc-500",
    bgClass: "bg-zinc-50 dark:bg-zinc-800/20",
    textClass: "text-zinc-500 dark:text-zinc-400",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-500/60",
    barClass: "bg-zinc-400 dark:bg-zinc-500",
    iconBgClass: "bg-zinc-100 dark:bg-zinc-800/60",
    iconRingClass: "ring-zinc-300 dark:ring-zinc-500",
    dot: "bg-zinc-400",
  },
  {
    number: 2,
    name: "Corretor",
    minCommission: 2_000,
    maxCommission: 6_000,
    description: "O profissional consistente. Esse é o nível \"padrão\" — onde a maioria fica.",
    topPercent: null,
    icon: Award,
    borderClass: "border-amber-300 dark:border-amber-600",
    bgClass: "bg-amber-50 dark:bg-amber-950/25",
    textClass: "text-amber-600 dark:text-amber-500",
    badgeClass: "bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-500 dark:border-amber-600/60",
    barClass: "bg-amber-600",
    iconBgClass: "bg-amber-100 dark:bg-amber-950/60",
    iconRingClass: "ring-amber-400 dark:ring-amber-600",
    dot: "bg-amber-600",
  },
  {
    number: 3,
    name: "Consultor",
    minCommission: 6_000,
    maxCommission: 15_000,
    description: "Já não é só vendedor, é consultor. Tem cartela, sabe abordar e fechar.",
    topPercent: "Top 30%",
    icon: Star,
    borderClass: "border-slate-300 dark:border-slate-300",
    bgClass: "bg-slate-50 dark:bg-slate-800/20",
    textClass: "text-slate-500 dark:text-slate-300",
    badgeClass: "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-300/60",
    barClass: "bg-slate-400 dark:bg-slate-300",
    iconBgClass: "bg-slate-100 dark:bg-slate-800/60",
    iconRingClass: "ring-slate-300 dark:ring-slate-300",
    dot: "bg-slate-300",
  },
  {
    number: 4,
    name: "Especialista",
    minCommission: 15_000,
    maxCommission: 30_000,
    description: "Referência na região ou no nicho. Geralmente já tem time, indicações e processo.",
    topPercent: "Top 10%",
    icon: Trophy,
    borderClass: "border-yellow-400 dark:border-yellow-400",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/20",
    textClass: "text-yellow-600 dark:text-yellow-400",
    badgeClass: "bg-yellow-100 text-yellow-600 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-400/60",
    barClass: "bg-yellow-400",
    iconBgClass: "bg-yellow-100 dark:bg-yellow-950/60",
    iconRingClass: "ring-yellow-400 dark:ring-yellow-400",
    dot: "bg-yellow-400",
  },
  {
    number: 5,
    name: "Elite",
    minCommission: 30_000,
    maxCommission: null,
    description: "O topo. Máquina de fechar. Top 1-2% dos corretores.",
    topPercent: "Top 1–2%",
    icon: Crown,
    borderClass: "border-cyan-300 dark:border-cyan-300",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/20",
    textClass: "text-cyan-600 dark:text-cyan-300",
    badgeClass: "bg-cyan-100 text-cyan-600 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-300/60",
    barClass: "bg-cyan-400 dark:bg-cyan-300",
    iconBgClass: "bg-cyan-100 dark:bg-cyan-950/60",
    iconRingClass: "ring-cyan-300 dark:ring-cyan-300",
    dot: "bg-cyan-300",
  },
];

/* ========================
   HELPERS
======================== */

function getCurrentLevel(commission: number): LevelDef {
  if (commission >= 30_000) return LEVELS[4];
  if (commission >= 15_000) return LEVELS[3];
  if (commission >= 6_000) return LEVELS[2];
  if (commission >= 2_000) return LEVELS[1];
  return LEVELS[0];
}

function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatCommissionRange(level: LevelDef): string {
  if (level.maxCommission === null) return `acima de ${formatCurrency(level.minCommission)}`;
  if (level.minCommission === 0) return `até ${formatCurrency(level.maxCommission)}`;
  return `${formatCurrency(level.minCommission)} – ${formatCurrency(level.maxCommission)}`;
}

function getReferenceMonthLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function getProgressToNext(commission: number, currentLevel: LevelDef) {
  if (currentLevel.maxCommission === null) {
    return { pct: 100, remaining: 0, nextLevel: null };
  }
  const rangeStart = currentLevel.minCommission;
  const rangeEnd = currentLevel.maxCommission;
  const pct = Math.min(100, ((commission - rangeStart) / (rangeEnd - rangeStart)) * 100);
  const remaining = Math.max(0, rangeEnd - commission);
  const nextLevel = LEVELS[currentLevel.number]; // number is 1-indexed, LEVELS is 0-indexed
  return { pct, remaining, nextLevel };
}

/* ========================
   HERO CARD
======================== */

function HeroCard({
  commission,
  referenceMonth,
}: {
  commission: number;
  referenceMonth: string;
}) {
  const level = getCurrentLevel(commission);
  const { pct, remaining, nextLevel } = getProgressToNext(commission, level);
  const Icon = level.icon;
  const monthLabel = getReferenceMonthLabel(referenceMonth);

  return (
    <div
      className={`rounded-2xl border-2 p-6 sm:p-8 space-y-5 transition-shadow hover:shadow-md ${level.borderClass} ${level.bgClass}`}
    >
      {/* Top row: icon + level name + badge */}
      <div className="flex items-start gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-2 ${level.iconRingClass} ${level.iconBgClass}`}
        >
          <Icon className={`h-8 w-8 ${level.textClass}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              Nível {level.number}
            </span>
            {level.topPercent && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${level.badgeClass}`}>
                {level.topPercent}
              </Badge>
            )}
          </div>
          <h2 className={`text-2xl font-bold leading-tight mt-0.5 ${level.textClass}`}>
            {level.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">
            {level.description}
          </p>
        </div>
      </div>

      {/* Commission value */}
      <div className="space-y-0.5">
        <p className={`text-3xl font-bold tabular-nums ${level.textClass}`}>
          {formatCurrency(commission)}
        </p>
        <p className="text-xs text-muted-foreground">
          em comissão — {monthLabel}
        </p>
      </div>

      {/* Progress to next level */}
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${level.barClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {nextLevel ? (
          <p className="text-xs text-muted-foreground">
            Faltam{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(remaining)}
            </span>{" "}
            para{" "}
            <span className={`font-semibold ${nextLevel.textClass}`}>
              {nextLevel.name}
            </span>
          </p>
        ) : (
          <p className={`text-xs font-semibold ${level.textClass}`}>
            Você atingiu o nível máximo. Parabéns.
          </p>
        )}
      </div>
    </div>
  );
}

/* ========================
   LEVEL ROW
======================== */

function LevelRow({
  level,
  currentNumber,
}: {
  level: LevelDef;
  currentNumber: number;
}) {
  const isCurrent = level.number === currentNumber;
  const isPast = level.number < currentNumber;
  const isFuture = level.number > currentNumber;
  const Icon = level.icon;

  return (
    <div
      className={`relative flex items-start gap-4 rounded-xl border p-4 transition-all
        ${isCurrent ? `border-2 ${level.borderClass} ${level.bgClass} shadow-sm` : "border-border bg-transparent"}
        ${isFuture ? "opacity-50" : ""}
      `}
    >
      {/* Icon */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-all
          ${isCurrent ? `${level.iconBgClass} ${level.iconRingClass}` : "bg-muted ring-border"}
        `}
      >
        <Icon
          className={`h-5 w-5 ${isCurrent ? level.textClass : "text-muted-foreground"}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-bold ${isCurrent ? level.textClass : "text-foreground"}`}
          >
            Nível {level.number} — {level.name}
          </span>
          {isCurrent && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-semibold border ${level.badgeClass}`}
            >
              Nível atual
            </Badge>
          )}
          {level.topPercent && !isCurrent && (
            <span className="text-[10px] text-muted-foreground">{level.topPercent}</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{formatCommissionRange(level)}</p>

        {isCurrent && (
          <p className="text-xs text-muted-foreground/80 leading-relaxed pt-0.5">
            {level.description}
          </p>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0 mt-0.5">
        {isPast && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
            <Check className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        {isFuture && (
          <Lock className="h-4 w-4 text-muted-foreground/40" />
        )}
        {isCurrent && (
          <div className={`h-2.5 w-2.5 rounded-full ${level.dot} animate-pulse`} />
        )}
      </div>
    </div>
  );
}

/* ========================
   PAGE
======================== */

export default function NivelPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [data, setData] = useState<{ lastMonthCommission: number; referenceMonth: string } | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/nivel?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() =>
        setData({ lastMonthCommission: 0, referenceMonth: new Date().toISOString() })
      );
  }, [firebaseUser]);

  const loading = loadingAuth || !data;
  const currentLevel = data ? getCurrentLevel(data.lastMonthCommission) : null;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl py-8 px-4 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Medal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Meu Nível</h1>
            <p className="text-sm text-muted-foreground">
              Atualizado todo mês com base na comissão do mês anterior.
            </p>
          </div>
        </div>

        {/* Hero — current level */}
        {loading ? (
          <div className="rounded-2xl border-2 border-border p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="space-y-1">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
        ) : (
          <HeroCard
            commission={data!.lastMonthCommission}
            referenceMonth={data!.referenceMonth}
          />
        )}

        {/* Level ladder */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            A jornada
          </p>

          {loading ? (
            <div className="space-y-2">
              {LEVELS.map((l) => (
                <Skeleton key={l.number} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[...LEVELS].reverse().map((level) => (
                <LevelRow
                  key={level.number}
                  level={level}
                  currentNumber={currentLevel!.number}
                />
              ))}
            </div>
          )}
        </section>

        <div className="pb-8" />
      </div>
    </Layout>
  );
}
