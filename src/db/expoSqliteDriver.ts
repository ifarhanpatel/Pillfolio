import * as SQLite from "expo-sqlite";

import type { SqlDriver, SqlParams } from "./driver";

const DEFAULT_DB_NAME = "pillfolio.db";

type AsyncDb = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: SqlParams) => Promise<void>;
  getAllAsync: <T>(sql: string, params?: SqlParams) => Promise<T[]>;
  getFirstAsync: <T>(sql: string, params?: SqlParams) => Promise<T | null>;
};

type SyncDb = {
  transaction: (fn: (tx: SyncTx) => void) => void;
};

type SyncTx = {
  executeSql: (
    sql: string,
    params: SqlParams | undefined,
    onSuccess?: (_tx: SyncTx, result: { rows: { _array: unknown[] } }) => void,
    onError?: (_tx: SyncTx, error: Error) => void
  ) => void;
};

const isAsyncDb = (db: unknown): db is AsyncDb => {
  return (
    typeof (db as AsyncDb).execAsync === "function" &&
    typeof (db as AsyncDb).runAsync === "function"
  );
};

const openDatabase = async (name: string): Promise<AsyncDb | SyncDb> => {
  const anySQLite = SQLite as unknown as {
    openDatabaseAsync?: (dbName: string) => Promise<AsyncDb>;
    openDatabase: (dbName: string) => SyncDb;
  };

  if (typeof anySQLite.openDatabaseAsync === "function") {
    return anySQLite.openDatabaseAsync(name);
  }

  return anySQLite.openDatabase(name);
};

const runInTransaction = <T>(
  db: SyncDb,
  sql: string,
  params: SqlParams | undefined,
  transform: (rows: { _array: unknown[] }) => T
): Promise<T> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_tx, result) => resolve(transform(result.rows)),
        (_tx, error) => {
          reject(error);
          return true as unknown as boolean;
        }
      );
    });
  });
};

export const createExpoSqliteDriver = async (
  name: string = DEFAULT_DB_NAME
): Promise<SqlDriver> => {
  const db = await openDatabase(name);

  if (isAsyncDb(db)) {
    return {
      execBatchAsync: async (statements) => {
        for (const statement of statements) {
          await db.execAsync(statement);
        }
      },
      runAsync: async (sql, params) => {
        await db.runAsync(sql, params);
      },
      getAllAsync: async (sql, params) => {
        return db.getAllAsync(sql, params);
      },
      getFirstAsync: async (sql, params) => {
        return db.getFirstAsync(sql, params);
      },
    };
  }

  return {
    execBatchAsync: async (statements) => {
      for (const statement of statements) {
        await runInTransaction(db, statement, [], () => undefined);
      }
    },
    runAsync: async (sql, params) => {
      await runInTransaction(db, sql, params, () => undefined);
    },
    getAllAsync: async <T>(sql: string, params?: SqlParams) => {
      return runInTransaction(db, sql, params, (rows) => rows._array as T[]);
    },
    getFirstAsync: async <T>(sql: string, params?: SqlParams) => {
      const result = await runInTransaction(db, sql, params, (rows) => rows._array);
      return (result[0] as T) ?? null;
    },
  };
};
