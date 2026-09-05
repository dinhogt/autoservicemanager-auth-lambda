import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { ClienteRow, DbConfig } from './types';

export type FindClienteByCpf = (
  cpfDigits: string,
) => Promise<ClienteRow | null>;

export function createFindClienteByCpf(db: DbConfig): FindClienteByCpf {
  return async (cpfDigits: string): Promise<ClienteRow | null> => {
    const conn = await mysql.createConnection({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      connectTimeout: 3000,
    });
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, cpfCnpj, ativo FROM Cliente WHERE cpfCnpj = ? LIMIT 1',
        [cpfDigits],
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return {
        id: String(row.id),
        cpfCnpj: String(row.cpfCnpj),
        ativo: Boolean(row.ativo),
      };
    } finally {
      await conn.end();
    }
  };
}
