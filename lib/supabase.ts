import { randomUUID } from 'node:crypto';
import { photoTypes, type decodePhoto } from './star-photos';

const bucket = 'memories';
const objects = `/storage/v1/object/${bucket}`;
type Photo = NonNullable<ReturnType<typeof decodePhoto>>;

export function hosted() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  if (process.env.VERCEL || process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Configure both Supabase environment variables.');
  }
  return false;
}

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  headers.set('apikey', key);
  if (!key.startsWith('sb_secret_')) headers.set('Authorization', 'Bearer ' + key);
  return fetch(new URL(path, process.env.SUPABASE_URL), {
    ...options, headers, cache: 'no-store', redirect: 'error'
  });
}

export async function remote<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const response = await request('/rest/v1/' + path, { ...options, headers });
  if (!response.ok) throw new Error('Database request failed with status ' + response.status);
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export async function requirePrivateMemories() {
  const response = await request('/storage/v1/bucket/' + bucket);
  if (!response.ok || (await response.json()).public !== false) {
    throw new Error('The memories bucket must exist and be private.');
  }
}

export function newMemoryPath(starId: string, photo: Photo) {
  return `${starId}/${randomUUID()}.${photo.extension}`;
}

export function memoryType(starId: string, path: string) {
  const prefix = starId + '/';
  if (!path.startsWith(prefix)) return null;
  const match = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(jpg|png|webp)$/.exec(path.slice(prefix.length));
  return match ? photoTypes[match[1] as keyof typeof photoTypes] : null;
}

export async function uploadMemory(path: string, photo: Photo) {
  const response = await request(objects + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': photoTypes[photo.extension], 'x-upsert': 'false' },
    body: new Uint8Array(photo.bytes)
  });
  if (!response.ok) throw new Error('Memory upload failed with status ' + response.status);
  await response.body?.cancel();
}

export async function downloadMemory(path: string) {
  const response = await request(`/storage/v1/object/authenticated/${bucket}/${path}`);
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('Memory download failed with status ' + response.status);
  }
  return response.body;
}

export async function removeMemories(paths: string[]) {
  if (!paths.length) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await request(objects, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths })
      });
      await response.body?.cancel();
      if (response.ok) return;
    } catch { /* Retry a transient connection failure. */ }
  }
  console.error('Memory cleanup needs attention for star', paths[0].split('/')[0]);
}
