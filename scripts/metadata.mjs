import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from './descriptions.mjs';

export function siteBaseUrl(value) {
    if (!value) return null;
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('SITE_URL must be an HTTP(S) base URL without credentials, query or fragment.');
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url;
}

export function applyMetadata(output, base) {
    const pages = ['index.html', 'gamespace.html', 'game-info.html'];
    const details = path.join(output, 'content/games');
    if (fs.existsSync(details)) pages.push(...fs.readdirSync(details).filter(name => name.endsWith('.html')).map(name => 'content/games/' + name));
    for (const relative of pages) {
        const file = path.join(output, relative);
        if (!fs.existsSync(file)) continue;
        let html = fs.readFileSync(file, 'utf8');
        const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
        const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
        if (!title || !description) throw new Error('Missing page metadata: ' + relative);
        const tags = [
            `<meta property="og:type" content="website">`,
            `<meta property="og:site_name" content="Игры Ильи Барило">`,
            `<meta property="og:locale" content="ru_RU">`,
            `<meta property="og:title" content="${title}">`,
            `<meta property="og:description" content="${description}">`,
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta name="twitter:title" content="${title}">`,
            `<meta name="twitter:description" content="${description}">`
        ];
        if (base) {
            const url = escapeHtml(new URL(relative === 'index.html' ? './' : relative, base).href);
            const image = escapeHtml(new URL('assets/social-preview.jpg', base).href);
            tags.push(`<link rel="canonical" href="${url}">`, `<meta property="og:url" content="${url}">`,
                `<meta property="og:image" content="${image}">`, `<meta property="og:image:width" content="1280">`,
                `<meta property="og:image:height" content="640">`, `<meta property="og:image:type" content="image/jpeg">`,
                `<meta property="og:image:alt" content="Игры Ильи Барило: Змейка 3D, Крестики-нолики с сапёром и Шарики с поздравлениями">`,
                `<meta name="twitter:image" content="${image}">`, `<meta name="twitter:image:alt" content="Три игры авторской коллекции Ильи Барило">`);
        }
        html = html.replace('</head>', '    ' + tags.join('\n    ') + '\n</head>');
        fs.writeFileSync(file, html);
    }
}
