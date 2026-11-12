import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class PgPool implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://matricula:matricula@localhost:5432/matricula',
    max: Number(process.env.PG_POOL_MAX ?? 10),
  });

  onModuleDestroy(): Promise<void> {
    return this.pool.end();
  }
}
