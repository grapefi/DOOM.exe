import {formatTime} from '../../shared/round';
const playUrl='https://doomexe.online/';
export function roundShareUrl(elapsedMs?:number,name?:string){
 const text=elapsedMs===undefined
  ?'24 hostiles. One way out. Play DOOM CHAIN in your browser and challenge the fastest finishers. Can you take the top spot?'
  :name
   ?`${name} escaped DOOM CHAIN in ${formatTime(elapsedMs)}. Think you can beat that time? Play the arena and join the leaderboard.`
   :`I escaped DOOM CHAIN in ${formatTime(elapsedMs)}. Think you can beat my time? Play the arena and join the leaderboard.`;
 return 'https://twitter.com/intent/tweet?'+new URLSearchParams({text,url:playUrl,hashtags:'DOOMCHAIN'}).toString();
}
export function ShareRound({elapsedMs,name,compact=false}:{elapsedMs?:number;name?:string;compact?:boolean}){
 return <a className={'share-round'+(compact?' compact':'')} href={roundShareUrl(elapsedMs,name)} target="_blank" rel="noopener noreferrer" aria-label={name?`Share ${name}'s ${formatTime(elapsedMs!)} round on X (Twitter)`:'Share on X (Twitter)'}>{compact?'SHARE ↗':'SHARE ON X ↗'}</a>;
}
