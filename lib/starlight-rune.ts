export const deployedStarlightRune = '/fonts/starlight-rune.ttf';

export function readStarlightRune() {
  const encoded = process.env.STARLIGHT_RUNE_BASE64?.trim();
  if (!encoded || encoded.length > 60_000) return null;
  const font = Buffer.from(encoded, 'base64');
  if (font.length < 12 || font.toString('base64') !== encoded || font.readUInt32BE(0) !== 0x00010000) {
    return null;
  }
  return new Uint8Array(font);
}
