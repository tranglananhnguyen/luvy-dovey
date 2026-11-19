import { createStar, listStars, PhotoUploadError, response, unavailable } from '../../../lib/stars';
import { maxStarBodyBytes } from '../../../lib/star-photos';

export const runtime = 'nodejs';
const attempts = new Map<string, { count: number; expires: number }>();

export async function GET(request: Request) {
  try {
    const term = new URL(request.url).searchParams.get('q')?.trim().slice(0, 160) || '';
    return response(await listStars(term));
  } catch (error) { return unavailable(error); }
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json') || !request.body) {
    return response({ error: 'Send a JSON star.' }, 415);
  }
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const window = attempts.get(ip) || { count: 0, expires: now + 60_000 };
  if (++window.count > 8) return response({ error: 'Give the sky a minute before sending another star.' }, 429);
  attempts.set(ip, window);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  let input;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxStarBodyBytes) {
        await reader.cancel();
        return response({ error: 'This star is too large.' }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    input = JSON.parse(body + decoder.decode());
  } catch { return response({ error: 'The star could not be read.' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return response({ error: 'Invalid star.' }, 400);
  try {
    const star = await createStar(input);
    return star ? response(star, 201) : response({ error: 'Check your title, message, photos, and star placement.' }, 400);
  } catch (error) {
    if (error instanceof PhotoUploadError) {
      console.error(error);
      return response({ error: 'Your photos couldn’t be saved. Try placing your star again.' }, 503);
    }
    return unavailable(error);
  }
}
