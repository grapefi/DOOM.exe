import assert from 'node:assert/strict';
import {decodeChainPool,getChainPool} from '../shared/chainPool';
const now=Date.now(),seconds=BigInt(Math.floor(now/1000));
const hex=(n:bigint)=>n.toString(16).padStart(64,'0');
const fixture=(balance=2n*10n**18n,price=50100000000n,updated=seconds,paused=0n)=>[
 {id:1,result:'0x1237'},{id:2,result:'0x'+hex(balance)},{id:3,result:'0x12'},
 {id:4,result:'0x'+[1n,price,updated,updated,1n].map(hex).join('')},
 {id:5,result:'0x8'},{id:6,result:'0x'+hex(paused)},{id:7,result:{timestamp:'0x'+seconds.toString(16)}},
];
assert.equal(decodeChainPool(fixture(),now).usdValue,'1002.00');
assert.equal(decodeChainPool(fixture(10n**15n),now).usdValue,'0.50');
assert.equal(decodeChainPool(fixture(0n),now).usdValue,'0.00');
for(const rows of [fixture(2n,50100000000n,seconds-90000n),fixture(2n,50100000000n,seconds,1n),fixture(2n,2n**256n-1n)]){
 const data=decodeChainPool(rows,now);assert.equal(data.priceAvailable,false);assert.equal(data.usdValue,null);assert.notEqual(data.tokens,'0');
}
assert.throws(()=>decodeChainPool(fixture().map(r=>r.id===1?{id:1,result:'0x1'}:r),now));
assert.throws(()=>decodeChainPool(fixture().filter(r=>r.id!==2),now));
assert.throws(()=>decodeChainPool(fixture(),now+180000));
console.log('On-chain valuation, stale/paused/negative quotes, wrong network and missing balance checks passed.');
console.log('Live on-chain pool:',await getChainPool());
