/**
 * Build-environment fallback only.
 *
 * `npm run db:generate` replaces this file with the real Prisma Client.
 * It exists so the deterministic in-memory mode can still be linted and built
 * in restricted environments that cannot reach Prisma's engine CDN.
 */
export namespace Prisma {
  export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
  export type InputJsonValue = string | number | boolean | InputJsonValue[] | { [key: string]: InputJsonValue };
  export type TransactionClient = PrismaClient;
}

export class PrismaClient {
  [key: string]: any;
  constructor(..._args: any[]) {}
  async $disconnect(): Promise<void> {}
}
