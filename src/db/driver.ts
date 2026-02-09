export type SqlParams = unknown[];

export interface SqlDriver {
  runAsync(sql: string, params?: SqlParams): Promise<void>;
  getFirstAsync<T>(sql: string, params?: SqlParams): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: SqlParams): Promise<T[]>;
  execBatchAsync(statements: string[]): Promise<void>;
}
