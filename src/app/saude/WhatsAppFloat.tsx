// app/components/WhatsAppFloat.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import WhatsAppIcon, { type WhatsAppFloatProps } from "@/components/icons/WhatsappIcon";

export default function WhatsAppFloat({
  className,
  message = "Olá! Vim pelo site e queria falar com um consultor.",
  label = "Falar no WhatsApp",
}: WhatsAppFloatProps) {
  const phone = "5547996119962"; // +55 47 99611-9962

  const link = React.useMemo(() => {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [message]);

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 pointer-events-none", className)}>
      <div className="group pointer-events-auto relative">
        <Button
          type="button"
          onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
          className={cn(
            "h-12 w-12 rounded-full p-0",
            "bg-green-600 hover:bg-green-700",
            "shadow-lg hover:shadow-xl",
            "transition-all duration-200",
            "hover:-translate-y-0.5"
          )}
          aria-label="Entrar em contato pelo WhatsApp"
        >
          <WhatsAppIcon className="text-white w-8 h-8" />
        </Button>

        <div
          className={cn(
            "pointer-events-none absolute right-16 top-1/2 -translate-y-1/2",
            "opacity-0 translate-x-2 scale-95",
            "group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100",
            "transition-all duration-200"
          )}
        >
          <div className="relative rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-white/10 text-">
            {label}
            <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-zinc-900 ring-1 ring-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}