"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tag as TagIcon, Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Tag = { id: string; name: string; color: string };

const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Cor ${c}`}
          className={cn(
            "size-6 rounded-full border transition-transform hover:scale-110",
            value.toLowerCase() === c.toLowerCase()
              ? "ring-2 ring-offset-2 ring-foreground/40 border-transparent"
              : "border-black/10"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="relative size-6 rounded-full border border-black/10 overflow-hidden cursor-pointer">
        <span
          className="absolute inset-0"
          style={{
            background:
              "conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)",
          }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}

export default function EtiquetasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeader = useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchTags = useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/tags", { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTags(data.tags ?? []);
    } catch {
      toast.error("Não foi possível carregar as etiquetas");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    if (!firebaseUser) return;
    fetchTags();
  }, [firebaseUser, fetchTags]);

  const sorted = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [tags]
  );

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar etiqueta");
      setTags((prev) => [...prev, data.tag]);
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      toast.success("Etiqueta criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etiqueta");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(t: Tag) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditColor(t.color);
  }

  async function handleSaveEdit() {
    if (!editingId || saving) return;
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/tags/${editingId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: editColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      setTags((prev) => prev.map((t) => (t.id === editingId ? data.tag : t)));
      setEditingId(null);
      toast.success("Etiqueta atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/tags/${deleteTarget.id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error();
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Etiqueta excluída");
      setDeleteTarget(null);
    } catch {
      toast.error("Erro ao excluir etiqueta");
    } finally {
      setDeleting(false);
    }
  }

  if (loadingAuth) return null;

  return (
    <Layout>
      <div className="mx-auto w-full max-w-2xl px-4 lg:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <TagIcon className="size-5" />
            Etiquetas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre etiquetas pra organizar os leads. Elas são aplicadas dentro de cada conversa
            e servem pra filtrar a lista de conversas.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova etiqueta</CardTitle>
            <CardDescription>Escolha um nome e uma cor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Ex: Quente, Retorno, Empresarial…"
                maxLength={40}
              />
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Criar
              </Button>
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="pt-1">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: newColor }}
              >
                <TagIcon className="size-3" />
                {newName.trim() || "prévia"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Etiquetas cadastradas {tags.length > 0 && `(${tags.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma etiqueta ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {sorted.map((t) => {
                  const isEditing = editingId === t.id;
                  return (
                    <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                      {isEditing ? (
                        <div className="space-y-2.5">
                          <div className="flex gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                              maxLength={40}
                              autoFocus
                            />
                            <Button size="icon" onClick={handleSaveEdit} disabled={saving}>
                              {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              disabled={saving}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                          <ColorPicker value={editColor} onChange={setEditColor} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white max-w-full"
                            style={{ backgroundColor: t.color }}
                          >
                            <TagIcon className="size-3 shrink-0" />
                            <span className="truncate">{t.name}</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-muted-foreground"
                              onClick={() => startEdit(t)}
                              aria-label="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(t)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta <strong>{deleteTarget?.name}</strong> será removida de todos os leads que
              a têm. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
