// lib/getUserAccess.ts
import { prisma } from "@/lib/prisma";
import { addDays, isAfter, differenceInCalendarDays } from "date-fns";

export async function getUserAccessByCreatedAt(firebaseUid: string) {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const now = new Date();
  const trialEndsAt = addDays(user.createdAt, 7);

  const hasActiveSubscription = user.subscriptionStatus === "active";

  const trialActive = !hasActiveSubscription && isAfter(trialEndsAt, now);

  const trialDaysLeft = Math.max(
    0,
    differenceInCalendarDays(trialEndsAt, now)
  );

  const canUseApp = hasActiveSubscription || trialActive;

  return {
    canUseApp,
    hasActiveSubscription,
    trialActive,
    trialDaysLeft,
    trialEndsAt,
  };
}
