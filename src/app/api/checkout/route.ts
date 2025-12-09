// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.APP_URL;

    if (!priceId || !appUrl) {
      return NextResponse.json(
        { error: "Configuração Stripe inválida" },
        { status: 500 }
      );
    }

    // =========================
    // GARANTE CUSTOMER VÁLIDO
    // =========================
    let stripeCustomerId = user.stripeCustomerId ?? null;

    // Se tem um ID salvo, testa se ainda existe
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (e: any) {
        // Se o customer não existir mais na Stripe, zera e cria outro
        if (e?.code === "resource_missing" && e?.param === "customer") {
          console.warn(
            `stripeCustomerId inválido (${stripeCustomerId}) para user ${user.id}, criando novo.`
          );
          stripeCustomerId = null;
        } else {
          throw e;
        }
      }
    }

    // Se ainda não tem customer (ou estava inválido)
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: {
          app_user_id: user.id,
          firebase_uid: user.firebaseUid,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard`,
      cancel_url: `${appUrl}/planos`,
      automatic_tax: { enabled: false },
      locale: "pt-BR",

      // Faz aparecer o campo de cupom/promo code no checkout da Stripe
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Erro em /api/checkout:", err);
    return NextResponse.json(
      { error: "Falha ao iniciar checkout" },
      { status: 500 }
    );
  }
}