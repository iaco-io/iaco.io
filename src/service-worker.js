/// <reference types="@sveltejs/kit" />
import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `cache-${version}`;
const toPath = ({ path }) => new URL(path, self.registration.scope).pathname;
const IMMUTABLE = immutable.map(toPath);
const ASSETS = [...IMMUTABLE, ...assets.map(toPath), ...prerendered.map(toPath)];

// take over as soon as a new version is installed, so updates show on next load
self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

// hashed build files: cache first. pages and static files: network first, cache when offline
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (IMMUTABLE.includes(url.pathname)) {
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
