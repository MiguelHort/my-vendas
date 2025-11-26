"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col gap-20 items-center justify-center">
      <h1 className="text-3xl font-bold">Bem-vindo à nossa plataforma!</h1>
      <Button onClick={() => router.push("/login")}>Entrar</Button>
    </div>
  );
}