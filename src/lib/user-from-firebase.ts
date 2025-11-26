import { prisma } from "./prisma";

export async function getOrCreateUserByFirebaseUid(params: {
  firebaseUid: string;
  email: string;
  name?: string | null;
}) {
  const { firebaseUid, email, name } = params;

  const existing = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  if (existing) return existing;

  // aqui criamos com todos os campos obrigatórios
  const user = await prisma.user.create({
    data: {
      firebaseUid,
      email,
      name,
    },
  });

  return user;
}
