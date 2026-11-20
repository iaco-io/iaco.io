// every lucide icon as a small svg file in static/lucide/ (and a list of their names), made from the @lucide/svelte package before each build,
// so a post can show any of them: ![](lucide/feather). lucide lab's icons (lucide.dev/icons/lab) come too, under the
// same names as on its site (a core icon wins if both have a name). the files aren't kept in git
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as lab from '@lucide/lab';

const FROM = 'node_modules/@lucide/svelte/dist/icons';
const TO = 'static/lucide';

export function lucide() {
	return {
		name: 'lucide-svgs',
		buildStart() {
			if (existsSync(`${TO}/apple-core.svg`)) return; // made already (with the lab icons)
			mkdirSync(TO, { recursive: true });
			/** @type {Record<string, [string, Record<string, string>][]>} */
			const icons = {};
			for (const [key, node] of Object.entries(lab)) if (Array.isArray(node)) icons[key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()] = node;
			for (const file of readdirSync(FROM)) {
				if (!file.endsWith('.svelte')) continue;
				const data = readFileSync(`${FROM}/${file}`, 'utf8').match(/__iconData = (\{.*?\});\n/)?.[1];
				if (!data) continue;
				const { name, node } = JSON.parse(data);
				icons[name] = node;
			}
			for (const [name, node] of Object.entries(icons)) {
				const parts = node
					.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
					.join('');
				writeFileSync(
					`${TO}/${name}.svg`,
					`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>\n`
				);
			}
			// every name, for the cms's icon picker
			writeFileSync(`${TO}/names.json`, JSON.stringify(Object.keys(icons).sort()));
		}
	};
}
