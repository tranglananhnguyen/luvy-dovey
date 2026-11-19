export const maxStarPhotos = 3;
export const maxPhotoEdge = 1200;
export const maxPhotoLength = 4 * Math.ceil(384 * 1024 / 3);
export const maxStarBodyBytes = 16_384 + maxStarPhotos * (maxPhotoLength + 3);

function isPhoto(value: unknown): value is string {
  if (typeof value !== 'string' || !value.length || value.length > maxPhotoLength) return false;
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < 12 || bytes.toString('base64') !== value ||
      bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;

  for (let offset = 2; offset + 4 <= bytes.length && bytes[offset] === 0xff;) {
    const marker = bytes[offset + 1];
    if (marker === 0xff) { offset++; continue; }
    if (marker === 0xda || marker === 0xd9) return false;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return false;
    if (marker === 0xc0 || marker === 0xc2) {
      if (length < 8) return false;
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      return width > 0 && height > 0 && width <= maxPhotoEdge && height <= maxPhotoEdge;
    }
    offset += 2 + length;
  }
  return false;
}

export function readPhotoInput(value: unknown): string[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) && value.length <= maxStarPhotos && value.every(isPhoto) ? value : null;
}
