// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_ADMIN_KEY;

  if (!raw) {
    throw new Error(
      "FIREBASE_ADMIN_KEY não está definido. Configure no .env.local ou nas variáveis de ambiente da Vercel."
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao fazer parse de FIREBASE_ADMIN_KEY:", e);
    throw new Error("FIREBASE_ADMIN_KEY não é um JSON válido.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const auth = admin.auth();
