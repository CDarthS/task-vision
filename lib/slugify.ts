/**
 * Converte uma string em slug URL-friendly.
 * Ex: "Meu Projeto Legal!" → "meu-projeto-legal"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD") // decompor acentos (é → e + ´)
    .replace(/[\u0300-\u036f]/g, "") // remover diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remover caracteres especiais
    .replace(/[\s_]+/g, "-") // espaços e underscores → hífens
    .replace(/-+/g, "-") // múltiplos hífens → um
    .replace(/^-|-$/g, ""); // remover hífens do início/fim
}

/**
 * Gera um slug único adicionando sufixo aleatório se necessário.
 */
export function slugifyWithSuffix(text: string): string {
  const base = slugify(text);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : suffix;
}
