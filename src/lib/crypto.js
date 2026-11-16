// post bodies are stored encrypted in github so they can't be read automatically.
// the password is public on purpose: the browser needs it to decrypt.
const PASSWORD = 'bJPyO9d4Ue!*R7zDOb~W';
const PREFIX = 'enc:v1:';
const ITERATIONS = 250_000;

const utf8 = new TextEncoder();
const text = new TextDecoder();

/** @param {Uint8Array} salt */
async function key(salt) {
	const base = await crypto.subtle.importKey('raw', utf8.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

/** @param {Uint8Array} bytes */
function toBase64(bytes) {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

/** @param {string} base64 */
const fromBase64 = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

export const isEncrypted = (/** @type {string} */ value) => value.trimStart().startsWith(PREFIX);

/** @param {string} plain */
export async function encrypt(plain) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(salt), utf8.encode(plain)));
	const encoded = toBase64(new Uint8Array([...salt, ...iv, ...data]));
	// wrap lines so git diffs stay readable
	return PREFIX + '\n' + encoded.match(/.{1,76}/g).join('\n');
}

/** @param {string} value */
export async function decrypt(value) {
	if (!isEncrypted(value)) return value;
	const bytes = fromBase64(value.trim().slice(PREFIX.length).replace(/\s/g, ''));
	const plain = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: bytes.subarray(16, 28) },
		await key(bytes.subarray(0, 16)),
		bytes.subarray(28)
	);
	return text.decode(plain);
}
