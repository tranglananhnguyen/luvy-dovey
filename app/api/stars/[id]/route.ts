import { deleteStar, readStar, response, unavailable } from '../../../../lib/stars';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const star = await readStar(id, request.headers.get('x-star-owner'), request.headers.get('x-star-access'));
    return star ? response(star) : response({ error: 'Star not found.' }, 404);
  } catch (error) { return unavailable(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await deleteStar(id, request.headers.get('x-star-owner'))
      ? response({ deleted: true }) : response({ error: 'Star not found.' }, 404);
  } catch (error) { return unavailable(error); }
}
