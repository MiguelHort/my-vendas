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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  CheckCircle2,
  Clock,
  Lock,
  Pencil,
  Save,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type Role = "ADMIN" | "VENDEDOR";

type AdminUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  role: Role;
  approved: boolean;
};

type EditForm = {
  email: string;
  name: string;
  role: Role;
  approved: boolean;
};

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

  async function fetchUsers() {
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
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      role: user.role,
      approved: user.approved,
    });
  }

  function closeEdit() {
    setEditingUser(null);
    setEditForm(null);
  }

  async function updateUser(id: string, patch: Partial<EditForm>) {
    if (!firebaseUser) return;
    const token = await firebaseUser.getIdToken();
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Erro ao atualizar usuário");
    const data = await res.json();
    const updatedUser = data.user as AdminUser;
    setUsers((prev) =>
      (prev ?? []).map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
    );
    return updatedUser;
  }

  async function handleApprove(user: AdminUser) {
    try {
      await updateUser(user.id, { approved: true });
      toast.success(`${user.name || user.email} aprovado`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar usuário");
    }
  }

  async function handleSaveEdit() {
    if (!editingUser || !editForm) return;
    try {
      await updateUser(editingUser.id, editForm);
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
      toast.success("Usuário deletado com sucesso");
      setDeleteUser(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar usuário");
    }
  }

  // Derived data
  const safeUsers: AdminUser[] = users ?? [];
  const totalUsers = safeUsers.length;
  const adminsCount = safeUsers.filter((u) => u.role === "ADMIN").length;
  const vendedoresCount = safeUsers.filter((u) => u.role === "VENDEDOR").length;
  const pending = safeUsers.filter((u) => !u.approved);

  // ---- loading / access states ----
  if (loadingAuth || loadingPage) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-80 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
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
            Gerencie usuários, cargos e aprovações de cadastro.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              label: "Admins",
              value: adminsCount,
              icon: Shield,
              iconBg: "bg-amber-500/10",
              iconRing: "ring-amber-500/20",
              iconColor: "text-amber-600 dark:text-amber-400",
              valueColor: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Vendedores",
              value: vendedoresCount,
              icon: UserCog,
              iconBg: "bg-blue-500/10",
              iconRing: "ring-blue-500/20",
              iconColor: "text-blue-600 dark:text-blue-400",
              valueColor: "text-blue-600 dark:text-blue-400",
            },
            {
              label: "Pendentes de aprovação",
              value: pending.length,
              icon: Clock,
              iconBg: "bg-red-500/10",
              iconRing: "ring-red-500/20",
              iconColor: "text-red-600 dark:text-red-400",
              valueColor: "text-red-600 dark:text-red-400",
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

        {/* Pendentes de aprovação */}
        {pending.length > 0 && (
          <Card className="border-amber-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Cadastros aguardando aprovação
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-muted-foreground/10 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{user.name || "-"}</div>
                    <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <Button size="sm" onClick={() => handleApprove(user)}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Aprovar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalUsers === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
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
                      {user.role === "ADMIN" ? (
                        <span className="inline-flex items-center rounded-full ring-1 ring-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full ring-1 ring-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                          Vendedor
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.approved ? (
                        <span className="inline-flex items-center rounded-full ring-1 ring-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Aprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full ring-1 ring-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
                          Pendente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{formatDate(user.createdAt)}</TableCell>
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

                <div className="space-y-1">
                  <label className="text-sm font-medium">Cargo</label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value: Role) =>
                      setEditForm((prev) => (prev ? { ...prev, role: value } : prev))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-medium">Aprovado</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editForm.approved}
                      onCheckedChange={(checked) =>
                        setEditForm((prev) => (prev ? { ...prev, approved: checked } : prev))
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      Controla se o usuário pode acessar o sistema
                    </span>
                  </div>
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
              Esta ação removerá o usuário do banco e da autenticação Firebase. Não pode
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
