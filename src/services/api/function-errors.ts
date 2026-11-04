/** FunctionsHttpError carries the API response in context, rather than data. */
export async function mensagemErroFuncao(error: unknown, fallback: string): Promise<string> {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : null;
  if (!(context instanceof Response)) return fallback;
  try {
    const body = await context.clone().json();
    return typeof body?.error === 'string' && body.error.trim() ? body.error : fallback;
  } catch {
    return fallback;
  }
}
