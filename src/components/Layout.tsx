"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

/* =======================
   TYPES
======================= */

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

/* =======================
   NAV CONFIG
======================= */

const crmItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/funil", label: "Funil", icon: Workflow },
  { href: "/dashboard/mapa-estados", label: "Mapa", icon: MapPinned },
];

const equipeItems = [
  { href: "/dashboard/equipe", label: "Equipe", icon: Users },
  {
    href: "/dashboard/equipe/metricas",
    label: "Métricas",
    icon: ChartNoAxesCombined,
  },
  { href: "/dashboard/codigo", label: "Código", icon: CodeXml },
];

const cotacaoItems = [
  { href: "/dashboard/cotacao", label: "Cotação", icon: CircleDollarSign },
];

/* =======================
   HELPERS
======================= */

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
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className="gap-1 rounded-full"
        >
          {title}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
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

/* =======================
   LAYOUT
======================= */

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

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
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
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto h-16 px-4 lg:px-6 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/imgs/logo02.png"
              alt="WinLeads"
              width={44}
              height={44}
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-green-700 font-bold">WinLeads</p>
              <p className="text-[11px] text-muted-foreground">
                CRM Planos de Saúde
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                <NavigationMenuItem>
                  <DesktopDropdown
                    title="CRM"
                    items={crmItems}
                    pathname={pathname}
                  />
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <DesktopDropdown
                    title="Equipe"
                    items={equipeItems}
                    pathname={pathname}
                  />
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <DesktopDropdown
                    title="Cotação"
                    items={cotacaoItems}
                    pathname={pathname}
                  />
                </NavigationMenuItem>

                {isAdmin && (
                  <NavigationMenuItem>
                    <DesktopDropdown
                      title="Admin"
                      pathname={pathname}
                      items={[
                        {
                          href: "/dashboard/admin",
                          label: "Painel Admin",
                          icon: UserStar,
                        },
                      ]}
                    />
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>

            <Separator orientation="vertical" className="h-8 mx-2" />

            <Button asChild className="rounded-full gap-2">
              <Link href="/dashboard/novo-lead">
                <Plus className="h-4 w-4" />
                Novo Lead
              </Link>
            </Button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[70%] p-4">
                  <SheetHeader>
                    <SheetTitle>WinLeads</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <Button asChild className="w-full gap-2">
                      <Link href="/dashboard/novo-lead">
                        <Plus className="h-4 w-4" />
                        Novo Lead
                      </Link>
                    </Button>

                    <Separator />

                    {[...crmItems, ...equipeItems, ...cotacaoItems].map(
                      (item) => {
                        const Icon = item.icon;
                        return (
                          <Button
                            key={item.href}
                            asChild
                            variant="ghost"
                            className="w-full justify-start gap-2"
                          >
                            <Link href={item.href}>
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          </Button>
                        );
                      }
                    )}

                    {isAdmin && (
                      <>
                        <Separator />
                        <Button
                          asChild
                          variant="ghost"
                          className="w-full justify-start gap-2"
                        >
                          <Link href="/dashboard/admin">
                            <UserStar className="h-4 w-4" />
                            Admin
                          </Link>
                        </Button>
                      </>
                    )}

                    <Separator />

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="rounded-full h-10 px-2 gap-2"
                >
                  <div className="hidden sm:flex flex-col text-right leading-tight mr-2">
                    <span className="text-sm font-medium truncate max-w-160px">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {email}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                  </div>
                  <Avatar className="w-9 h-9 border-2 border-primary p-0.5">
                    <AvatarImage
                      src={photo}
                      alt={displayName}
                      className="rounded-full"
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="flex-1">
        <div className={fullWidth ? "px-4 lg:px-6 py-4" : "max-w-7xl mx-auto px-4 lg:px-6 py-6"}>
          {children}
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} WinLeads</span>
          <span>CRM para planos de saúde</span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
