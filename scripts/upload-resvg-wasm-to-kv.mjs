import { readFileSync } from 'fs';

const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID ?? 'e8906bbacee64e21a17cdc9822f2c1a7';
const wasmPath = new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url);
const wasm = readFileSync(wasmPath);

const putUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/RESVG_WASM`;

const res = await fetch(putUrl, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/wasm',
  },
  body: wasm,
});

const data = await res.json();
if (!data.success) {
  console.error('Failed to upload resvg WASM to KV:', data.errors);
  process.exit(1);
}
console.log(`Uploaded resvg WASM to KV: ${wasm.length} bytes`);
