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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Loader2, Pencil, Trash2, Users, Shield, Activity } from "lucide-react";
import { toast } from "sonner";

// Recharts
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
  paid: "#16a34a", // verde
  trial: "#2563eb", // azul
  blocked: "#b91c1c", // vermelho
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!loadingAuth && !firebaseUser) {
      router.replace("/login");
    }
  }, [firebaseUser, loadingAuth, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!firebaseUser) return;

      try {
        setLoadingUsers(true);
        const token = await firebaseUser.getIdToken();
        const res = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 403) {
          setIsAdmin(false);
          setLoadingPage(false);
          setLoadingUsers(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Erro ao buscar usuários");
        }

        const data = await res.json();
        setIsAdmin(true);
        setUsers(data.users as AdminUser[]);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar usuários");
      } finally {
        setLoadingPage(false);
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [firebaseUser]);

  function getStatusLabel(trialStatus: TrialStatus) {
    switch (trialStatus) {
      case "paid":
        return <Badge className="bg-emerald-600">Pagante</Badge>;
      case "trial":
        return <Badge className="bg-blue-600">7 dias grátis</Badge>;
      case "blocked":
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return null;
    }
  }

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

      if (!res.ok) {
        throw new Error("Erro ao atualizar usuário");
      }

      const data = await res.json();
      const updatedUser = data.user as AdminUser;

      setUsers((prev) =>
        (prev ?? []).map((u) =>
          u.id === updatedUser.id ? { ...u, ...updatedUser } : u
        )
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Erro ao deletar usuário");
      }

      setUsers((prev) => (prev ?? []).filter((u) => u.id !== deleteUser.id));
      toast.success("Usuário deletado com sucesso (Supabase + Firebase)");
      setDeleteUser(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar usuário");
    }
  }

  // --- dados derivados (não são hooks) ---
  const safeUsers: AdminUser[] = users ?? [];
  const totalUsers = safeUsers.length;

  const paidCount = safeUsers.filter((u) => u.trialStatus === "paid").length;
  const trialCount = safeUsers.filter((u) => u.trialStatus === "trial").length;
  const blockedCount = safeUsers.filter(
    (u) => u.trialStatus === "blocked"
  ).length;
  const adminsCount = safeUsers.filter((u) => u.admin).length;
  const activesCount = safeUsers.filter((u) => u.isActive).length;

  const trialDistributionData = [
    { name: "Pagantes", value: paidCount, key: "paid" as TrialStatus },
    {
      name: "7 dias grátis",
      value: trialCount,
      key: "trial" as TrialStatus,
    },
    {
      name: "Bloqueados",
      value: blockedCount,
      key: "blocked" as TrialStatus,
    },
  ];

  const monthlyUsersData = (() => {
    const map = new Map<string, number>();

    safeUsers.forEach((u) => {
      const date = new Date(u.createdAt);
      if (isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`; // 2025-01

      const current = map.get(key) || 0;
      map.set(key, current + 1);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, count]) => {
        const [year, month] = key.split("-");
        const labelDate = new Date(
          Number(year),
          Number(month) - 1,
          1
        ).toLocaleDateString("pt-BR", {
          month: "2-digit",
          year: "2-digit",
        });

        return {
          month: labelDate,
          count,
        };
      });
  })();

  if (loadingAuth || loadingPage) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (isAdmin === false) {
    return (
      <Layout>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Administração de Usuários
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os usuários do sistema, status de trial, pagamentos e
              permissões.
            </p>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Card className="border border-emerald-100/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total de usuários
              </CardTitle>
              <Users className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Pagantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-emerald-600">
                {paidCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                7 dias grátis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-blue-600">
                {trialCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Bloqueados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-red-600">
                {blockedCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Admins
              </CardTitle>
              <Shield className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-amber-600">
                {adminsCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Ativos (isActive)
              </CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-emerald-700">
                {activesCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Distribuição por status
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {totalUsers === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Ainda não há usuários suficientes para mostrar o gráfico.
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
                        <Cell
                          key={entry.key}
                          fill={STATUS_COLORS[entry.key]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, _name: any, item: any) => [
                        `${value} usuário(s)`,
                        item?.payload?.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Novos usuários por mês
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {monthlyUsersData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Ainda não há histórico suficiente para mostrar o gráfico.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyUsersData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [`${value} usuário(s)`, ""]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm text-muted-foreground">
              Total de usuários:{" "}
              <span className="font-medium text-foreground">
                {totalUsers}
              </span>
            </p>
            {loadingUsers && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Trial até</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalUsers === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      <span className="text-sm text-muted-foreground">
                        Nenhum usuário encontrado.
                      </span>
                    </TableCell>
                  </TableRow>
                )}

                {safeUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-[220px] truncate">
                      {user.name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">
                      {user.email}
                    </TableCell>
                    <TableCell>{getStatusLabel(user.trialStatus)}</TableCell>
                    <TableCell>
                      {user.admin ? (
                        <Badge variant="outline" className="border-amber-500">
                          Admin
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Usuário
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>{formatDate(user.trialEndsAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
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

        {/* Dialog de edição */}
        <Dialog
          open={!!editingUser}
          onOpenChange={(open) => !open && closeEdit()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
            </DialogHeader>

            {editingUser && editForm && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, email: e.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Assinatura ativa (isActive)
                    </label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.isActive}
                        onCheckedChange={(checked) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, isActive: checked } : prev
                          )
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Controla se o usuário está ativo no sistema
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Admin</label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.admin}
                        onCheckedChange={(checked) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, admin: checked } : prev
                          )
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Concede acesso ao painel admin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    subscriptionStatus
                  </label>
                  <Input
                    value={editForm.subscriptionStatus}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? { ...prev, subscriptionStatus: e.target.value }
                          : prev
                      )
                    }
                    placeholder='Ex: "active", "trialing", "canceled"...'
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    stripeCustomerId
                  </label>
                  <Input
                    value={editForm.stripeCustomerId}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? { ...prev, stripeCustomerId: e.target.value }
                          : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    stripeSubscriptionId
                  </label>
                  <Input
                    value={editForm.stripeSubscriptionId}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? { ...prev, stripeSubscriptionId: e.target.value }
                          : prev
                      )
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={closeEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog de deleção */}
        <AlertDialog
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Deseja realmente deletar este usuário?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta ação irá remover o usuário do banco (Supabase via Prisma) e
              também da autenticação Firebase. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
              <p>
                <span className="font-medium">Nome:</span>{" "}
                {deleteUser?.name || "-"}
              </p>
              <p>
                <span className="font-medium">Email:</span>{" "}
                {deleteUser?.email}
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteUser(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleConfirmDelete}
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
