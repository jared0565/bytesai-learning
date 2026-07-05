import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const inlineComposer = readFileSync('src/components/ui/InlineCrossPostComposer.tsx', 'utf8');
const modalComposer = readFileSync('src/components/ui/CuratedSharePanel.tsx', 'utf8');

for (const [name, source] of [
  ['inline composer', inlineComposer],
  ['modal composer', modalComposer],
] as const) {
  test(`${name} supports native image posting workflow`, () => {
    assert.match(source, /handleCopyImage/);
    assert.match(source, /ClipboardItem/);
    assert.match(source, /Copy image/);
    assert.match(source, /Download image/);
    assert.match(source, /Native image workflow/);
    assert.match(source, /\['twitter', 'linkedin', 'facebook'\]\.includes\(selected\)/);
  });
}
