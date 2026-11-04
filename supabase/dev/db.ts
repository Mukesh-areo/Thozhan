// Local stand-in for the Supabase database: PGlite (Postgres in WebAssembly) with the real
// migrations applied, and an RPC caller that behaves like PostgREST: it switches to the
// caller's API role and JWT claims for the call, so grants and auth.uid() work as on Supabase.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(ROOT + path, 'utf8');

export type Role = 'anon' | 'authenticated' | 'service_role';

export interface Caller {
  role: Role;
  claims?: Record<string, unknown>;
}

export class RpcError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface Database {
  pg: PGlite;
  rpc<T = unknown>(fn: string, args: Record<string, unknown>, caller: Caller): Promise<T>;
}

export async function createDatabase(options: { dataDir?: string; seed?: boolean } = {}): Promise<Database> {
  const pg = new PGlite(options.dataDir);
  await pg.waitReady;
  const fresh = !(await pg.query(`select 1 from pg_namespace where nspname = 'auth'`)).rows.length;
  if (fresh) {
    await pg.exec(read('dev/bootstrap.sql'));
    for (const file of readdirSync(ROOT + 'migrations').sort()) {
      const sql = read('migrations/' + file);
      if (!sql.startsWith('-- supabase-only')) await pg.exec(sql);
    }
    if (options.seed) await pg.exec(read('seed.sql'));
  }

  const signatures = new Map<string, Map<string, string>>();
  async function argTypes(fn: string): Promise<Map<string, string>> {
    let types = signatures.get(fn);
    if (!types) {
      const { rows } = await pg.query<{ name: string; type: string }>(
        `select unnest(p.proargnames) as name, unnest(p.proargtypes::regtype[])::text as type
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`,
        [fn],
      );
      if (!rows.length && !(await pg.query(`select 1 from pg_proc where proname = $1`, [fn])).rows.length) {
        throw new RpcError(`function ${fn} not found`, 'PGRST202', 404);
      }
      types = new Map(rows.map((r) => [r.name, r.type]));
      signatures.set(fn, types);
    }
    return types;
  }

  async function rpc<T>(fn: string, args: Record<string, unknown>, caller: Caller): Promise<T> {
    if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw new RpcError('bad function name', 'PGRST202', 404);
    const types = await argTypes(fn);
    const names = Object.keys(args);
    const values = names.map((name) => {
      const type = types.get(name);
      if (!type || !/^[a-z_][a-z0-9_]*$/.test(name)) throw new RpcError(`unknown argument ${name} for ${fn}`, 'PGRST202', 404);
      const v = args[name];
      if (v === null || v === undefined) return null;
      return type === 'jsonb' || type === 'json' ? JSON.stringify(v) : v;
    });
    const params = names.map((name, i) => `"${name}" := $${i + 1}::${types.get(name)}`).join(', ');
    try {
      return await pg.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(caller.claims ?? { role: caller.role })]);
        await tx.exec(`set local role ${caller.role}`);
        const { rows } = await tx.query<{ result: T }>(`select "${fn}"(${params}) as result`, values);
        return rows[0]!.result;
      });
    } catch (e) {
      if (e instanceof RpcError) throw e;
      const err = e as { message: string; code?: string };
      // PostgREST maps permission errors to 401/403; everything else raised in SQL is a 400.
      const status = err.code === '42501' ? (caller.role === 'anon' ? 401 : 403) : 400;
      throw new RpcError(err.message, err.code ?? 'P0001', status);
    }
  }

  return { pg, rpc };
}
