import fs from 'node:fs';
import path from 'node:path';

export function parseReleaseTag(tag) {
    if (typeof tag !== 'string' || !/^v[0-9]+(?:\.[0-9]+){0,3}$/.test(tag) || /[\r\n]/.test(tag)) {
        throw new Error('Release tag must be v followed by one to four numeric parts, for example v1 or v0.1.2.3.');
    }
    return { tag, version: tag.slice(1) };
}

export function stampBuild(output, release) {
    if (!release) return;
    const metadata = JSON.stringify(release, null, 2) + '\n';
    fs.writeFileSync(path.join(output, 'release.json'), metadata);
    function walk(folder) {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
            if (folder === output && entry.name === 'games') continue;
            const file = path.join(folder, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (entry.name.endsWith('.html')) {
                const html = fs.readFileSync(file, 'utf8');
                if (!/<\/body>/i.test(html)) throw new Error('Missing body: ' + file);
                const slot = '<span class="release-version" data-release-slot hidden></span>';
                const label = `<span class="release-version" data-release-slot data-release-version="${release.version}" aria-label="Версия ${release.version}">${release.version}</span>`;
                const rendered = html.includes(slot)
                    ? html.replace(slot, label)
                    : html.replace(/<\/body>/i, `<p data-release-version="${release.version}" style="text-align:center;font:14px sans-serif;padding:12px">Версия ${release.version}</p>\n</body>`);
                fs.writeFileSync(file, rendered);
            }
        }
    }
    walk(output);
}
