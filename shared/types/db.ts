/**
 * DbOrTx — the shared type for a transaction-threading parameter (C110).
 *
 * Many persistence-layer methods accept an optional `dbTransaction` so callers
 * can thread a single week transaction through every write. Historically these
 * were typed `dbTransaction?: any`, which gave the compiler no way to catch a
 * dropped or misplaced transaction (the gap that once let `storage.updateProject`
 * silently drop a tx argument). `DbOrTx` replaces that `any`.
 *
 * LAYERING: this lives in `shared/` and MUST import only from `drizzle-orm`
 * (types) and the shared schema — never from `server/` (e.g. `server/db`). The
 * concrete `db` instance is `drizzle(pool, { schema })` from
 * `drizzle-orm/node-postgres`, so its type is `NodePgDatabase<typeof schema>`.
 *
 * The transaction handle (`tx` in `db.transaction(async (tx) => { ... })`) is a
 * `PgTransaction` whose exact generics are awkward to spell by hand. Rather than
 * hard-code them, we DERIVE the tx type from the `transaction` method's own
 * callback signature, so both the db instance AND a real `tx` are assignable to
 * `DbOrTx` and the type stays correct across drizzle upgrades.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@shared/schema';

/** The concrete Drizzle database instance type (node-postgres adapter). */
export type Database = NodePgDatabase<typeof schema>;

/**
 * The transaction handle passed to `db.transaction((tx) => ...)`, derived from
 * the `transaction` method's callback parameter so the generics always match.
 */
export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Either the root database instance or an in-flight transaction handle. Use for
 * any optional `dbTransaction?` parameter that threads a week transaction.
 */
export type DbOrTx = Database | DbTransaction;
