import { keccak256, type Hex } from 'viem';
export const CHUNK_BYTES = 24_575;
export const MAX_RAW = 64 * 1024 * 1024;
export const MAX_COMPRESSED = CHUNK_BYTES * 1024;
export type RomMeta = { version: 1; compressedHash: Hex; rawHash: Hex; compressedSize: number; rawSize: number };
const MAGIC = new TextEncoder().encode('DEXEROM1');
export function pack(wasm: Uint8Array, wad: Uint8Array): Uint8Array {
  const raw = new Uint8Array(16 + wasm.length + wad.length);
  raw.set(MAGIC); const view = new DataView(raw.buffer);
  view.setUint32(8, wasm.length, true); view.setUint32(12, wad.length, true);
  raw.set(wasm, 16); raw.set(wad, 16 + wasm.length); unpack(raw); return raw;
}
export function unpack(raw: Uint8Array) {
  if (raw.length < 16 || raw.length > MAX_RAW || !MAGIC.every((v, i) => v === raw[i])) throw new Error('Invalid ROM header or size');
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const wasmSize = view.getUint32(8, true), wadSize = view.getUint32(12, true);
  if (wasmSize < 8 || wadSize < 12 || 16 + wasmSize + wadSize !== raw.length) throw new Error('Invalid ROM file boundaries');
  const wasm = raw.slice(16, 16 + wasmSize), wad = raw.slice(16 + wasmSize);
  if (![0,97,115,109,1,0,0,0].every((v,i) => wasm[i] === v)) throw new Error('Invalid WASM');
  if (new TextDecoder().decode(wad.subarray(0,4)) !== 'IWAD') throw new Error('A standalone IWAD is required');
  const w = new DataView(wad.buffer, wad.byteOffset, wad.byteLength), count = w.getUint32(4,true), dir = w.getUint32(8,true);
  if (!count || count > 100_000 || dir < 12 || dir + count * 16 > wad.length) throw new Error('Invalid WAD directory');
  for(let i=0;i<count;i++) { const p=dir+i*16; if(w.getUint32(p,true)+w.getUint32(p+4,true)>wad.length) throw new Error('Invalid WAD lump'); }
  return { wasm, wad };
}
export function validateMeta(value: unknown): asserts value is RomMeta {
  const m = value as RomMeta;
  if (!m || m.version !== 1 || !/^0x[0-9a-fA-F]{64}$/.test(m.compressedHash) || !/^0x[0-9a-fA-F]{64}$/.test(m.rawHash) || !Number.isSafeInteger(m.compressedSize) || m.compressedSize < 1 || m.compressedSize > MAX_COMPRESSED || !Number.isSafeInteger(m.rawSize) || m.rawSize < 16 || m.rawSize > MAX_RAW) throw new Error('Unsupported ROM metadata');
}
export function checkHash(bytes: Uint8Array, expected: Hex, size: number) {
  if (bytes.length !== size || keccak256(bytes).toLowerCase() !== expected.toLowerCase()) throw new Error('ROM integrity check failed');
}
export async function decompressVerified(compressed: Uint8Array, meta: RomMeta) {
  validateMeta(meta); checkHash(compressed, meta.compressedHash, meta.compressedSize);
  const stream = new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader(); const raw = new Uint8Array(meta.rawSize); let length = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; if (length + value.length > raw.length) throw new Error('Decompressed ROM exceeds declared size'); raw.set(value, length); length += value.length; } }
  finally { await reader.cancel(); }
  if(length !== raw.length) throw new Error('Truncated decompressed ROM');
  checkHash(raw, meta.rawHash, meta.rawSize); return unpack(raw);
}
export function split(bytes: Uint8Array) { return Array.from({ length: Math.ceil(bytes.length / CHUNK_BYTES) }, (_,i) => bytes.slice(i * CHUNK_BYTES, (i+1)*CHUNK_BYTES)); }
