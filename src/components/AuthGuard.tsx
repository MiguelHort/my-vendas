// src/components/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ConsentModal from "@/components/ConsentModal";

type GuardState = "loading" | "consent-required" | "ready";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>("loading");
  const [token, setToken] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState("loading");
        router.replace("/login");
        return;
      }

      try {
        const idToken = await getIdToken(firebaseUser, true);
        setToken(idToken);

        const res = await fetch("/api/me", {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await res.json();

        if (!data?.ok) {
          if (pathname !== "/planos") router.replace("/planos");
          else setState("ready");
          return;
        }

        // Verifica consentimento LGPD
        const consentRes = await fetch("/api/lgpd/consent", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const consentData = await consentRes.json();

        if (!consentData?.hasConsented) {
          setState("consent-required");
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
  }, [router, pathname]);

  if (state === "loading") {
    return (
      <div className="w-full h-screen flex items-center justify-center text-muted-foreground">
        Validando acesso...
      </div>
    );
  }

  if (state === "consent-required") {
    return (
      <>
        <div className="w-full h-screen flex items-center justify-center text-muted-foreground" />
        <ConsentModal token={token} onAccepted={() => setState("ready")} />
      </>
    );
  }

  return <>{children}</>;
}
