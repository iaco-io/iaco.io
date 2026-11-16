/** the first image (or other file) on the clipboard, as a File; throws a readable message otherwise */
export async function pasteFile() {
	let items;
	try {
		items = await navigator.clipboard.read();
	} catch {
		throw new Error("couldn't read the clipboard");
	}
	for (const item of items) {
		const type = item.types.find((t) => !t.startsWith('text/'));
		if (!type) continue;
		const blob = await item.getType(type);
		return new File([blob], `pasted-${Date.now()}.${type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'}`, { type });
	}
	throw new Error('nothing to paste in the clipboard');
}
