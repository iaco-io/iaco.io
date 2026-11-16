// removes metadata from files before they are uploaded: camera, place (gps), software, names, comments…
// kept: dates (taken, digitized, edited, with their time zones), and what's needed to show a photo right:
// its orientation (or it shows sideways) and its colour profile (or colours shift).
// jpeg, png and webp images, and mp3 tags, are cleaned; other files go up unchanged.

/** @param {File} file @returns {Promise<File>} */
export async function strip(file) {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let clean = bytes;
	try {
		if (bytes[0] === 0xff && bytes[1] === 0xd8) clean = jpeg(bytes);
		else if (ascii(bytes, 1, 3) === 'PNG') clean = png(bytes);
		else if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') clean = webp(bytes);
		else if (/\.mp3$/i.test(file.name) || file.type === 'audio/mpeg') clean = mp3(bytes);
	} catch {
		// if a file can't be read as expected, it's uploaded as it is rather than broken
		clean = bytes;
	}
	return clean === bytes ? file : new File([clean], file.name, { type: file.type, lastModified: file.lastModified });
}

const ascii = (/** @type {Uint8Array} */ b, /** @type {number} */ at, /** @type {number} */ n) =>
	String.fromCharCode(...b.subarray(at, at + n));

/** @param {Uint8Array[]} parts */
function join(parts) {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of parts) out.set(p, (at += p.length) - p.length);
	return out;
}

// ---------- jpeg ----------

/** @param {Uint8Array} b */
function jpeg(b) {
	const parts = [b.subarray(0, 2)];
	let at = 2;
	while (at < b.length) {
		if (b[at] !== 0xff) throw new Error('bad jpeg');
		const marker = b[at + 1];
		// start of scan: the image data follows until the end, keep it all
		if (marker === 0xda) {
			parts.push(b.subarray(at));
			break;
		}
		const length = (b[at + 2] << 8) | b[at + 3];
		const segment = b.subarray(at, at + 2 + length);
		const body = segment.subarray(4);
		at += 2 + length;
		if (marker === 0xe1 && ascii(body, 0, 6) === 'Exif\0\0') {
			const exif = keepDates(body.subarray(6));
			if (exif) parts.push(app1(exif));
		} else if (marker === 0xe2 && ascii(body, 0, 12) === 'ICC_PROFILE\0') {
			parts.push(segment); // colour profile
		} else if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
			// other app segments (xmp, photoshop/iptc, maker notes…) and comments: dropped
		} else {
			parts.push(segment);
		}
	}
	return join(parts);
}

/** @param {Uint8Array} tiff */
function app1(tiff) {
	const length = 2 + 6 + tiff.length;
	return join([new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff]), new TextEncoder().encode('Exif\0\0'), tiff]);
}

// exif tags kept: orientation, and every date with its sub-seconds and time zone
const KEEP_IFD0 = new Set([0x0112, 0x0132]); // orientation, date edited
const KEEP_EXIF = new Set([0x9003, 0x9004, 0x9010, 0x9011, 0x9012, 0x9290, 0x9291, 0x9292]); // taken, digitized, offsets, sub-seconds
const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

/**
 * reads an exif (tiff) block and writes a new one with only the kept tags
 * @param {Uint8Array} tiff
 */
function keepDates(tiff) {
	const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
	const little = ascii(tiff, 0, 2) === 'II';
	const u16 = (/** @type {number} */ o) => view.getUint16(o, little);
	const u32 = (/** @type {number} */ o) => view.getUint32(o, little);

	/** @param {number} offset @param {Set<number>} keep */
	function read(offset, keep) {
		/** @type {{ tag: number, type: number, count: number, data: Uint8Array }[]} */
		const entries = [];
		let exifAt = 0;
		const n = u16(offset);
		for (let i = 0; i < n; i++) {
			const e = offset + 2 + i * 12;
			const tag = u16(e);
			const type = u16(e + 2);
			const count = u32(e + 4);
			if (tag === 0x8769) exifAt = u32(e + 8);
			if (!keep.has(tag)) continue;
			const size = (SIZES[/** @type {keyof typeof SIZES} */ (type)] ?? 1) * count;
			const from = size <= 4 ? e + 8 : u32(e + 8);
			entries.push({ tag, type, count, data: tiff.slice(from, from + size) });
		}
		return { entries, exifAt };
	}

	const ifd0 = read(u32(4), KEEP_IFD0);
	const exif = ifd0.exifAt ? read(ifd0.exifAt, KEEP_EXIF).entries : [];
	if (!ifd0.entries.length && !exif.length) return null;

	// write a fresh little-endian tiff: header, ifd0 (+ pointer to the exif ifd), exif ifd, then the values
	const ifdSize = (/** @type {number} */ n) => 2 + n * 12 + 4;
	const ifd0Entries = [...ifd0.entries, ...(exif.length ? [{ tag: 0x8769, type: 4, count: 1, data: new Uint8Array(4) }] : [])];
	const ifd0At = 8;
	const exifAt = ifd0At + ifdSize(ifd0Entries.length);
	let dataAt = exifAt + (exif.length ? ifdSize(exif.length) : 0);
	const out = new Uint8Array(dataAt + [...ifd0Entries, ...exif].reduce((n, e) => n + (e.data.length > 4 ? e.data.length + 1 : 0), 0));
	const w = new DataView(out.buffer);
	out.set([0x49, 0x49, 0x2a, 0x00]);
	w.setUint32(4, ifd0At, true);

	/** @param {number} at @param {typeof ifd0Entries} entries */
	function write(at, entries) {
		w.setUint16(at, entries.length, true);
		entries.sort((a, b) => a.tag - b.tag).forEach((e, i) => {
			const p = at + 2 + i * 12;
			w.setUint16(p, e.tag, true);
			w.setUint16(p + 2, e.type, true);
			w.setUint32(p + 4, e.count, true);
			if (e.tag === 0x8769) w.setUint32(p + 8, exifAt, true);
			else if (e.data.length <= 4) out.set(e.data, p + 8);
			else {
				w.setUint32(p + 8, dataAt, true);
				out.set(e.data, dataAt);
				dataAt += e.data.length + (e.data.length % 2);
			}
			// short values written in the source byte order need flipping to little-endian
			if (!little && e.data.length <= 4 && e.type === 3) w.setUint16(p + 8, new DataView(e.data.buffer).getUint16(0, false), true);
		});
		w.setUint32(at + 2 + entries.length * 12, 0, true);
	}
	write(ifd0At, ifd0Entries);
	if (exif.length) write(exifAt, exif);
	return out.subarray(0, dataAt);
}

// ---------- png ----------

// kept: the image itself, how to draw it (colour, gamma, transparency, pixel size) and its last-modified time
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs', 'tIME', 'acTL', 'fcTL', 'fdAT']);

/** @param {Uint8Array} b */
function png(b) {
	const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
	const parts = [b.subarray(0, 8)];
	let at = 8;
	while (at < b.length) {
		const length = view.getUint32(at);
		const type = ascii(b, at + 4, 4);
		const end = at + 12 + length;
		if (PNG_KEEP.has(type)) parts.push(b.subarray(at, end));
		at = end;
		if (type === 'IEND') break;
	}
	return join(parts);
}

// ---------- webp ----------

/** @param {Uint8Array} b */
function webp(b) {
	const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
	/** @type {Uint8Array[]} */
	const parts = [];
	let header = -1;
	let hasExif = false;
	let at = 12;
	while (at + 8 <= b.length) {
		const type = ascii(b, at, 4);
		const size = view.getUint32(at + 4, true);
		const end = at + 8 + size + (size % 2);
		if (type === 'EXIF') {
			// keep only the dates (and orientation), like in jpegs
			let data = b.subarray(at + 8, at + 8 + size);
			if (ascii(data, 0, 6) === 'Exif\0\0') data = data.subarray(6);
			const kept = keepDates(data);
			if (kept) {
				const chunk = new Uint8Array(8 + kept.length + (kept.length % 2));
				chunk.set(new TextEncoder().encode('EXIF'));
				new DataView(chunk.buffer).setUint32(4, kept.length, true);
				chunk.set(kept, 8);
				parts.push(chunk);
				hasExif = true;
			}
		} else if (type !== 'XMP ') {
			if (type === 'VP8X') header = parts.length;
			parts.push(b.slice(at, end));
		}
		at = end;
	}
	// the header chunk says which extras exist: no xmp any more, exif only if dates were kept
	if (header >= 0) parts[header][8] = (parts[header][8] & ~0b1100) | (hasExif ? 0b1000 : 0);
	const body = join(parts);
	const head = new Uint8Array(12);
	head.set(b.subarray(0, 12));
	new DataView(head.buffer).setUint32(4, body.length + 4, true);
	return join([head, body]);
}

// ---------- mp3 ----------

/** id3 tags (title, artist, pictures, comments…) at the start and end are removed; the sound stays */
function mp3(/** @type {Uint8Array} */ b) {
	let start = 0;
	while (ascii(b, start, 3) === 'ID3') {
		const size = ((b[start + 6] & 0x7f) << 21) | ((b[start + 7] & 0x7f) << 14) | ((b[start + 8] & 0x7f) << 7) | (b[start + 9] & 0x7f);
		start += 10 + size + (b[start + 5] & 0x10 ? 10 : 0);
	}
	let end = b.length;
	if (end - start > 128 && ascii(b, end - 128, 3) === 'TAG') end -= 128;
	return start || end !== b.length ? b.subarray(start, end) : b;
}
