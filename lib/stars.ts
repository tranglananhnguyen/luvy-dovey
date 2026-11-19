import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { planets } from './star-options';
import { readPhotoInput } from './star-photos';

const summaryFields = 'id,title,author,color,tags,x,y';
const world = { x: 2400, y: 1600 };
const colors = new Set<string>(['white', 'gold', 'pink', 'lavender', 'blue', ...planets.map((planet) => planet.color)]);
type Star = {
  id: string; title: string; note: string; author: string; color: string; tags: string;
  visibility: 'public' | 'private'; x: number; y: number; created: string;
  owner_hash: string | null; access_hash: string | null;
  photos?: string[] | string;
};

const localStarTable = `CREATE TABLE IF NOT EXISTS stars (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, note TEXT NOT NULL, author TEXT NOT NULL,
  color TEXT NOT NULL, tags TEXT NOT NULL, visibility TEXT NOT NULL,
  x REAL NOT NULL, y REAL NOT NULL, created TEXT NOT NULL, owner_hash TEXT, access_hash TEXT,
  photos TEXT NOT NULL DEFAULT '[]'
);`;

let local: Promise<DatabaseSync> | undefined;
function database() {
  return local ??= import('node:sqlite').then(({ DatabaseSync }) => {
    const directory = process.env.DATA_DIR || 'data';
    mkdirSync(directory, { recursive: true });
    const db = new DatabaseSync(directory + '/sky.sqlite');
    db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; ${localStarTable}`);
    const columns = db.prepare('PRAGMA table_info(stars)').all();
    if (columns.some((column) => column.name === 'kind')) {
      db.exec(`BEGIN IMMEDIATE;
        ALTER TABLE stars RENAME TO legacy_stars;
        ${localStarTable}
        INSERT INTO stars (id,title,note,author,color,tags,visibility,x,y,created,owner_hash,access_hash)
          SELECT id,title,note,author,CASE kind WHEN 'wish' THEN 'pink' ELSE 'blue' END,
          '', 'public', x * 24, y * 16, created, NULL, NULL FROM legacy_stars;
        DROP TABLE legacy_stars;
        COMMIT;`);
    } else if (!columns.some((column) => column.name === 'photos')) {
      db.exec("ALTER TABLE stars ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'");
    }
    return db;
  });
}

function hosted() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  if (process.env.VERCEL || process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Configure both Supabase environment variables.');
  }
  return false;
}

async function remote<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(new URL('/rest/v1/' + path, process.env.SUPABASE_URL), {
    ...options, cache: 'no-store', headers: {
      apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + key }),
      'Content-Type': 'application/json', ...options.headers
    }
  });
  if (!response.ok) throw new Error('Database request failed with status ' + response.status);
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export async function listStars(term: string) {
  if (hosted()) {
    if (term) return remote('rpc/find_public_stars', { method: 'POST', body: JSON.stringify({ term }) });
    return remote('stars?visibility=eq.public&order=created.desc&limit=250&select=' + summaryFields);
  }
  const db = await database();
  return term ? db.prepare(`SELECT ${summaryFields} FROM stars WHERE visibility = 'public' AND
    (instr(lower(title), lower(?)) OR instr(lower(note), lower(?)) OR instr(lower(tags), lower(?)) OR
    instr(lower(author), lower(?))) ORDER BY created DESC LIMIT 60`).all(term, term, term, term)
    : db.prepare(`SELECT ${summaryFields} FROM stars WHERE visibility = 'public' ORDER BY created DESC LIMIT 250`).all();
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');

function matches(value: string | null, stored: string | null) {
  return Boolean(value && stored && /^[\w-]{43}$/.test(value) &&
    timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(stored, 'hex')));
}

function textField(input: unknown, max: number, required = false) {
  return typeof input === 'string' && input.length <= max && (!required || Boolean(input.trim()));
}

export async function createStar(input: Record<string, unknown>) {
  const { title, note, author, visibility, x, y } = input;
  const planet = planets.find((option) => option.name === input.planet);
  const tags = planet?.name ?? input.tags;
  const color = planet?.color ?? input.color;
  const photos = readPhotoInput(input.photos);
  if (!photos || (input.planet !== undefined && !planet) ||
      !textField(title, 80, true) || !textField(note, 2000, true) || !textField(author, 40) ||
      !textField(tags, 160) || typeof color !== 'string' || !colors.has(color) ||
      (visibility !== 'public' && visibility !== 'private') ||
      typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > world.x ||
      typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > world.y || input.website !== '') return null;

  const owner = token();
  const access = visibility === 'private' ? token() : null;
  const star: Star = {
    id: randomUUID(), title: (title as string).trim(), note: (note as string).trim(),
    author: (author as string).trim(), tags: (tags as string).trim(), color, visibility,
    x, y, created: new Date().toISOString(), owner_hash: hash(owner), access_hash: access ? hash(access) : null
  };
  if (hosted()) {
    const record = photos.length ? { ...star, photos } : star;
    await remote('stars', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(record) });
  } else {
    const db = await database();
    db.prepare(`INSERT INTO stars (id,title,note,author,tags,color,visibility,x,y,created,owner_hash,access_hash,photos)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(star.id, star.title, star.note, star.author, star.tags,
      star.color, star.visibility, star.x, star.y, star.created, star.owner_hash, star.access_hash, JSON.stringify(photos));
  }
  return { id: star.id, title: star.title, author: star.author, color, tags: star.tags, visibility, x, y, created: star.created, owner, access };
}

async function load(id: string): Promise<Star | undefined> {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) return;
  if (hosted()) return (await remote<Star[]>('stars?id=eq.' + id + '&limit=1'))[0];
  return (await database()).prepare('SELECT * FROM stars WHERE id = ?').get(id) as Star | undefined;
}

export async function readStar(id: string, owner: string | null, access: string | null) {
  const star = await load(id);
  if (!star) return null;
  const canDelete = matches(owner, star.owner_hash);
  if (star.visibility === 'private' && !canDelete && !matches(access, star.access_hash)) return null;
  const { owner_hash: _owner, access_hash: _access, photos, ...message } = star;
  return { ...message, photos: typeof photos === 'string' ? JSON.parse(photos) : photos ?? [], canDelete };
}

export async function deleteStar(id: string, owner: string | null) {
  const star = await load(id);
  if (!star || !matches(owner, star.owner_hash)) return false;
  if (hosted()) await remote('stars?id=eq.' + id + '&owner_hash=eq.' + star.owner_hash, { method: 'DELETE' });
  else (await database()).prepare('DELETE FROM stars WHERE id = ? AND owner_hash = ?').run(id, star.owner_hash);
  return true;
}

export function response(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function unavailable(error: unknown) {
  console.error(error);
  return response({ error: 'The sky is temporarily unavailable.' }, 503);
}
