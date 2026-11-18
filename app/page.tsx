import Script from 'next/script';

export default function Home() {
  return <>
    <main id="universe">
      <div id="sky" aria-label="Shared night sky. Drag or use arrow keys to explore." tabIndex={0}>
        <canvas id="dust" aria-hidden="true"></canvas>
        <div id="stars"></div>
      </div>
      <header>
        <a className="brand" href="/">✧ <span>Luvy Dovey</span></a>
        <div className="search-area">
          <label className="search" htmlFor="query"><span aria-hidden="true">⌕</span>
            <input id="query" type="search" maxLength={160} autoComplete="off" aria-label="Search for a star"
              placeholder="Looking for a little piece of the universe? ✨" />
          </label>
          <div id="matches" hidden></div>
        </div>
        <button id="saved" className="quiet">My stars</button>
      </header>
      <section id="opening" aria-labelledby="opening-title">
        <div className="ornament" aria-hidden="true">✧</div>
        <h1 id="opening-title">Some wishes are too<br className="desktop-break" /> beautiful to <em>disappear.</em></h1>
        <p>Leave a little piece of your heart among the stars.</p>
        <div className="opening-actions">
          <button className="primary" id="make">Make a Wish ✨</button>
          <button className="quiet" id="explore">Explore the Universe <span aria-hidden="true">↗</span></button>
        </div>
      </section>
      <aside id="placement" hidden><span>Click or tap the sky to place your star.</span>
        <button id="center" className="quiet">Place at center</button><button id="cancel" className="quiet">Cancel</button>
      </aside>
      <aside id="selection" hidden><span id="selected-title"></span>
        <button id="pull" className="primary">Pull this star closer</button><button id="dismiss" className="icon" aria-label="Clear selection">×</button>
      </aside>
      <button className="primary floating" id="add" hidden>Make a Wish ✨</button>
      <p id="status" role="status"></p>
      <footer>Made with love, for all the things we wish to remember.</footer>
    </main>
    <dialog id="compose" aria-labelledby="compose-title">
      <form id="star-form">
        <button type="button" className="icon close" aria-label="Close">×</button>
        <h2 id="compose-title">Make a Wish ✨</h2>
        <label>Star name<input name="title" maxLength={80} required placeholder="A name for this little light" /></label>
        <label>Your message<textarea name="note" maxLength={2000} rows={4} required placeholder="A wish, a memory, or something you want to remember…" /></label>
        <div className="form-row">
          <label>Nickname <small>(optional)</small><input name="author" maxLength={40} /></label>
          <label>Tags <small>(optional)</small><input name="tags" maxLength={160} placeholder="e.g. memories, home" /></label>
        </div>
        <fieldset><legend>Star colour</legend><div className="swatches">
          {['white', 'gold', 'pink', 'lavender', 'blue'].map((color) =>
            <label key={color} data-color={color}><input type="radio" name="color" value={color} defaultChecked={color === 'lavender'} /><span>{color}</span></label>
          )}
        </div></fieldset>
        <label>Visibility<select name="visibility" defaultValue="public"><option value="public">Public · visible to everyone</option><option value="private">Private · accessible with a secret link</option></select></label>
        <input hidden name="website" tabIndex={-1} autoComplete="off" />
        <button className="primary">Choose a place</button>
      </form>
    </dialog>
    <dialog id="reader" aria-labelledby="read-title">
      <button type="button" className="icon close" aria-label="Close">×</button>
      <div className="letter-star" aria-hidden="true">✧</div>
      <h2 id="read-title"></h2>
      <p id="read-note"></p>
      <p id="read-author"></p>
      <time id="read-date"></time>
      <div className="letter-actions">
        <button id="copy" className="quiet" hidden>Copy private link</button>
        <button id="delete" className="quiet" hidden>Delete star</button>
      </div>
    </dialog>
    <dialog id="collection" aria-labelledby="collection-title">
      <button type="button" className="icon close" aria-label="Close">×</button>
      <h2 id="collection-title">My stars</h2>
      <p>Stars you’ve saved in this browser.</p>
      <div id="saved-list"></div>
    </dialog>
    <Script src="/sky.js" strategy="afterInteractive" />
  </>;
}
