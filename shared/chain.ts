import { defineChain, parseAbi } from 'viem';
export const chain = defineChain({ id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } }, blockExplorers: { default: { name: 'Robinhood Chain Explorer', url: 'https://robinhoodchain.blockscout.com' } } });
export const manifestAbi = parseAbi([
  'function VERSION() view returns (uint256)', 'function compressedHash() view returns (bytes32)', 'function rawHash() view returns (bytes32)',
  'function compressedSize() view returns (uint256)', 'function rawSize() view returns (uint256)',
  'function chunkCount() view returns (uint256)', 'function chunks(uint256) view returns (address)'
]);
