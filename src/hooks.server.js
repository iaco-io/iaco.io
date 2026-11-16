// the blog and the cms install as two separate apps: each gets its own manifest, icon and name.
// done here so it's in the html even for the cms, which renders only in the browser.
const apps = {
	blog: { base: '', name: 'iaco' },
	cms: { base: '/cms', name: 'iaco cms' }
};

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	const app = event.url.pathname.startsWith('/cms') ? apps.cms : apps.blog;
	const tags = [
		`<link rel="manifest" href="${app.base}/manifest.webmanifest" />`,
		`<link rel="apple-touch-icon" href="${app.base}/apple-touch-icon.png" />`,
		`<meta name="apple-mobile-web-app-title" content="${app.name}" />`
	].join('\n\t\t');
	return resolve(event, { transformPageChunk: ({ html }) => html.replace('%app.install%', tags) });
}
