import * as SQLite from "expo-sqlite";

import type { SqlDriver, SqlParams } from "./driver";

const DEFAULT_DB_NAME = "pillfolio.db";
const SQL_PREVIEW_MAX = 120;

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

const normalizeParams = (params?: SqlParams): SqlParams => params ?? [];

const logSqlite = (stage: string, details?: Record<string, unknown>) => {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.log(`[SQLiteDriver] ${stage}`, details);
    return;
  }

  console.log(`[SQLiteDriver] ${stage}`);
};

const previewSql = (sql: string): string =>
  sql.replace(/\s+/g, " ").trim().slice(0, SQL_PREVIEW_MAX);

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
  logSqlite("open-db:start", { name });
  const db = await openDatabase(name);
  logSqlite("open-db:success", { mode: isAsyncDb(db) ? "async" : "sync" });

  if (isAsyncDb(db)) {
    return {
      execBatchAsync: async (statements) => {
        logSqlite("execBatchAsync:start", { count: statements.length });
        for (const statement of statements) {
          logSqlite("execBatchAsync:statement", { sql: previewSql(statement) });
          await db.execAsync(statement);
        }
        logSqlite("execBatchAsync:done");
      },
      runAsync: async (sql, params) => {
        const safeParams = normalizeParams(params);
        logSqlite("runAsync:start", { sql: previewSql(sql), paramsCount: safeParams.length });
        if (safeParams.length === 0) {
          await db.execAsync(sql);
        } else {
          await db.runAsync(sql, safeParams);
        }
        logSqlite("runAsync:done");
      },
      getAllAsync: async (sql, params) => {
        const safeParams = normalizeParams(params);
        logSqlite("getAllAsync:start", { sql: previewSql(sql), paramsCount: safeParams.length });
        const rows = await db.getAllAsync(sql, safeParams);
        logSqlite("getAllAsync:done", { rows: rows.length });
        return rows;
      },
      getFirstAsync: async (sql, params) => {
        const safeParams = normalizeParams(params);
        logSqlite("getFirstAsync:start", {
          sql: previewSql(sql),
          paramsCount: safeParams.length,
        });
        const row = await db.getFirstAsync(sql, safeParams);
        logSqlite("getFirstAsync:done", { found: row !== null });
        return row;
      },
    };
  }

  return {
    execBatchAsync: async (statements) => {
      logSqlite("execBatchAsync:start", { count: statements.length });
      for (const statement of statements) {
        logSqlite("execBatchAsync:statement", { sql: previewSql(statement) });
        await runInTransaction(db, statement, [], () => undefined);
      }
      logSqlite("execBatchAsync:done");
    },
    runAsync: async (sql, params) => {
      const safeParams = normalizeParams(params);
      logSqlite("runAsync:start", { sql: previewSql(sql), paramsCount: safeParams.length });
      await runInTransaction(db, sql, safeParams, () => undefined);
      logSqlite("runAsync:done");
    },
    getAllAsync: async <T>(sql: string, params?: SqlParams) => {
      const safeParams = normalizeParams(params);
      logSqlite("getAllAsync:start", { sql: previewSql(sql), paramsCount: safeParams.length });
      const rows = await runInTransaction(db, sql, safeParams, (resultRows) => resultRows._array as T[]);
      logSqlite("getAllAsync:done", { rows: rows.length });
      return rows;
    },
    getFirstAsync: async <T>(sql: string, params?: SqlParams) => {
      const safeParams = normalizeParams(params);
      logSqlite("getFirstAsync:start", { sql: previewSql(sql), paramsCount: safeParams.length });
      const result = await runInTransaction(db, sql, safeParams, (rows) => rows._array);
      logSqlite("getFirstAsync:done", { found: result.length > 0 });
      return (result[0] as T) ?? null;
    },
  };
};
