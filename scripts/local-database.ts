import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import type {Database,Statement} from '../server/database';
export function localDatabase(filename=':memory:'){
 const sqlite=new DatabaseSync(filename);
 sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort()){
  if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(name)){
   sqlite.exec('BEGIN');try{sqlite.exec(readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
  }
 }
 class LocalStatement implements Statement {
  constructor(private sql:string,private values:unknown[]=[]){ }
  bind(...values:unknown[]){return new LocalStatement(this.sql,values);}
  async first<T>(){return (sqlite.prepare(this.sql).get(...this.values as never[])??null) as T|null;}
  async all<T>(){return {results:sqlite.prepare(this.sql).all(...this.values as never[]) as T[]};}
  async run(){return sqlite.prepare(this.sql).run(...this.values as never[]);}
 }
 const db:Database={prepare:sql=>new LocalStatement(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {db,sqlite};
}
