"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Activity,
  AlertCircle,
  BarChart2,
  Lock,
  Pencil,
  PieChartIcon,
  Save,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type TrialStatus = "paid" | "trial" | "blocked";

type AdminUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  admin: boolean;
  trialStatus: TrialStatus;
  trialEndsAt: string | null;
};

type EditForm = {
  email: string;
  name: string;
  admin: boolean;
  isActive: boolean;
  subscriptionStatus: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
};

const STATUS_COLORS: Record<TrialStatus, string> = {
  paid: "#16a34a",
  trial: "#2563eb",
  blocked: "#b91c1c",
};

function StatusPill({ status }: { status: TrialStatus }) {
  const map: Record<TrialStatus, { label: string; cls: string }> = {
    paid: {
      label: "Pagante",
      cls: "ring-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    trial: {
      label: "7 dias grátis",
      cls: "ring-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    blocked: {
      label: "Bloqueado",
      cls: "ring-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    },
  };
  const { label, cls } = map[status] ?? map.blocked;
  return (
    <span
      className={`inline-flex items-center rounded-full ring-1 px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!loadingAuth && !firebaseUser) router.replace("/login");
  }, [firebaseUser, loadingAuth, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!firebaseUser) return;
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 403) {
          setIsAdmin(false);
          setLoadingPage(false);
          return;
        }
        if (!res.ok) throw new Error("Erro ao buscar usuários");

        const data = await res.json();
        setIsAdmin(true);
        setUsers(data.users as AdminUser[]);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar usuários");
      } finally {
        setLoadingPage(false);
      }
    };
    fetchUsers();
  }, [firebaseUser]);

  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      name: user.name ?? "",
      admin: user.admin,
      isActive: user.isActive,
      subscriptionStatus: user.subscriptionStatus ?? "",
      stripeCustomerId: user.stripeCustomerId ?? "",
      stripeSubscriptionId: user.stripeSubscriptionId ?? "",
    });
  }

  function closeEdit() {
    setEditingUser(null);
    setEditForm(null);
  }

  async function handleSaveEdit() {
    if (!editingUser || !editForm || !firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Erro ao atualizar usuário");
      const data = await res.json();
      const updatedUser = data.user as AdminUser;
      setUsers((prev) =>
        (prev ?? []).map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );
      toast.success("Usuário atualizado com sucesso");
      closeEdit();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar usuário");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteUser || !firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao deletar usuário");
      setUsers((prev) => (prev ?? []).filter((u) => u.id !== deleteUser.id));
      toast.success("Usuário deletado com sucesso (Supabase + Firebase)");
      setDeleteUser(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar usuário");
    }
  }

  // Derived data
  const safeUsers: AdminUser[] = users ?? [];
  const totalUsers = safeUsers.length;
  const paidCount = safeUsers.filter((u) => u.trialStatus === "paid").length;
  const trialCount = safeUsers.filter((u) => u.trialStatus === "trial").length;
  const blockedCount = safeUsers.filter((u) => u.trialStatus === "blocked").length;
  const adminsCount = safeUsers.filter((u) => u.admin).length;
  const activesCount = safeUsers.filter((u) => u.isActive).length;

  const trialDistributionData = [
    { name: "Pagantes", value: paidCount, key: "paid" as TrialStatus },
    { name: "7 dias grátis", value: trialCount, key: "trial" as TrialStatus },
    { name: "Bloqueados", value: blockedCount, key: "blocked" as TrialStatus },
  ];

  const monthlyUsersData = (() => {
    const map = new Map<string, number>();
    safeUsers.forEach((u) => {
      const date = new Date(u.createdAt);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, count]) => {
        const [year, month] = key.split("-");
        const labelDate = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
          "pt-BR",
          { month: "2-digit", year: "2-digit" }
        );
        return { month: labelDate, count };
      });
  })();

  // ---- loading / access states ----
  if (loadingAuth || loadingPage) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-80 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (isAdmin === false) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Acesso negado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você não tem permissão para acessar esta página.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            Administração
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, status de trial, pagamentos e permissões.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: "Total",
              value: totalUsers,
              icon: Users,
              iconBg: "bg-violet-500/10",
              iconRing: "ring-violet-500/20",
              iconColor: "text-violet-600 dark:text-violet-400",
              valueColor: "",
            },
            {
              label: "Pagantes",
              value: paidCount,
              icon: Activity,
              iconBg: "bg-emerald-500/10",
              iconRing: "ring-emerald-500/20",
              iconColor: "text-emerald-600 dark:text-emerald-400",
              valueColor: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "7 dias grátis",
              value: trialCount,
              icon: AlertCircle,
              iconBg: "bg-blue-500/10",
              iconRing: "ring-blue-500/20",
              iconColor: "text-blue-600 dark:text-blue-400",
              valueColor: "text-blue-600 dark:text-blue-400",
            },
            {
              label: "Bloqueados",
              value: blockedCount,
              icon: Lock,
              iconBg: "bg-red-500/10",
              iconRing: "ring-red-500/20",
              iconColor: "text-red-600 dark:text-red-400",
              valueColor: "text-red-600 dark:text-red-400",
            },
            {
              label: "Admins",
              value: adminsCount,
              icon: Shield,
              iconBg: "bg-amber-500/10",
              iconRing: "ring-amber-500/20",
              iconColor: "text-amber-600 dark:text-amber-400",
              valueColor: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Ativos",
              value: activesCount,
              icon: Activity,
              iconBg: "bg-emerald-500/10",
              iconRing: "ring-emerald-500/20",
              iconColor: "text-emerald-600 dark:text-emerald-400",
              valueColor: "text-emerald-700 dark:text-emerald-300",
            },
          ].map(({ label, value, icon: Icon, iconBg, iconRing, iconColor, valueColor }) => (
            <Card
              key={label}
              className="border-muted-foreground/10 shadow-sm hover:-translate-y-0.5 transition-all duration-300"
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <div
                  className={`h-7 w-7 rounded-lg ${iconBg} ring-1 ${iconRing} flex items-center justify-center`}
                >
                  <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                  <PieChartIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Distribuição por status</CardTitle>
                  <CardDescription>Pagantes · Trial · Bloqueados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-64">
              {totalUsers === 0 ? (
                <div className="flex flex-col h-full items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Ainda não há usuários suficientes.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trialDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {trialDistributionData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, _name: any, item: any) => [
                        `${value} usuário(s)`,
                        item?.payload?.name,
                      ]}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                  <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Novos usuários por mês</CardTitle>
                  <CardDescription>Crescimento histórico de cadastros</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-64">
              {monthlyUsersData.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <BarChart2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Ainda não há histórico suficiente.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyUsersData}>
                    <defs>
                      <linearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <RechartsTooltip
                      formatter={(value: any) => [`${value} usuário(s)`, ""]}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#adminBarGrad)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User table */}
        <div className="rounded-xl border border-muted-foreground/10 bg-background overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-muted-foreground/10 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Total de usuários:{" "}
              <span className="font-semibold tabular-nums text-foreground">{totalUsers}</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Trial até</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalUsers === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Nenhum usuário encontrado.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {safeUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-[220px] truncate font-medium">
                      {user.name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={user.trialStatus} />
                    </TableCell>
                    <TableCell>
                      {user.admin ? (
                        <span className="inline-flex items-center rounded-full ring-1 ring-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Usuário</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="tabular-nums text-sm">{formatDate(user.trialEndsAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && closeEdit()}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                  <Pencil className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <DialogTitle>Editar usuário</DialogTitle>
              </div>
            </DialogHeader>

            {editingUser && editForm && (
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Assinatura ativa</label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.isActive}
                        onCheckedChange={(checked) =>
                          setEditForm((prev) => (prev ? { ...prev, isActive: checked } : prev))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Controla se o usuário está ativo
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Admin</label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.admin}
                        onCheckedChange={(checked) =>
                          setEditForm((prev) => (prev ? { ...prev, admin: checked } : prev))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Acesso ao painel admin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">subscriptionStatus</label>
                  <Input
                    value={editForm.subscriptionStatus}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, subscriptionStatus: e.target.value } : prev
                      )
                    }
                    placeholder='Ex: "active", "trialing", "canceled"...'
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">stripeCustomerId</label>
                  <Input
                    value={editForm.stripeCustomerId}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, stripeCustomerId: e.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">stripeSubscriptionId</label>
                  <Input
                    value={editForm.stripeSubscriptionId}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, stripeSubscriptionId: e.target.value } : prev
                      )
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={closeEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta ação removerá o usuário do banco (Supabase) e da autenticação Firebase. Não pode
              ser desfeita.
            </p>
            <div className="mt-3 rounded-xl border border-muted-foreground/10 bg-muted/50 px-3 py-2.5 text-sm space-y-0.5">
              <p>
                <span className="font-medium">Nome:</span>{" "}
                <span className="text-muted-foreground">{deleteUser?.name || "-"}</span>
              </p>
              <p>
                <span className="font-medium">Email:</span>{" "}
                <span className="text-muted-foreground">{deleteUser?.email}</span>
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteUser(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleConfirmDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
