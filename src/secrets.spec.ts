import { parseMysqlUrl } from './secrets';

describe('parseMysqlUrl', () => {
  it('parseia connection string', () => {
    expect(
      parseMysqlUrl('mysql://app:s%40cret@db.example:3307/autoservicemanager'),
    ).toEqual({
      host: 'db.example',
      port: 3307,
      user: 'app',
      password: 's@cret',
      database: 'autoservicemanager',
    });
  });

  it('rejeita scheme inválido', () => {
    expect(() => parseMysqlUrl('postgres://x')).toThrow(/mysql/);
  });
});
