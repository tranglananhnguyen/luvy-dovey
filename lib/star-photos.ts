export const maxStarPhotos = 3;
export const maxSourcePhotoBytes = 5 * 1024 * 1024;
export const maxPhotoEdge = 1200;
const maxPhotoBytes = 384 * 1024;
export const maxPhotoLength = 4 * Math.ceil(maxPhotoBytes / 3);
export const maxStarBodyBytes = 16_384 + maxStarPhotos * (maxPhotoLength + 3);

export const photoTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
type PhotoExtension = keyof typeof photoTypes;
type Photo = { encoded: string; bytes: Buffer; extension: PhotoExtension };

function validDimensions(width: number, height: number) {
  return width > 0 && height > 0 && width <= maxPhotoEdge && height <= maxPhotoEdge;
}

function isJpeg(bytes: Buffer) {
  if (bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;

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
      return validDimensions(width, height);
    }
    offset += 2 + length;
  }
  return false;
}

const pngSignature = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const pngEnd = Buffer.from('0000000049454e44ae426082', 'hex');

function isPng(bytes: Buffer) {
  return bytes.length >= 45 && bytes.subarray(0, 16).equals(pngSignature) &&
    bytes.subarray(-12).equals(pngEnd) && validDimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
}

function isWebp(bytes: Buffer) {
  if (bytes.length < 25 || bytes.toString('ascii', 0, 4) !== 'RIFF' ||
      bytes.readUInt32LE(4) !== bytes.length - 8 || bytes.toString('ascii', 8, 12) !== 'WEBP') return false;
  const chunkSize = bytes.readUInt32LE(16);
  if (chunkSize + 20 + (chunkSize % 2) > bytes.length) return false;
  switch (bytes.toString('ascii', 12, 16)) {
    case 'VP8 ':
      return chunkSize >= 10 && bytes.readUIntBE(23, 3) === 0x9d012a &&
        validDimensions(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
    case 'VP8L': {
      if (chunkSize < 5 || bytes[20] !== 0x2f) return false;
      const dimensions = bytes.readUInt32LE(21);
      return validDimensions(1 + (dimensions & 0x3fff), 1 + ((dimensions >>> 14) & 0x3fff));
    }
    case 'VP8X':
      return chunkSize === 10 && validDimensions(1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3));
    default: return false;
  }
}

export function decodePhoto(value: unknown): Photo | null {
  if (typeof value !== 'string' || !value.length || value.length > maxPhotoLength) return null;
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < 12 || bytes.length > maxPhotoBytes || bytes.toString('base64') !== value) return null;
  const extension = isJpeg(bytes) ? 'jpg' : isPng(bytes) ? 'png' : isWebp(bytes) ? 'webp' : null;
  return extension ? { encoded: value, bytes, extension } : null;
}

export function readPhotoInput(value: unknown): Photo[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxStarPhotos) return null;
  const photos = [];
  for (const item of value) {
    const photo = decodePhoto(item);
    if (!photo) return null;
    photos.push(photo);
  }
  return photos;
}
