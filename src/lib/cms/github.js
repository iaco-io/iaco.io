// minimal github contents api client for the cms
export const REPO = 'iaco-io/iaco.io';
const BRANCH = 'main';
const API = 'https://api.github.com';

export const rawUrl = (/** @type {string} */ path) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

const encodePath = (/** @type {string} */ path) => path.split('/').map(encodeURIComponent).join('/');

/** @param {string} text */
export function utf8ToBase64(text) {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

/** @param {string} base64 */
const base64ToUtf8 = (base64) =>
	new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

/** @param {string} token */
export function github(token) {
	/** @param {string} path @param {RequestInit} [options] */
	async function request(path, options = {}) {
		const response = await fetch(API + path, {
			...options,
			cache: 'no-store',
			headers: {
				authorization: `Bearer ${token}`,
				accept: 'application/vnd.github+json',
				...(options.body ? { 'content-type': 'application/json' } : {})
			}
		});
		if (!response.ok) {
			const { message } = await response.json().catch(() => ({ message: response.statusText }));
			throw new Error(`github: ${message?.toLowerCase() ?? response.status}`);
		}
		return response.json();
	}

	return {
		/** checks the token can write to the repo */
		async check() {
			const repo = await request(`/repos/${REPO}`);
			if (!repo.permissions?.push) throw new Error(`this token can't write to ${REPO}`);
		},

		/** all file paths in the repo */
		async list() {
			const { tree } = await request(`/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
			return /** @type {{ path: string, type: string, sha: string }[]} */ (tree).filter((f) => f.type === 'blob');
		},

		/** @param {string} path */
		async read(path) {
			const file = await request(`/repos/${REPO}/contents/${encodePath(path)}?ref=${BRANCH}`);
			return { sha: /** @type {string} */ (file.sha), text: base64ToUtf8(file.content) };
		},

		/** @param {string} path @param {string} base64 @param {string | undefined} sha @param {string} message */
		async write(path, base64, sha, message) {
			const { content } = await request(`/repos/${REPO}/contents/${encodePath(path)}`, {
				method: 'PUT',
				body: JSON.stringify({ message, content: base64, branch: BRANCH, ...(sha ? { sha } : {}) })
			});
			return /** @type {string} */ (content.sha);
		},

		/** @param {string} path @param {string} sha @param {string} message */
		async remove(path, sha, message) {
			await request(`/repos/${REPO}/contents/${encodePath(path)}`, {
				method: 'DELETE',
				body: JSON.stringify({ message, sha, branch: BRANCH })
			});
		}
	};
}
