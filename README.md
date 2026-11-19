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

1. In Supabase, open **SQL Editor** and run [supabase/schema.sql](supabase/schema.sql) if you have not already. In **Storage**, select the existing `memories` bucket and confirm it is **private**. In its settings, allow JPEG, PNG and WebP (`image/jpeg`, `image/png`, `image/webp`) and set the per-file limit to 5 MB.
2. Run [supabase/memories.sql](supabase/memories.sql) in **SQL Editor**. This blocks direct access to objects in the bucket for anonymous and authenticated browser roles, including projects with broader existing policies. The app server uses the secret key to access the bucket.
3. Import this GitHub repository into Vercel as a Next.js project. Add these variables in **Settings → Environment Variables**. For development with the hosted database, copy `.env.example` to `.env.local` and fill in the same variables there.

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | Project URL from the Supabase project's **Connect** dialog |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-side secret key from **Settings → API Keys**. The legacy `service_role` key also works. |

   The browser calls the app's API, so it needs no Supabase publishable key. Keep your secret in Vercel or `.env.local`.

4. Deploy and share the Vercel production URL. Visitors on different devices use the same Supabase database. Visible tabs automatically fetch new public stars every seven seconds.

New hosted wishes save their photos as files in `memories` and store only object paths in the row. Visitors can choose up to three JPEG, PNG or WebP files up to 5 MB each. The form resizes and compresses them before sending so the request fits Vercel's Function limit. Older Supabase rows with embedded photos still open. Local SQLite wishes and photos stay on the Mac until you choose to migrate them.

For a future migration, back up the source first and make a dry-run list of the wishes you want to move. Upload validated copies of their photos to the private bucket, verify the copies, then replace their embedded values with the uploaded references. Keep each star's visibility and token hashes. Leave the originals in the backup and test both public and private access before moving more wishes.

The compact Spotify player opens on page load and tries to autoplay. Visitors can use Spotify's Play button if autoplay is blocked. Spotify may set cookies under the [Spotify privacy policy](https://www.spotify.com/legal/privacy-policy/). To use a looping audio file with icon-only controls instead, set `SITE_MUSIC_URL` to a direct audio URL you have permission to use. For a file named `public/soundtrack.mp3`, use `/soundtrack.mp3`. Set this in `.env.local` for local development or in the hosting project's settings before building.

## Privacy and ownership

Stars made in the form are public. Anyone can find them and see their attached photos. Existing private stars can be read only with their access link or their creator's ownership token. The link grants reading access to anyone who has it. The creator's browser saves a separate token for deletion. Clearing site storage or switching browsers means losing that token. A private reading link does not permit deletion.

The server checks both kinds of token and stores only their hashes. It checks the same permission for every photo request. Supabase table and search access is limited to the server role. Posting uses input validation, a honeypot, and a basic per-server-instance rate limit. The sky shows up to 250 recent public stars and searches all public stars, returning up to 60 matches.

## Check your deployment

1. Open the production URL and make a test wish with three disposable photos. Place the star and open it. Reload, search for the wish, and check that the message and photos still open.
2. In Supabase, check for the test wish in **Table Editor → stars** and for three files under its star ID in **Storage → memories**. The row's `photos` field should contain paths beginning with that star ID.
3. Open a private browser window with the production URL and search for the public test wish. The Make a Wish form creates public stars. To test private stars, use an existing private link or create a test private star through `POST /api/stars` with `visibility: "private"`. The private link should show its message and photos. A fresh browser without the link should get a 404 from the star and photo endpoints. Access links grant read access. Deletion requires the separate owner token.
4. Try a non-image file and a photo over 5 MB. The form should show an error before placement. If saving a wish fails, the placement controls let you retry with your draft intact.

## Project files

- `app/page.tsx` and `app/sky.css` define the interface.
- `public/sky.js` handles Canvas drawing, movement, placement, and animations.
- `app/api/stars/` exposes the star routes.
- `lib/stars.ts` handles validation, database access, and authorization.
- `lib/supabase.ts` handles server-side Supabase requests and private photo storage.
