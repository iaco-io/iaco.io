// every lucide icon as a small svg file in static/lucide/, made from the @lucide/svelte package before each build,
// so a post can show any of them: ![](lucide/feather). the files aren't kept in git
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const FROM = 'node_modules/@lucide/svelte/dist/icons';
const TO = 'static/lucide';

export function lucide() {
	return {
		name: 'lucide-svgs',
		buildStart() {
			if (existsSync(`${TO}/feather.svg`)) return;
			mkdirSync(TO, { recursive: true });
			for (const file of readdirSync(FROM)) {
				if (!file.endsWith('.svelte')) continue;
				const data = readFileSync(`${FROM}/${file}`, 'utf8').match(/__iconData = (\{.*?\});\n/)?.[1];
				if (!data) continue;
				const { name, node } = JSON.parse(data);
				const parts = node
					.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
					.join('');
				writeFileSync(
					`${TO}/${name}.svg`,
					`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>\n`
				);
			}
		}
	};
}
