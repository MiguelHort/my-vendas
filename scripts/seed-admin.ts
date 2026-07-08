import "dotenv/config";
import * as admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = "miguel.d.hort@gmail.com";
const ADMIN_PASSWORD = "teste123";

async function main() {
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("FIREBASE_ADMIN_KEY não está definido no .env");
  const serviceAccount = JSON.parse(raw);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
  const firebaseAuth = admin.auth();

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  let firebaseUser;
  try {
    firebaseUser = await firebaseAuth.getUserByEmail(ADMIN_EMAIL);
    await firebaseAuth.updateUser(firebaseUser.uid, { password: ADMIN_PASSWORD });
    console.log(`Firebase: usuário existente atualizado (${firebaseUser.uid})`);
  } catch (err: any) {
    if (err?.code === "auth/user-not-found") {
      firebaseUser = await firebaseAuth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: "Miguel Hort",
      });
      console.log(`Firebase: usuário criado (${firebaseUser.uid})`);
    } else {
      throw err;
    }
  }

  const user = await prisma.user.upsert({
    where: { firebaseUid: firebaseUser.uid },
    update: { role: "ADMIN", approved: true, email: ADMIN_EMAIL },
    create: {
      firebaseUid: firebaseUser.uid,
      email: ADMIN_EMAIL,
      name: "Miguel Hort",
      role: "ADMIN",
      approved: true,
    },
  });

  console.log("Postgres: usuário admin pronto ->", {
    id: user.id,
    email: user.email,
    role: user.role,
    approved: user.approved,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
