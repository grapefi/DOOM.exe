import { readFile, mkdir, writeFile } from 'node:fs/promises';
// Solidity standard JSON compiler
import solc from 'solc';
export async function compile() {
  const sources = Object.fromEntries(await Promise.all(['DataChunk','RomManifest'].map(async name => [`${name}.sol`, { content: await readFile(`contracts/${name}.sol`, 'utf8') }])));
  const input = { language: 'Solidity', sources, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((e: {severity:string}) => e.severity === 'error');
  if(errors?.length) throw new Error(JSON.stringify(errors));
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/solc-input.json', JSON.stringify(input, null, 2));
  const artifacts: Record<string, {abi: any; bytecode: `0x${string}`}> = {};
  for(const name of ['DataChunk','RomManifest']) { const c = output.contracts[`${name}.sol`][name]; artifacts[name] = { abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` }; await writeFile(`artifacts/${name}.json`, JSON.stringify(artifacts[name],null,2)); }
  return artifacts;
}
if(process.argv[1]?.endsWith('compile.ts')) { await compile(); console.log('Compiled Solidity 0.8.30 / Paris'); }
