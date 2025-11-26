export function formatPhoneNumber(value: string): string {
  if (!value) return "";

  // remove tudo que não é número
  const numeric = value.replace(/\D/g, "");

  // limite de 11 dígitos
  const limited = numeric.slice(0, 11);

  // DDD + 5 + 4 (celular)
  if (limited.length >= 11) {
    return limited.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      "($1) $2-$3"
    );
  }

  // DDD + 4 + 4 (fixo)
  if (limited.length >= 10) {
    return limited.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      "($1) $2-$3"
    );
  }

  // DDD + parcial
  if (limited.length > 6) {
    return limited.replace(
      /^(\d{2})(\d{1,5})(\d{0,4})$/,
      (_, ddd, middle, end) =>
        end ? `(${ddd}) ${middle}-${end}` : `(${ddd}) ${middle}`
    );
  }

  // apenas DDD digitando
  if (limited.length > 2) {
    return limited.replace(
      /^(\d{2})(\d{1,4})$/,
      "($1) $2"
    );
  }

  // começando a digitar
  if (limited.length > 0) {
    return limited.replace(/^(\d{0,2})$/, "($1");
  }

  return limited;
}
