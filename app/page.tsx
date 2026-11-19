import Script from 'next/script';
import { planets } from '../lib/star-options';
import { maxPhotoEdge, maxPhotoLength, maxSourcePhotoBytes, maxStarPhotos } from '../lib/star-photos';

function BotanicalFrame() {
  return <div className="wish-vines" aria-hidden="true"><span /><span /></div>;
}

function MusicToggle({ id, spotifyPanel }: { id?: string; spotifyPanel?: string }) {
  return (
    <button type="button" className="quiet music-toggle" id={id}
      data-music-toggle={!spotifyPanel || undefined} data-spotify-toggle={Boolean(spotifyPanel) || undefined}
      data-playing={Boolean(spotifyPanel) || undefined}
      aria-label={spotifyPanel ? 'Close Spotify player' : 'Play music'}
      aria-expanded={spotifyPanel ? true : undefined} aria-controls={spotifyPanel ?? 'site-music'}>
      <svg className="music-play-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M8 5.5a.5.5 0 0 1 .75-.43l10.5 6.5a.5.5 0 0 1 0 .86l-10.5 6.5A.5.5 0 0 1 8 18.5Z" />
      </svg>
      <svg className="music-stop-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
      </svg>
    </button>
  );
}

function SpotifyPlayer() {
  return (
    <div className="spotify-panel" id="site-spotify">
      <div id="spotify-embed" data-src="https://open.spotify.com/embed/track/68xZaWTa9X2H2XqWKp3nar?utm_source=generator&theme=0&si=2c846b4887064c67">
        <a href="https://open.spotify.com/track/68xZaWTa9X2H2XqWKp3nar" target="_blank" rel="noopener">
          Open the track on Spotify
        </a>
      </div>
      <small>Spotify may set cookies. <a href="https://www.spotify.com/legal/privacy-policy/">Spotify privacy policy</a></small>
    </div>
  );
}

export default function Home() {
  const musicSource = process.env.SITE_MUSIC_URL?.trim();
  return <>
    <main id="universe">
      <div id="sky" aria-label="Shared night sky. Drag or use arrow keys to explore." tabIndex={0}>
        <div id="sky-backdrop" aria-hidden="true" />
        <div id="wish-ground" aria-hidden="true" />
        <div id="wish-atmosphere" aria-hidden="true" />
        <canvas id="dust" aria-hidden="true"></canvas>
        <div id="stars"></div>
      </div>
      <header>
        <a className="brand" href="/">✧ <span>Luvy Dovey</span></a>
        <div className="search-area">
          <label className="search" htmlFor="query"><span aria-hidden="true">⌕</span>
            <input id="query" type="search" maxLength={160} autoComplete="off" aria-label="Search for a star" />
          </label>
          <div id="matches" hidden></div>
        </div>
        <div className="header-actions">
          <MusicToggle spotifyPanel={musicSource ? undefined : 'site-spotify'} />
          <button id="saved" className="quiet">My stars</button>
        </div>
      </header>
      {!musicSource && <div id="home-spotify" className="spotify-slot"><SpotifyPlayer /></div>}
      <section id="opening" aria-labelledby="opening-title">
        <h1 id="opening-title" aria-label="A little piece of forever, among the stars.">
          <span className="opening-lead">
            A little piece of <span className="forever-word">f<span className="forever-letter">o<svg
              className="forever-sparkle" viewBox="0 0 20 28" aria-hidden="true" focusable="false"
            >
              <path d="M10 0C10.8 10.5 12.6 12.7 20 14C12.6 15.3 10.8 17.5 10 28C9.2 17.5 7.4 15.3 0 14C7.4 12.7 9.2 10.5 10 0Z" />
            </svg></span>rever,</span>
          </span>{' '}among the stars.
        </h1>
        <p>A place for wishes, memories, and words worth keeping.</p>
        <div className="opening-actions">
          <button className="primary" id="make">Make a Wish</button>
          <button className="quiet" id="explore">Explore the Universe</button>
        </div>
      </section>
      <aside id="placement" hidden><span>Click or tap the sky to place your star.</span>
        <button id="center" className="quiet">Place at center</button><button id="cancel" className="quiet">Cancel</button>
      </aside>
      <aside id="selection" hidden><span id="selected-title"></span>
        <button id="pull" className="primary">Read this star</button><button id="dismiss" className="icon" aria-label="Clear selection">×</button>
      </aside>
      <button className="primary floating" id="add" hidden>Make a Wish</button>
      <p id="status" role="status"></p>
      <footer>To my Luvy Dovey Shinya from Mitsuna</footer>
    </main>
    <dialog id="compose" aria-labelledby="compose-title">
      <a className="brand" id="wish-home" href="/">✧ <span>Luvy Dovey</span></a>
      <MusicToggle id="wish-music-toggle" spotifyPanel={musicSource ? undefined : 'site-spotify'} />
      {!musicSource && <div id="wish-spotify" className="spotify-slot" hidden />}
      <div id="wish-card"><form id="star-form" noValidate>
        <BotanicalFrame />
        <button type="button" className="icon close" aria-label="Close" autoFocus>×</button>
        <div className="wish-heading">
          <div className="storybook-mark" aria-hidden="true">✧</div>
          <h2 id="compose-title">Make a Wish</h2>
          <p>Give your little light a story to carry.</p>
        </div>
        <div className="wish-field">
          <label htmlFor="wish-name">Star name</label>
          <input id="wish-name" name="title" maxLength={80} required placeholder="Name your little star..." aria-describedby="wish-name-error" />
          <p className="field-error" id="wish-name-error" aria-live="polite"></p>
        </div>
        <div className="wish-field">
          <label htmlFor="wish-message">Message</label>
          <textarea id="wish-message" name="note" maxLength={2000} rows={2} required placeholder="Dear universe..." aria-describedby="wish-message-error" />
          <p className="field-error" id="wish-message-error" aria-live="polite"></p>
        </div>
        <div className="form-row">
          <div className="wish-field">
            <label htmlFor="wish-author">Name</label>
            <input id="wish-author" name="author" maxLength={40} placeholder="Your name, or a secret..." />
          </div>
          <div className="wish-field planet-field">
            <div className="planet-label">
              <label htmlFor="wish-planet">Planet</label>
              <div id="planet-help">
                <button type="button" id="planet-help-button" aria-label="Planet meanings" aria-expanded="false" aria-controls="planet-guide">i</button>
                <dl id="planet-guide" aria-label="Planet meanings" hidden>
                  {planets.map((planet) => (
                    <div key={planet.name} data-color={planet.color}>
                      <dt><span className="swatch-dot" aria-hidden="true" />{planet.name}</dt>
                      <dd>{planet.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <select id="wish-planet" name="planet" defaultValue="" required aria-describedby="wish-planet-error">
              <option value="">Choose a planet</option>
              {planets.map((planet) => (
                <option key={planet.name} value={planet.name}>
                  {planet.name} — {planet.colorLabel}
                </option>
              ))}
            </select>
            <p className="field-error" id="wish-planet-error" aria-live="polite"></p>
          </div>
        </div>
        <details id="wish-memory">
          <summary className="memory-summary">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
            <span className="memory-label">
              <span>Add a memory</span>
              <small>Optional · Up to {maxStarPhotos} photos<span id="wish-memory-count" /></small>
            </span>
            <span className="memory-chevron" aria-hidden="true" />
          </summary>
          <div className="memory-content">
            <div id="wish-photo-drop">
              <button type="button" id="pick-wish-photos" aria-label="Choose photos" aria-describedby="wish-photos-help">
                <span className="photo-drop-desktop">Drop photos here</span>
                <span className="photo-drop-touch">Choose photos</span>
                <span className="photo-drop-hint">Browse files or gallery</span>
              </button>
            </div>
            <input type="file" id="wish-photos" accept="image/jpeg,image/png,image/webp" multiple hidden
              data-max-count={maxStarPhotos} data-max-edge={maxPhotoEdge} data-max-length={maxPhotoLength}
              data-max-source-bytes={maxSourcePhotoBytes} />
            <p className="photo-help" id="wish-photos-help">Anyone who opens your star can see its photos.</p>
            <p className="field-error" id="wish-photos-feedback" role="status"></p>
            <div id="wish-photo-previews" role="group" aria-label="Selected photos" hidden />
          </div>
        </details>
        <input hidden name="website" tabIndex={-1} autoComplete="off" />
        <button type="submit" className="primary">Place my star ✧</button>
      </form></div>
    </dialog>
    <dialog id="reader" aria-labelledby="read-title">
      <button type="button" className="icon close" aria-label="Close">×</button>
      <div className="letter-star" aria-hidden="true">✧</div>
      <h2 id="read-title"></h2>
      <p id="read-status" role="status"></p>
      <div id="read-message" hidden>
        <p id="read-note"></p>
        <div id="read-photos" role="group" aria-label="Attached photos" hidden />
        <p id="read-author"></p>
        <time id="read-date"></time>
        <div className="letter-actions">
          <button id="copy" className="quiet" hidden>Copy private link</button>
          <button id="delete" className="quiet" hidden>Delete star</button>
        </div>
      </div>
    </dialog>
    <dialog id="collection" aria-labelledby="collection-title">
      <button type="button" className="icon close" aria-label="Close">×</button>
      <h2 id="collection-title">My stars</h2>
      <p>Stars you’ve saved in this browser.</p>
      <div id="saved-list"></div>
    </dialog>
    {musicSource && <audio id="site-music" src={musicSource} loop preload="none" />}
    <Script src="/sky.js" strategy="afterInteractive" />
  </>;
}
