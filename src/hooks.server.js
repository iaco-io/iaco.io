// the blog and the cms install as two separate apps: each gets its own manifest and name, with the same icon
// (iphones take one apple-touch-icon per website, so both share it).
// done here so it's in the html even for the cms, which renders only in the browser.
const apps = {
	blog: { base: '', name: 'iaco' },
	cms: { base: '/cms', name: 'iaco cms' }
};

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	const app = event.url.pathname.startsWith('/cms') ? apps.cms : apps.blog;
	const tags = [
		`<link rel="icon" href="/icon.svg" type="image/svg+xml" />`,
		`<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />`,
		`<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
		`<link rel="manifest" href="${app.base}/manifest.webmanifest" />`,
		`<meta name="apple-mobile-web-app-title" content="${app.name}" />`
	];
	// the 404 page (served for any address that doesn't exist) sends the visitor straight home
	if (event.url.pathname === '/[fallback]') tags.unshift(`<script>location.replace('/')</script>`);
	return resolve(event, { transformPageChunk: ({ html }) => html.replace('%app.install%', tags.join('\n\t\t')) });
}
