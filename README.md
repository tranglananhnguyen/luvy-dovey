# Luvy Dovey

A shared night sky for notes, wishes, and memories. Drag or use the arrow keys to explore. Choose **Make a Wish ✨**, pick a planet to set your star's colour, and optionally attach up to three photos before placing your star. Search public stars by title, name, planet, or words in the message.

## Run on your Mac

Use Node.js 22.13 or later.

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a local production check, run `npm run build` followed by `npm start`. Local development can run without Supabase and stores stars in SQLite. The project upgrades the earlier local SQLite schema on first use. Earlier stars remain public and have no ownership token because the original version did not collect one.

The repository uses Cormorant Infant by default. If you have permission to use a Starlight Rune font file in your environment, you can place it at `public/fonts/starlight-rune-personal-use.ttf` before starting or building the app. That file is excluded from Git.

## Put the shared sky online

1. Create a Supabase project. Open its SQL Editor and run [supabase/schema.sql](supabase/schema.sql).
2. Put this project in GitHub and import that repository into Vercel as a Next.js project.
3. In Vercel's project settings, set `SUPABASE_URL` to the project URL and `SUPABASE_SERVICE_ROLE_KEY` to a Supabase secret key or legacy service role key. Keep both server-side. To use the same database in development, copy `.env.example` to `.env.local` and fill it out.
4. Deploy and share the Vercel URL. Visitors on different devices use the same Supabase database. Visible tabs automatically fetch new public stars every seven seconds.

The hosted site starts with a fresh database. Local SQLite stars are separate and are not uploaded automatically.
For an existing Supabase project, rerun [supabase/schema.sql](supabase/schema.sql) to add photo support before deploying the updated site.

The compact Spotify player opens on page load and tries to autoplay. Visitors can use Spotify's Play button if autoplay is blocked. Spotify may set cookies under the [Spotify privacy policy](https://www.spotify.com/legal/privacy-policy/). To use a looping audio file with icon-only controls instead, set `SITE_MUSIC_URL` to a direct audio URL you have permission to use. For a file named `public/soundtrack.mp3`, use `/soundtrack.mp3`. Set this in `.env.local` for local development or in the hosting project's settings before building.

## Privacy and ownership

Stars made in the form are public. Anyone can find them and see their attached photos. Existing private stars can be read only with their access link or their creator's ownership token. The link grants reading access to anyone who has it. The creator's browser saves a separate token for deletion. Clearing site storage or switching browsers means losing that token. A private reading link does not permit deletion.

The server checks both kinds of token and stores only their hashes. Supabase table and search access is limited to the server role. Posting uses input validation, a honeypot, and a basic per-server-instance rate limit. The sky shows up to 250 recent public stars and searches all public stars, returning up to 60 matches.

## Project files

- `app/page.tsx` and `app/sky.css` define the interface.
- `public/sky.js` handles Canvas drawing, movement, placement, and animations.
- `app/api/stars/` exposes the star routes.
- `lib/stars.ts` handles validation, database access, and authorization.
