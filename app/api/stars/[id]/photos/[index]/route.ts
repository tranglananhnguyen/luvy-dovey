import { readStarPhoto, response, unavailable } from '../../../../../../lib/stars';
import { maxStarPhotos } from '../../../../../../lib/star-photos';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string; index: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id, index } = await context.params;
    if (!/^\d$/.test(index) || Number(index) >= maxStarPhotos) return response({ error: 'Photo not found.' }, 404);
    const photo = await readStarPhoto(id, Number(index), request.headers.get('x-star-owner'), request.headers.get('x-star-access'));
    if (!photo) return response({ error: 'Photo not found.' }, 404);
    return new Response(photo.body, { headers: {
      'Content-Type': photo.type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin'
    } });
  } catch (error) { return unavailable(error); }
}
