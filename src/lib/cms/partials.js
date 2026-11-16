// unsaved edits, kept on this device until they are saved to github
const PREFIX = 'cms-partial:';

/** where an edit is kept: new items by a random id, saved ones by their file */
export const keyOf = (/** @type {{ isNew: boolean, id?: string, kind: string, from: string }} */ e) =>
	e.isNew ? `new:${e.id}` : `${e.kind}/${e.from}`;

/** the part of an edit that matters for "has it changed?" */
export const contentOf = (/** @type {{ kind: string, name: string, meta: object, body: string }} */ e) =>
	JSON.stringify({ kind: e.kind, name: e.name, meta: e.meta, body: e.body });

/** @returns {Record<string, any>} */
export function listPartials() {
	try {
		return Object.fromEntries(
			Object.keys(localStorage)
				.filter((key) => key.startsWith(PREFIX))
				.map((key) => [key.slice(PREFIX.length), JSON.parse(/** @type {string} */ (localStorage.getItem(key)))])
		);
	} catch {
		return {};
	}
}

export function storePartial(/** @type {string} */ key, /** @type {string} */ json) {
	try {
		localStorage.setItem(PREFIX + key, json);
	} catch {}
}

export function dropPartial(/** @type {string} */ key) {
	try {
		localStorage.removeItem(PREFIX + key);
	} catch {}
}
