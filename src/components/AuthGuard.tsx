// src/components/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const token = await getIdToken(firebaseUser, true);

        const res = await fetch("/api/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        // Backend já valida:
        // - isActive (assinatura)
        // - trial de 7 dias baseado no createdAt
        if (data?.ok) {
          setLoading(false);
          return;
        }

        // Se não pode usar o app:
        // - Se trial expirou / sem assinatura -> manda pra /planos
        if (pathname !== "/planos") {
          router.replace("/planos");
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro ao validar acesso:", err);
        setLoading(false);
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-muted-foreground">
        Validando acesso...
      </div>
    );
  }

  return <>{children}</>;
}
