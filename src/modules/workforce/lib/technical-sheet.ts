export type TechnicalField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'integer' | 'table' | 'file' | 'url' | 'date';
  required?: boolean;
  readOnly?: boolean;
  privacy?: string;
  unique_key?: string;
  columns?: TechnicalField[];
};

export type SheetIssue = { path: string; message: string };

/** Validate a submitted patch. Authorization and attachment ownership remain server responsibilities. */
export function validateTechnicalSheet(
  fields: TechnicalField[],
  value: unknown,
  allowedPrivacy: readonly string[] = [],
  requireComplete = false,
): SheetIssue[] {
  const issues: SheetIssue[] = [];
  const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  function inspect(schema: TechnicalField[], input: unknown, prefix: string, complete: boolean) {
    if (!object(input)) {
      issues.push({ path: prefix, message: 'Informe um objeto de campos.' });
      return;
    }
    for (const key of Object.keys(input)) {
      if (!schema.some(f => f.key === key)) issues.push({ path: prefix + key, message: 'Campo desconhecido.' });
    }
    for (const field of schema) {
      const path = prefix + field.key;
      const present = Object.prototype.hasOwnProperty.call(input, field.key);
      if (!present) {
        if (complete && field.required) issues.push({ path, message: 'Campo obrigatório.' });
        continue;
      }
      if (field.readOnly || (field.privacy && !allowedPrivacy.includes(field.privacy))) {
        issues.push({ path, message: 'Campo sem autorização para alteração.' });
        continue;
      }
      const current = input[field.key];
      if (current === null || current === '') {
        if (field.required) issues.push({ path, message: 'Campo obrigatório.' });
        continue;
      }
      if (field.type === 'table') {
        if (!Array.isArray(current) || current.length > 1000) {
          issues.push({ path, message: 'Informe uma lista com até 1.000 linhas.' });
          continue;
        }
        const keys = new Set<unknown>();
        current.forEach((row, index) => {
          inspect(field.columns ?? [], row, `${path}.${index}.`, true);
          if (field.unique_key && object(row)) {
            const raw = row[field.unique_key];
            const key = typeof raw === 'string' ? raw.trim().toLocaleLowerCase('pt-BR') : raw;
            if (key !== undefined && key !== null && key !== '') {
              if (keys.has(key)) issues.push({ path: `${path}.${index}.${field.unique_key}`, message: 'Identificador duplicado.' });
              keys.add(key);
            }
          }
        });
      } else if (field.type === 'number' || field.type === 'integer') {
        if (typeof current !== 'number' || !Number.isFinite(current) || current < 0 ||
          (field.type === 'integer' && !Number.isSafeInteger(current))) {
          issues.push({ path, message: 'Informe um número válido, sem valor negativo.' });
        }
      } else if (typeof current !== 'string' || current.length > (field.type === 'textarea' ? 10000 : 2000)) {
        issues.push({ path, message: 'Texto inválido ou acima do limite.' });
      } else if (field.required && !current.trim()) {
        issues.push({ path, message: 'Campo obrigatório.' });
      } else if (field.type === 'file' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(current)) {
        issues.push({ path, message: 'Informe o identificador do anexo privado.' });
      } else if (field.type === 'date') {
        const parsed = new Date(current + 'T00:00:00.000Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(current) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== current) {
          issues.push({ path, message: 'Data inválida.' });
        }
      } else if (field.type === 'url') {
        try {
          const url = new URL(current);
          if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('url');
        } catch {
          issues.push({ path, message: 'Informe um endereço HTTP ou HTTPS válido.' });
        }
      }
    }
  }
  inspect(fields, value, '', requireComplete);
  return issues;
}
