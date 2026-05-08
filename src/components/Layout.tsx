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
  CircleDollarSign,
  UserStar,
  Users,
  CodeXml,
  ChartNoAxesCombined,
  Menu,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";

import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

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
  admin: boolean;
  isActive: boolean;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ========================
   NAV CONFIG
======================== */

const crmItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/funil", label: "Funil", icon: Workflow },
  { href: "/dashboard/mapa-estados", label: "Mapa", icon: MapPinned },
];

const equipeItems = [
  { href: "/dashboard/equipe", label: "Equipe", icon: Users },
  { href: "/dashboard/equipe/metricas", label: "Métricas", icon: ChartNoAxesCombined },
  { href: "/dashboard/codigo", label: "Código", icon: CodeXml },
];

const cotacaoItems = [
  { href: "/dashboard/cotacao", label: "Cotação", icon: CircleDollarSign },
];

/* ========================
   HELPERS
======================== */

function isRouteActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function DesktopDropdown({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { href: string; label: string; icon: any }[];
  pathname: string | null;
}) {
  const active = items.some((i) => isRouteActive(pathname, i.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 rounded-full relative transition-colors ${
            active
              ? "text-foreground font-semibold after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {title}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56 rounded-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const itemActive = isRouteActive(pathname, item.href);
          return (
            <DropdownMenuItem
              key={item.href}
              asChild
              className={itemActive ? "bg-accent font-medium" : ""}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
        setIsAdmin(!!data?.user?.admin);
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
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 border-b border-muted-foreground/10 bg-background/80 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto h-16 px-4 lg:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="hidden sm:block space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <Skeleton className="h-8 w-12 rounded-full" />
              <Skeleton className="h-8 w-14 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </main>
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 border-b border-muted-foreground/10 bg-background/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto h-16 px-4 lg:px-6 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <Image src="/imgs/logo02.png" alt="WinLeads" width={44} height={44} />
            <div className="hidden sm:block leading-tight">
              <p className="text-green-700 dark:text-green-400 font-bold tracking-tight">WinLeads</p>
              <p className="text-[11px] text-muted-foreground">CRM Planos de Saúde</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <DesktopDropdown title="CRM" items={crmItems} pathname={pathname} />
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <DesktopDropdown title="Equipe" items={equipeItems} pathname={pathname} />
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <DesktopDropdown title="Cotação" items={cotacaoItems} pathname={pathname} />
                </NavigationMenuItem>
                {isAdmin && (
                  <NavigationMenuItem>
                    <DesktopDropdown
                      title="Admin"
                      pathname={pathname}
                      items={[{ href: "/dashboard/admin", label: "Painel Admin", icon: UserStar }]}
                    />
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>

            <Separator orientation="vertical" className="h-6 mx-3" />

            <Button asChild size="sm" className="rounded-full gap-2 shadow-sm">
              <Link href="/dashboard/novo-lead">
                <Plus className="h-4 w-4" />
                Novo Lead
              </Link>
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[75%] max-w-xs p-0">
                  <SheetHeader className="px-4 pt-5 pb-4 border-b border-muted-foreground/10">
                    <SheetTitle className="text-base font-bold tracking-tight text-green-700 dark:text-green-400">
                      WinLeads
                    </SheetTitle>
                    {/* User info in sheet */}
                    <div className="flex items-center gap-3 pt-2">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                        <AvatarImage src={photo} alt={displayName} className="rounded-full" />
                        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="px-3 py-4 space-y-1 overflow-y-auto">
                    <Button asChild className="w-full gap-2 rounded-xl mb-3">
                      <Link href="/dashboard/novo-lead">
                        <Plus className="h-4 w-4" />
                        Novo Lead
                      </Link>
                    </Button>

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
                      CRM
                    </p>
                    {crmItems.map((item) => {
                      const Icon = item.icon;
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <Button
                          key={item.href}
                          asChild
                          variant={active ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2 rounded-xl"
                        >
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}

                    <div className="h-px bg-muted-foreground/10 my-2" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
                      Equipe
                    </p>
                    {equipeItems.map((item) => {
                      const Icon = item.icon;
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <Button
                          key={item.href}
                          asChild
                          variant={active ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2 rounded-xl"
                        >
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}

                    <div className="h-px bg-muted-foreground/10 my-2" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
                      Cotação
                    </p>
                    {cotacaoItems.map((item) => {
                      const Icon = item.icon;
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <Button
                          key={item.href}
                          asChild
                          variant={active ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2 rounded-xl"
                        >
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}

                    {isAdmin && (
                      <>
                        <div className="h-px bg-muted-foreground/10 my-2" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
                          Admin
                        </p>
                        <Button
                          asChild
                          variant={isRouteActive(pathname, "/dashboard/admin") ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2 rounded-xl"
                        >
                          <Link href="/dashboard/admin">
                            <UserStar className="h-4 w-4" />
                            Painel Admin
                          </Link>
                        </Button>
                      </>
                    )}

                    <div className="h-px bg-muted-foreground/10 my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-2xl h-10 px-4 gap-2 hover:bg-accent">
                  <div className="hidden sm:flex flex-col text-right leading-tight">
                    <span className="text-sm font-medium truncate max-w-[160px]">{displayName}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">{email}</span>
                  </div>
                  <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                    <AvatarImage src={photo} alt={displayName} className="rounded-full" />
                    <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                {/* User card */}
                <div className="flex items-center gap-3 px-2 py-2 mb-1">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20 shrink-0">
                    <AvatarImage src={photo} alt={displayName} className="rounded-full" />
                    <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                    {isAdmin && (
                      <span className="inline-flex items-center rounded-full ring-1 ring-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/configuracoes"
                    className="gap-2 rounded-lg cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 rounded-lg text-muted-foreground hover:text-destructive focus:text-destructive cursor-pointer mt-1"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <main className="flex-1">
        {fullWidth ? (
          <div className="px-4 lg:px-6 py-4">{children}</div>
        ) : (
          children
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-muted-foreground/10 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} WinLeads
          </span>
          <span className="text-xs text-muted-foreground">CRM para planos de saúde</span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
