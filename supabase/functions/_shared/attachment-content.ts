const MAX_BYTES = 10 * 1024 * 1024;
export const attachmentMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

/** Checks size and container signatures, not malware or document semantics. */
export function attachmentContentError(bytes: Uint8Array, mime: string, expectedSize: number): string | null {
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 1 || expectedSize > MAX_BYTES || bytes.length !== expectedSize) {
    return 'O tamanho real do arquivo não corresponde ao envio autorizado.';
  }
  const at = (offset: number, values: number[]) => values.every((value, index) => bytes[offset + index] === value);
  const ascii = (offset: number, text: string) => at(offset, Array.from(text, char => char.charCodeAt(0)));
  if (mime === 'image/png') {
    if (bytes.length < 45 || !at(0, [137,80,78,71,13,10,26,10]) || !at(8,[0,0,0,13]) || !ascii(12,'IHDR') ||
      !at(bytes.length-12,[0,0,0,0,73,69,78,68,174,66,96,130])) return 'O arquivo não possui a estrutura esperada de uma imagem PNG.';
  } else if (mime === 'image/jpeg') {
    if (bytes.length < 20 || !at(0,[255,216,255]) || !at(bytes.length-2,[255,217])) return 'O arquivo não possui a estrutura esperada de uma imagem JPEG.';
  } else if (mime === 'image/webp') {
    if (bytes.length < 20 || !ascii(0,'RIFF') || !ascii(8,'WEBP') ||
      !['VP8 ','VP8L','VP8X'].some(type => ascii(12,type))) return 'O arquivo não possui a estrutura esperada de uma imagem WebP.';
    const declared = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4,true);
    if (declared + 8 !== bytes.length) return 'O arquivo WebP está truncado ou contém dados adicionais.';
  } else if (mime === 'application/pdf') {
    const header = new TextDecoder().decode(bytes.subarray(0,9));
    const tail = new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-1024)));
    if (!/^%PDF-(1\.[0-7]|2\.0)[\r\n ]/.test(header) || !/%%EOF[\r\n\t ]*$/.test(tail)) return 'O arquivo não possui a estrutura esperada de um PDF.';
  } else {
    return 'Tipo de arquivo não permitido.';
  }
  return null;
}

export async function attachmentDigest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
}
