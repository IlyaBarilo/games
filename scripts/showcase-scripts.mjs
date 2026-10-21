import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { minify } from 'terser';

// Only the pavilion implementation is processed. Games and third-party scripts are copied unchanged.
export const showcaseScripts = Object.freeze(['assets/js/pavilion.js']);
export async function minifyShowcaseScript(name, source) {
    assert(showcaseScripts.includes(name), 'Script is not in the showcase build allowlist: ' + name);
    const result = await minify({ [name]: source }, {
        compress: false,
        mangle: { properties: false },
        keep_fnames: true,
        keep_classnames: true,
        format: { comments: 'all' }
    });
    assert(result.code, 'Minifier produced an empty script: ' + name);
    return result.code + '\n';
}
export async function prepareShowcaseScripts(root) {
    const scripts = new Map();
    for (const name of showcaseScripts) scripts.set(name, await minifyShowcaseScript(name, fs.readFileSync(path.join(root, name), 'utf8')));
    return scripts;
}
