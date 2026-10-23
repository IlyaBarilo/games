import assert from 'node:assert/strict';
import { checkInlineScripts } from './check.mjs';

const filename = 'fixture.html';
const metadata = '<script type="application/json" id="full-build-info">{"format":"standalone","thirdParty":[{"license":"MIT"}]}</script>';
assert.doesNotThrow(() => checkInlineScripts(metadata + '<script>const ready = true;</script>', filename));
for (const type of ['application/json', 'application/ld+json', 'APPLICATION/JSON; charset=utf-8']) {
    assert.doesNotThrow(() => checkInlineScripts("<script type='" + type + "'>{\"name\":\"Игра\"}</script>", filename));
    assert.throws(() => checkInlineScripts('<script type="' + type + '">{"name":}</script>', filename), /Invalid JSON script in fixture\.html/);
}
assert.doesNotThrow(() => checkInlineScripts('<script type=application/json>{"valid":true}</script>', filename));
for (const attributes of ['', ' type="text/javascript"', " type='application/javascript'"]) {
    assert.throws(() => checkInlineScripts(metadata + '<script' + attributes + '>const broken = ;</script>', filename), /Unexpected token/);
}
console.log('Passed: standalone JSON metadata is parsed as data; malformed JSON and JavaScript still fail.');
