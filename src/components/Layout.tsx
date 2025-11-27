"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { LayoutDashboard, Workflow, PlusCircle, MapPinned } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type LayoutProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/funil",
    label: "Funil",
    icon: Workflow,
  },
  {
    href: "/dashboard/novo-lead",
    label: "Novo Lead",
    icon: PlusCircle,
  },
  {
    href: "/dashboard/mapa-estados",
    label: "Mapa",
    icon: MapPinned,
  },
];

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

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

  const displayName = user.displayName || "Usuário";
  const email = user.email || "";
  const photo = user.photoURL || "";

  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-4">
          {/* Logo + nome */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold tracking-tight shadow-sm">
              MV
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                myvendas
              </span>
              <span className="text-[11px] text-muted-foreground">
                CRM Saúde · Corretores
              </span>
            </div>
          </Link>

          {/* Navegação central (desktop) */}
          <nav className="hidden md:flex items-center justify-center flex-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1 py-1 border border-border/60">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname?.startsWith(item.href));

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
            </div>

            <Avatar className="w-9 h-9">
              <AvatarImage src={photo} alt={displayName} />
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
          <div className="max-w-6xl mx-auto px-2 py-2 flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname?.startsWith(item.href));

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
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} myvendas</span>
          <span>Foco em corretores de planos de saúde</span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
