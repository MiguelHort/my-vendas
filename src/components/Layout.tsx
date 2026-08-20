"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  LayoutDashboard,
  Workflow,
  Plus,
  MapPinned,
  UserStar,
  LogOut,
  Settings,
  History,
  ChevronsUpDown,
  Bot,
  Trophy,
  Medal,
  MessageCircle,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { WillWidget } from "@/components/WillWidget";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/* ========================
   TYPES
======================== */

type LayoutProps = {
  children: ReactNode;
  fullWidth?: boolean;
};

type MeUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "VENDEDOR";
  approved: boolean;
  createdAt: string;
  updatedAt: string;
};

/* ========================
   NAV CONFIG
======================== */

const crmItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/funil", label: "Funil", icon: Workflow },
  { href: "/dashboard/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/dashboard/minhas-vendas", label: "Minhas Vendas", icon: History },
  { href: "/dashboard/mapa-estados", label: "Mapa", icon: MapPinned },
  { href: "/dashboard/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/dashboard/nivel", label: "Nível", icon: Medal },
];

const assistentesItems = [
  { href: "/dashboard/will", label: "Chat", icon: Bot },
];

/* ========================
   BREADCRUMB HELPERS
======================== */

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  funil: "Funil",
  conversas: "Conversas",
  "minhas-vendas": "Minhas Vendas",
  "mapa-estados": "Mapa",
  cotacao: "Cotação",
  admin: "Admin",
  configuracoes: "Configurações",
  "novo-lead": "Novo Lead",
  Will: "Will IA",
  conquistas: "Conquistas",
  nivel: "Nível",
};

type BreadcrumbEntry = { label: string; href: string };

function buildBreadcrumbs(pathname: string | null): BreadcrumbEntry[] {
  if (!pathname) return [];
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbEntry[] = [];
  let accumulated = "";

  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = segmentLabels[seg];
    if (label) crumbs.push({ label, href: accumulated });
  }

  return crumbs;
}

/* ========================
   HELPERS
======================== */

function isRouteActive(pathname: string | null, href: string, exact = false) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/* ========================
   SIDEBAR COMPONENT
======================== */

function AppSidebar({
  pathname,
  isAdmin,
  displayName,
  email,
  photo,
  initials,
  onLogout,
}: {
  pathname: string | null;
  isAdmin: boolean;
  displayName: string;
  email: string;
  photo: string;
  initials: string;
  onLogout: () => void;
}) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-background">
                  <Image src="/imgs/logo02.png" alt="WinLeads" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-green-700 dark:text-green-400">
                    WinLeads
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    CRM Planos de Saúde
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* CRM */}
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Assistentes (Will)</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {assistentesItems.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isRouteActive(pathname, "/dashboard/admin")}
                    tooltip="Painel Admin"
                  >
                    <Link href="/dashboard/admin">
                      <UserStar />
                      <span>Painel Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg ring-2 ring-primary/20">
                    <AvatarImage src={photo} alt={displayName} className="rounded-lg" />
                    <AvatarFallback className="rounded-lg text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg ring-2 ring-primary/20">
                      <AvatarImage src={photo} alt={displayName} className="rounded-lg" />
                      <AvatarFallback className="rounded-lg text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/configuracoes" className="gap-2 cursor-pointer">
                    <Settings className="size-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="gap-2 cursor-pointer text-muted-foreground hover:text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

/* ========================
   LAYOUT
======================== */

export function Layout({ children, fullWidth = false }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [meUser, setMeUser] = useState<MeUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMeUser(data?.user ?? null);
        setIsAdmin(data?.user?.role === "ADMIN");
      } catch {
        setMeUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  /* ---- skeleton state ---- */
  if (user === undefined) {
    return (
      <div className="flex min-h-svh w-full">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r border-border bg-sidebar flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="space-y-2 mt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border flex items-center px-4 gap-4">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <main className="flex-1 p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-96 rounded-lg" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const displayName = user?.displayName || meUser?.name || "Usuário";
  const email = user?.email || meUser?.email || "";
  const photo = user?.photoURL || "";

  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar
        pathname={pathname}
        isAdmin={isAdmin}
        displayName={displayName}
        email={email}
        photo={photo}
        initials={initials}
        onLogout={handleLogout}
      />

      <SidebarInset className="overflow-hidden md:peer-data-[variant=inset]:shadow-lg md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border/60">
        {/* ===== HEADER ===== */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 bg-background/80 backdrop-blur-md z-40">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={crumb.href} className="flex items-center gap-1.5 sm:gap-2.5">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto">
            <Button asChild size="sm" className="rounded-full gap-2 shadow-sm">
              <Link href="/dashboard/novo-lead">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Lead</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 overflow-auto">
          <main>
            {fullWidth ? (
              <div className="px-4 lg:px-6 py-4">{children}</div>
            ) : (
              children
            )}
          </main>
        </div>

        {pathname !== "/dashboard/Will" && <WillWidget />}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Layout;
