// Type stub for Node 22 experimental built-in `node:sqlite`.
// The real module has no @types/node declarations yet; this satisfies
// the TypeScript compiler. local-d1.ts only runs in dev, never on Cloudflare.
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean });
    open(): void;
    close(): void;
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
  }

  export interface StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }
}
