export interface Statement {
 bind(...values:unknown[]):Statement;
 first<T>():Promise<T|null>;
 all<T>():Promise<{results:T[]}>;
 run():Promise<unknown>;
}
export interface Database {prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown>}
export type Env={DB:Database;ASSETS:{fetch(request:Request):Promise<Response>}};
export function database(env:Env){if(!env.DB)throw new Error('Leaderboard database is unavailable');return env.DB;}
