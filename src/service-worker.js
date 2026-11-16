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
const ASSETS = [...IMMUTABLE, ...assets.map(toPath), ...prerendered.map(toPath)].filter((p) => !isMedia(p) && !isPostMedia(p));

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
			.then(() => self.clients.claim())
	);
});

// hashed build files: cache first. pages and static files: network first, cache when offline
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin || isMedia(url.pathname)) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(isPostMedia(url.pathname) ? MEDIA : CACHE);
			// hashed names never change content, so a saved copy is always right
			if (IMMUTABLE.includes(url.pathname) || isPostMedia(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			try {
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch {
				return (await cache.match(event.request)) ?? (await cache.match('/')) ?? Response.error();
			}
		})()
	);
});
