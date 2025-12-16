"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  LayoutDashboard,
  Workflow,
  PlusCircle,
  MapPinned,
  CircleDollarSign,
  UserStar,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type LayoutProps = {
  children: ReactNode;
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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/funil", label: "Funil", icon: Workflow },
  { href: "/dashboard/novo-lead", label: "Novo Lead", icon: PlusCircle },
  { href: "/dashboard/mapa-estados", label: "Mapa", icon: MapPinned },
  { href: "/dashboard/admin", label: "Admin", icon: UserStar },
];

const navItemsCotacao = [
  { href: "/dashboard/cotacao", label: "Cotação", icon: CircleDollarSign },
];

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null | undefined>(undefined); // Firebase
  const [meUser, setMeUser] = useState<MeUser | null>(null); // Prisma (/api/me)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setMeUser(null);
        setIsAdmin(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setIsAdmin(false);
          return;
        }

        const data = await res.json();

        if (data?.user) {
          setMeUser(data.user);
          setIsAdmin(!!data.user.admin);
        } else {
          setMeUser(null);
          setIsAdmin(false);
        }
      } catch {
        setMeUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.href === "/dashboard/admin") return isAdmin;
      return true;
    });
  }, [isAdmin]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  const displayName = user.displayName || meUser?.name || "Usuário";
  const email = user.email || meUser?.email || "";
  const photo = user.photoURL || "";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo + nome */}
          <Link href="/dashboard" className="flex items-center gap-1">
            <Image
              src="/imgs/logo02.png"
              alt="WinLeads"
              width={50}
              height={50}
              unoptimized
            />
            <div className="flex flex-col">
              <p className="text-green-700 text-xl">
                <span className="font-bold">Win</span>Leads
              </p>
            </div>
          </Link>

          {/* Navegação central (desktop) */}
          <nav className="hidden md:flex items-center justify-center flex-1 gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1 py-1 border border-border/60">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`gap-2 px-3 rounded-full text-xs font-medium ${
                      isActive ? "shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Link href={item.href}>
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>

            <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1 py-1 border border-border/60">
              {navItemsCotacao.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname?.startsWith(item.href);

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`gap-2 px-3 rounded-full text-xs font-medium ${
                      isActive ? "shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Link href={item.href}>
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </nav>

          {/* Perfil do usuário + sair */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
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
              <AvatarImage src={photo} alt={displayName} className="rounded-full" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs font-medium px-2 hidden sm:inline-flex"
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Navegação mobile */}
        <nav className="md:hidden border-t border-border/60 bg-background">
          <div className="max-w-7xl mx-auto px-2 py-2 flex items-center gap-1 overflow-x-auto">
            {[...filteredNavItems, ...navItemsCotacao].map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`gap-1 px-3 rounded-full text-xs ${
                    isActive ? "shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* RODAPÉ */}
      <footer className="border-t mt-4">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} WinLeads</span>
          <span>Foco em corretores de planos de saúde</span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
