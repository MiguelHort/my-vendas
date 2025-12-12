"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  LayoutDashboard,
  Workflow,
  PlusCircle,
  MapPinned,
  UserStar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Image from "next/image";

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
  {
    href: "/dashboard/admin",
    label: "Admin",
    icon: UserStar,
  },
];

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined); // Firebase
  const [meUser, setMeUser] = useState<MeUser | null>(null);            // Prisma (/api/me)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch("/api/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            console.error("Erro ao chamar /api/me:", res.status);
            setIsAdmin(false);
            return;
          }

          const data = await res.json();
          console.log("Resposta /api/me:", data);

          if (data.user) {
            setMeUser(data.user);
            console.log("User admin flag:", data.user.admin);
            setIsAdmin(!!data.user.admin);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Erro ao buscar /api/me:", err);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setMeUser(null);
        setIsAdmin(null);
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

  // 🔐 Só mostra o item Admin se isAdmin === true
  const filteredNavItems = navItems.filter((item) => {
    if (item.href === "/dashboard/admin") {
      return !!isAdmin;
    }
    return true;
  });

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
          <nav className="hidden md:flex items-center justify-center flex-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1 py-1 border border-border/60">
              {filteredNavItems.map((item) => {
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
              {meUser?.admin && (
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
            {filteredNavItems.map((item) => {
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
          <span>© {new Date().getFullYear()} WinLeads</span>
          <span>Foco em corretores de planos de saúde</span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;