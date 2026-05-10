"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Trophy, CheckCircle2 } from "lucide-react";

/* ========================
   TYPES
======================== */

type Tier = "Bronze" | "Prata" | "Ouro" | "Diamante";
type Track = "quantidade" | "valor" | "comissao";

type Achievement = {
  id: number;
  emoji: string;
  title: string;
  description: string;
  hint: string;
  tier: Tier;
  track: Track;
  threshold: number;
};

type Metrics = {
  totalVendas: number;
  totalValorVendas: number;
  totalComissao: number;
};

/* ========================
   ACHIEVEMENTS DATA
======================== */

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    emoji: "🎯",
    title: "Primeira Venda",
    description: "Fechou 1 venda pelo WinLeads.",
    hint: "Feche sua primeira venda no WinLeads.",
    tier: "Bronze",
    track: "quantidade",
    threshold: 1,
  },
  {
    id: 2,
    emoji: "💵",
    title: "Primeiros Mil",
    description: "Atingiu R$ 1.000 em vendas acumuladas.",
    hint: "Acumule R$ 1.000 em valor de vendas.",
    tier: "Bronze",
    track: "valor",
    threshold: 1_000,
  },
  {
    id: 3,
    emoji: "💰",
    title: "Primeira Comissão",
    description: "Acumulou R$ 500 em comissões.",
    hint: "Acumule R$ 500 em comissões.",
    tier: "Bronze",
    track: "comissao",
    threshold: 500,
  },
  {
    id: 4,
    emoji: "⚡",
    title: "Closer Iniciante",
    description: "Fechou 10 vendas no total.",
    hint: "Feche 10 vendas no WinLeads.",
    tier: "Prata",
    track: "quantidade",
    threshold: 10,
  },
  {
    id: 5,
    emoji: "📈",
    title: "Cinco Dígitos",
    description: "Atingiu R$ 10.000 em vendas acumuladas.",
    hint: "Acumule R$ 10.000 em valor de vendas.",
    tier: "Prata",
    track: "valor",
    threshold: 10_000,
  },
  {
    id: 6,
    emoji: "🪙",
    title: "Cinco Mil em Comissão",
    description: "Acumulou R$ 5.000 em comissões.",
    hint: "Acumule R$ 5.000 em comissões.",
    tier: "Prata",
    track: "comissao",
    threshold: 5_000,
  },
  {
    id: 7,
    emoji: "🏆",
    title: "Meio Centenário",
    description: "Fechou 50 vendas no total.",
    hint: "Feche 50 vendas no WinLeads.",
    tier: "Ouro",
    track: "quantidade",
    threshold: 50,
  },
  {
    id: 8,
    emoji: "🚀",
    title: "Seis Dígitos",
    description: "Atingiu R$ 100.000 em vendas acumuladas.",
    hint: "Acumule R$ 100.000 em valor de vendas.",
    tier: "Ouro",
    track: "valor",
    threshold: 100_000,
  },
  {
    id: 9,
    emoji: "💎",
    title: "Cinquentão",
    description: "Acumulou R$ 50.000 em comissões.",
    hint: "Acumule R$ 50.000 em comissões.",
    tier: "Ouro",
    track: "comissao",
    threshold: 50_000,
  },
  {
    id: 10,
    emoji: "👑",
    title: "Lenda WinLeads",
    description: "Acumulou R$ 100.000 em comissões.",
    hint: "Acumule R$ 100.000 em comissões. Apenas os melhores chegam aqui.",
    tier: "Diamante",
    track: "comissao",
    threshold: 100_000,
  },
];

/* ========================
   TIER CONFIG
======================== */

const TIER_CONFIG: Record<
  Tier,
  {
    badgeClass: string;
    borderClass: string;
    bgClass: string;
    ringClass: string;
    emojiBgClass: string;
    barClass: string;
    dot: string;
  }
> = {
  // #d97706 — amber-600
  Bronze: {
    badgeClass:
      "bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-500 dark:border-amber-600/60",
    borderClass: "border-amber-300 dark:border-amber-600",
    bgClass:
      "bg-amber-50 dark:bg-amber-950/25",
    ringClass: "ring-amber-400 dark:ring-amber-600",
    emojiBgClass: "bg-amber-100 dark:bg-amber-950/60",
    barClass: "bg-amber-600",
    dot: "bg-amber-600",
  },
  // #cbd5e1 — slate-300
  Prata: {
    badgeClass:
      "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-300/60",
    borderClass: "border-slate-300 dark:border-slate-300",
    bgClass:
      "bg-slate-50 dark:bg-slate-800/20",
    ringClass: "ring-slate-300 dark:ring-slate-300",
    emojiBgClass: "bg-slate-100 dark:bg-slate-800/60",
    barClass: "bg-slate-300",
    dot: "bg-slate-300",
  },
  // #facc15 — yellow-400
  Ouro: {
    badgeClass:
      "bg-yellow-100 text-yellow-600 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-400/60",
    borderClass: "border-yellow-300 dark:border-yellow-400",
    bgClass:
      "bg-yellow-50 dark:bg-yellow-950/20",
    ringClass: "ring-yellow-400 dark:ring-yellow-400",
    emojiBgClass: "bg-yellow-100 dark:bg-yellow-950/60",
    barClass: "bg-yellow-400",
    dot: "bg-yellow-400",
  },
  // #67e8f9 — cyan-300
  Diamante: {
    badgeClass:
      "bg-cyan-100 text-cyan-600 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-300/60",
    borderClass: "border-cyan-300 dark:border-cyan-300",
    bgClass:
      "bg-cyan-50 dark:bg-cyan-950/20",
    ringClass: "ring-cyan-300 dark:ring-cyan-300",
    emojiBgClass: "bg-cyan-100 dark:bg-cyan-950/60",
    barClass: "bg-cyan-300",
    dot: "bg-cyan-300",
  },
};

/* ========================
   HELPERS
======================== */

function getCurrentValue(track: Track, metrics: Metrics): number {
  if (track === "quantidade") return metrics.totalVendas;
  if (track === "valor") return metrics.totalValorVendas;
  return metrics.totalComissao;
}

function formatProgress(track: Track, current: number, threshold: number): string {
  if (track === "quantidade") {
    return `${current} / ${threshold} venda${threshold > 1 ? "s" : ""}`;
  }
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const label = track === "comissao" ? " em comissão" : " em vendas";
  return `${fmt(current)} / ${fmt(threshold)}${label}`;
}

/* ========================
   ACHIEVEMENT CARD
======================== */

function AchievementCard({
  achievement,
  metrics,
}: {
  achievement: Achievement;
  metrics: Metrics;
}) {
  const tier = TIER_CONFIG[achievement.tier];
  const current = getCurrentValue(achievement.track, metrics);
  const unlocked = current >= achievement.threshold;
  const pct = Math.min(100, (current / achievement.threshold) * 100);

  if (unlocked) {
    return (
      <div
        className={`relative flex flex-col gap-3 rounded-xl border-2 p-5 transition-shadow hover:shadow-md ${tier.borderClass} ${tier.bgClass}`}
      >
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-2 ${tier.ringClass} ${tier.emojiBgClass}`}
          >
            <span className="text-2xl">{achievement.emoji}</span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Badge
              variant="outline"
              className={`w-fit text-[10px] px-1.5 py-0 font-semibold border ${tier.badgeClass}`}
            >
              {achievement.tier}
            </Badge>
            <p className="font-bold text-sm leading-tight truncate">{achievement.title}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{achievement.description}</p>

        <div className="flex items-center gap-1.5 mt-auto pt-1">
          <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
          <span className="text-[10px] font-medium text-muted-foreground">Desbloqueada</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 transition-opacity hover:opacity-90 opacity-70">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border grayscale">
          <span className="text-2xl">{achievement.emoji}</span>
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <Badge
            variant="outline"
            className="w-fit text-[10px] px-1.5 py-0 font-medium text-muted-foreground border-border"
          >
            {achievement.tier}
          </Badge>
          <p className="font-semibold text-sm text-muted-foreground leading-tight truncate">
            {achievement.title}
          </p>
        </div>
        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
      </div>

      <p className="text-xs text-muted-foreground/70 leading-relaxed">{achievement.hint}</p>

      <div className="space-y-1.5 mt-auto pt-1">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${tier.barClass} opacity-60`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {formatProgress(achievement.track, current, achievement.threshold)}
        </p>
      </div>
    </div>
  );
}

/* ========================
   SKELETON CARD
======================== */

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-border p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-3/4 rounded" />
      <Skeleton className="h-1.5 w-full rounded-full mt-1" />
    </div>
  );
}

/* ========================
   PAGE
======================== */

const TIER_ORDER: Tier[] = ["Bronze", "Prata", "Ouro", "Diamante"];

export default function ConquistasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/conquistas?${params}`)
      .then((r) => r.json())
      .then((data) => setMetrics(data))
      .catch(() => setMetrics({ totalVendas: 0, totalValorVendas: 0, totalComissao: 0 }));
  }, [firebaseUser]);

  const loading = loadingAuth || !metrics;

  const unlocked = metrics
    ? ACHIEVEMENTS.filter((a) => getCurrentValue(a.track, metrics) >= a.threshold).length
    : 0;
  const total = ACHIEVEMENTS.length;

  const byTier = (tier: Tier) => ACHIEVEMENTS.filter((a) => a.tier === tier);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl py-8 px-4 space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Minhas Conquistas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cada conquista celebra um marco real na sua jornada como corretor.
            </p>
          </div>
          <div className="text-right shrink-0">
            {loading ? (
              <Skeleton className="h-8 w-16 ml-auto" />
            ) : (
              <>
                <p className="text-2xl font-bold tabular-nums">
                  {unlocked}
                  <span className="text-base font-normal text-muted-foreground">/{total}</span>
                </p>
                <p className="text-xs text-muted-foreground">desbloqueadas</p>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: loading ? "0%" : `${(unlocked / total) * 100}%` }}
          />
        </div>

        {/* Sections by tier */}
        {TIER_ORDER.map((tier) => (
          <section key={tier} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${TIER_CONFIG[tier].dot}`} />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {tier}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading
                ? byTier(tier).map((a) => <CardSkeleton key={a.id} />)
                : byTier(tier).map((a) => (
                    <AchievementCard key={a.id} achievement={a} metrics={metrics!} />
                  ))}
            </div>
          </section>
        ))}

        <div className="pb-8" />
      </div>
    </Layout>
  );
}
