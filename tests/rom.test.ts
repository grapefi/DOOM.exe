import {describe,it,expect} from 'vitest';
import {gzipSync} from 'node:zlib';
import {keccak256} from 'viem';
import {pack,unpack,split,decompressVerified,validateMeta,CHUNK_BYTES,type RomMeta} from '../shared/rom';
const wasm=Uint8Array.from([0,97,115,109,1,0,0,0]);
const wad=new Uint8Array(28);wad.set(new TextEncoder().encode('IWAD'));new DataView(wad.buffer).setUint32(4,1,true);new DataView(wad.buffer).setUint32(8,12,true);
function fixture(){const raw=pack(wasm,wad),zip=new Uint8Array(gzipSync(raw));const meta:RomMeta={version:1,compressedHash:keccak256(zip),rawHash:keccak256(raw),compressedSize:zip.length,rawSize:raw.length};return{raw,zip,meta};}
describe('ROM format and integrity',()=>{
 it('round-trips exact bytes through bounded gzip decompression',async()=>{const {zip,meta}=fixture();expect(await decompressVerified(zip,meta)).toEqual({wasm,wad});});
 it('rejects compressed corruption before decompression',async()=>{const {zip,meta}=fixture();zip[5]^=1;await expect(decompressVerified(zip,meta)).rejects.toThrow('integrity');});
 it('rejects a dishonest decompressed commitment',async()=>{const {zip,meta}=fixture();meta.rawHash=keccak256(new Uint8Array([1]));await expect(decompressVerified(zip,meta)).rejects.toThrow('integrity');});
 it('stops output larger than the declared size',async()=>{const {zip,meta}=fixture();meta.rawSize=16;await expect(decompressVerified(zip,meta)).rejects.toThrow('exceeds');});
 it('rejects truncated gzip even if compressed commitment matches',async()=>{const {zip,meta}=fixture();const short=zip.slice(0,-5);meta.compressedHash=keccak256(short);meta.compressedSize=short.length;await expect(decompressVerified(short,meta)).rejects.toThrow();});
 it('rejects trailing bytes and invalid WAD offsets',()=>{const {raw}=fixture();expect(()=>unpack(new Uint8Array([...raw,0]))).toThrow('boundaries');new DataView(raw.buffer).setUint32(16+8+8,999999,true);expect(()=>unpack(raw)).toThrow('directory');});
 it('rejects unknown codec/version and oversized metadata',()=>{const {meta}=fixture();expect(()=>validateMeta({...meta,version:2})).toThrow();expect(()=>validateMeta({...meta,rawSize:2**32})).toThrow();});
 it('splits at STOP-prefixed EIP-170 limits without losing bytes',()=>{const bytes=new Uint8Array(CHUNK_BYTES*2+1).map((_,i)=>i%251);const chunks=split(bytes);expect(chunks.map(c=>c.length)).toEqual([CHUNK_BYTES,CHUNK_BYTES,1]);expect(new Uint8Array(Buffer.concat(chunks))).toEqual(bytes);});
});
