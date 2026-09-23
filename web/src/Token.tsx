const tokenAddress='0x6619f44FED297b6b08A8219084a058F13B6F1E18';
const longUrl=`https://app.long.xyz/tokens/${tokenAddress}`;
const dexscreenerUrl='https://dexscreener.com/robinhood/0x10bcd457fa3ff4dfcc77a0bb836a6bbd1abf1447cc5012cb08ef7d338894cd00';

export function Token(){return <section className="token-section" aria-labelledby="token-title">
 <div className="token-copy"><p className="eyebrow">DOOM.EXE TOKEN // ROBINHOOD CHAIN</p><h2 id="token-title">FUEL FOR THE <em>ARENA.</em></h2><p>DOOM.exe (DOOMEXE) is paired with MSFT on Robinhood Chain. View the trading pair or open Long to trade.</p></div>
 <div className="token-details"><span>DOOM.EXE TOKEN ADDRESS</span><code>{tokenAddress}</code><div className="token-actions"><a className="token-buy" href={longUrl} target="_blank" rel="noopener noreferrer">TRADE ON LONG ↗</a><a href={dexscreenerUrl} target="_blank" rel="noopener noreferrer">VIEW ON DEXSCREENER ↗</a></div></div>
 </section>}
