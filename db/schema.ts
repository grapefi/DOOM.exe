import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const runs=sqliteTable('runs',{
 id:text('id').primaryKey(),
 startedAt:integer('started_at').notNull(),
 outcome:text('outcome').notNull().default('running'),
 elapsedMs:integer('elapsed_ms'),
 finishedAt:integer('finished_at'),
 playerName:text('player_name'),
 walletAddress:text('wallet_address'),
},table=>[
 index('runs_ranking').on(table.outcome,table.elapsedMs,table.finishedAt),
 index('runs_started').on(table.startedAt),
]);
