// src/components/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

type GuardState = "loading" | "ready";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>("loading");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState("loading");
        router.replace("/login");
        return;
      }

      try {
        const idToken = await getIdToken(firebaseUser, true);

        const res = await fetch("/api/me", {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await res.json();

        if (!data?.ok) {
          if (data?.reason === "pending-approval") {
            router.replace("/aguardando-aprovacao");
          } else {
            router.replace("/login");
          }
          return;
        }

        setState("ready");
      } catch (err) {
        console.error("Erro ao validar acesso:", err);
        setState("loading");
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router]);

  if (state === "loading") {
    return (
      <div className="w-full h-screen flex items-center justify-center text-muted-foreground">
        Validando acesso...
      </div>
    );
  }

  return <>{children}</>;
}
