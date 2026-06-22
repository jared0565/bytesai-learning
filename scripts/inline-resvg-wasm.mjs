import { writeFileSync, readFileSync } from 'fs';

const wasmPath = new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url);
const wasm = readFileSync(wasmPath);
const base64 = wasm.toString('base64');
const out = new URL('../src/lib/resvg-wasm-inline.ts', import.meta.url);
writeFileSync(out, `export const RESVG_WASM_BASE64 = '${base64}';\n`);
console.log('Inlined resvg WASM:', Math.round(base64.length / 1024), 'KB');
