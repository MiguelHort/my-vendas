import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";
import { zavuProvider } from "@/lib/sdr/providers/zavu";

export const runtime = "nodejs";

function authParams(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  return {
    firebaseUid: p.get("firebaseUid"),
    email: p.get("email"),
    name: p.get("name") ?? undefined,
  };
}

/** GET — retorna a instância Zavu do corretor e verifica o status via API */
export async function GET(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });

  const instance = await prisma.whatsappInstance.findUnique({
    where: { userId: user.id },
  });

  if (!instance) {
    return NextResponse.json({ instance: null });
  }

  // Verifica status real na Zavu API
  let liveStatus = instance.status;
  try {
    const apiStatus = await zavuProvider.getStatus(instance.senderId);
    liveStatus = apiStatus === "active" ? "connected" : "disconnected";
    if (liveStatus !== instance.status) {
      await prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { status: liveStatus },
      });
    }
  } catch {
    // API indisponível — usa cache
  }

  return NextResponse.json({
    instance: {
      id: instance.id,
      senderId: instance.senderId,
      phoneNumber: instance.phoneNumber,
      status: liveStatus,
    },
  });
}

/**
 * POST — registra o Sender Zavu do corretor.
 * Body: { senderId: string }
 * O senderId é obtido pelo corretor no painel da Zavu.
 */
export async function POST(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const senderId = (body?.senderId as string | undefined)?.trim();

  if (!senderId) {
    return NextResponse.json({ error: "senderId é obrigatório" }, { status: 400 });
  }

  const requester = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });
  if (requester.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  // Valida que o senderId existe e está acessível na Zavu
  const apiStatus = await zavuProvider.getStatus(senderId);
  if (apiStatus !== "active") {
    return NextResponse.json(
      { error: "Sender ID não encontrado ou inacessível. Verifique o ID no painel da Zavu." },
      { status: 422 },
    );
  }

  const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });

  // Tenta obter o número de telefone do sender para exibição
  let phoneNumber: string | null = null;
  try {
    const res = await fetch(`https://api.zavu.dev/v1/senders/${senderId}`, {
      headers: {
        Authorization: `Bearer ${process.env.ZAVU_API_KEY ?? ""}`,
      },
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      phoneNumber =
        (data.phoneNumber as string) ??
        (data.phone_number as string) ??
        (data.number as string) ??
        null;
    }
  } catch {
    // não crítico
  }

  const instance = await prisma.whatsappInstance.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      senderId,
      status: "connected",
      phoneNumber,
      connectedAt: new Date(),
    },
    update: {
      senderId,
      status: "connected",
      phoneNumber,
      connectedAt: new Date(),
    },
  });

  return NextResponse.json({ instance });
}

/** DELETE — remove a configuração Zavu do corretor */
export async function DELETE(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  await prisma.whatsappInstance.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
