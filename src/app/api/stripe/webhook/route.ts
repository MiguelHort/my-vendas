// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Atualiza usuário baseado na subscription da Stripe
async function upsertFromSubscription(sub: Stripe.Subscription) {
  const stripeCustomerId = sub.customer as string;
  const status = sub.status; // 'active', 'canceled', 'past_due', etc

  await prisma.user.updateMany({
    where: { stripeCustomerId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: status,
      isActive: status === "active" || status === "trialing",
    },
  });
}

export async function POST(req: Request) {
  const h = await headers();
  const sig = h.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Erro ao validar webhook Stripe:", err.message);
    return new NextResponse(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await upsertFromSubscription(sub);
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(sub);
    }
  } catch (e) {
    console.error("Webhook processing error:", e);
    // deixa 200 pra Stripe não ficar re-tentando pra sempre
  }

  return NextResponse.json({ received: true });
}
