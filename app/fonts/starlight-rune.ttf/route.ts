import { readStarlightRune } from '../../../lib/starlight-rune';

export const dynamic = 'force-static';

export function GET() {
  const font = readStarlightRune();
  if (!font) return new Response(null, { status: 404 });
  return new Response(font, {
    headers: {
      'Content-Type': 'font/ttf',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
