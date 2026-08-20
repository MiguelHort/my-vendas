/**
 * Confere a senha do usuário logado usando a REST API do Identity Toolkit
 * (o Admin SDK não tem como validar senha — só o client SDK ou essa API fazem).
 * Usado pra confirmar ações destrutivas (ex: excluir uma conversa de WhatsApp).
 */
export async function verifyFirebasePassword(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY não configurado");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );

  if (res.ok) return true;

  const data = await res.json().catch(() => null);
  const code: string = data?.error?.message ?? "";

  if (
    code === "INVALID_PASSWORD" ||
    code === "EMAIL_NOT_FOUND" ||
    code.startsWith("INVALID_LOGIN_CREDENTIALS")
  ) {
    return false;
  }

  if (code.startsWith("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    throw new Error("Muitas tentativas com senha incorreta. Tente novamente mais tarde.");
  }

  throw new Error(`Erro ao validar senha: ${code || res.status}`);
}
