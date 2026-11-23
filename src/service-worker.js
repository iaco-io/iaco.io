/// <reference types="@sveltejs/kit" />
import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `cache-${version}`;
// images and other media from posts: saved only once viewed, and kept across versions
const MEDIA = 'media';
const toPath = ({ path }) => new URL(path, self.registration.scope).pathname;
const IMMUTABLE = immutable.map(toPath);
// sound and video (like the rain) are left to the browser: big, and fetched in ranges
const isMedia = (/** @type {string} */ path) => /\.(mp3|m4a|wav|ogg|aac|flac|mp4|mov|webm|m4v)$/i.test(path);
// images built from src/media into hashed files
const isPostMedia = (/** @type {string} */ path) =>
	path.startsWith('/_app/immutable/assets/') && /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(path);
// only the app itself is saved on install: code, styles, icons and pages
// the lucide icons for posts (static/lucide) are many: each is saved only once a page shows it
const ASSETS = [...IMMUTABLE, ...assets.map(toPath), ...prerendered.map(toPath)].filter(
	(p) => !isMedia(p) && !isPostMedia(p) && !p.startsWith('/lucide/')
);

// saved images not opened for 10 days are dropped. the last time each was opened is kept in the media cache itself
const KEEP = 10 * 24 * 60 * 60 * 1000;
const SEEN = '/__media-seen';
/** @type {Record<string, number> | null} */
let seen = null;
let pruned = 0;

async function seenTimes() {
	if (!seen) seen = (await (await caches.open(MEDIA)).match(SEEN).then((r) => r?.json()).catch(() => null)) ?? {};
	return /** @type {Record<string, number>} */ (seen);
}

async function saveSeen() {
	await (await caches.open(MEDIA)).put(SEEN, new Response(JSON.stringify(await seenTimes())));
}

/** @param {string} path */
async function opened(path) {
	(await seenTimes())[path] = Date.now();
	await saveSeen();
}

async function prune() {
	pruned = Date.now();
	const media = await caches.open(MEDIA);
	const times = await seenTimes();
	for (const request of await media.keys()) {
		const path = new URL(request.url).pathname;
		if (path === SEEN) continue;
		// saved before this was tracked: count from now
		if (!times[path]) times[path] = pruned;
		else if (pruned - times[path] > KEEP) {
			await media.delete(request);
			delete times[path];
		}
	}
	await saveSeen();
}

// take over as soon as a new version is installed, so updates show on next load
self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== MEDIA).map((key) => caches.delete(key))))
			.then(prune)
			.then(() => self.clients.claim())
	);
});

// hashed build files: cache first. pages and static files: network first, cache when offline
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin || isMedia(url.pathname)) return;
	// remember when images are opened, and tidy up old ones about once an hour
	if (isPostMedia(url.pathname)) event.waitUntil(opened(url.pathname).then(() => (Date.now() - pruned > 3600_000 ? prune() : undefined)));

	event.respondWith(
		(async () => {
			const cache = await caches.open(isPostMedia(url.pathname) ? MEDIA : CACHE);
			// hashed names never change content, so a saved copy is always right
			if (IMMUTABLE.includes(url.pathname) || isPostMedia(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			try {
				// always checked with the server (cheap when unchanged): the browser's own short-lived copy could be
				// from the version before, and mixing an old page's data with new code shows the wrong things
				const response = await fetch(url.href, { cache: 'no-cache' });
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch {
				return (await cache.match(event.request)) ?? (await cache.match('/')) ?? Response.error();
			}
		})()
	);
});
