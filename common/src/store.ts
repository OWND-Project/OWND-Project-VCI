import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

// https://github.com/kriasoft/node-sqlite
const openDb = (() => {
  // https://github.com/TryGhost/node-sqlite3/wiki/Caching
  let _db: Database;
  return async () => {
    if (!_db) {
      const filepath = process.env["DATABASE_FILEPATH"];
      if (typeof filepath === "undefined") {
        throw new Error("DATABASE_FILEPATH envvar not defined");
      }
      _db = await open({
        filename: filepath,
        driver: sqlite3.cached.Database,
      });
    }
    return _db;
  };
})();

const checkIfTableExists = async (table_name: string) => {
  try {
    const db = await openDb();
    const result = await db.get<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${table_name}';`,
    );
    return result?.name === table_name;
  } catch (err) {
    console.error(err);
    return false;
  }
};

type DDLMap = { [key: string]: string };
const createDb = async (ddlMap: DDLMap) => {
  const db = await openDb();
  for (const [key, value] of Object.entries(ddlMap)) {
    const b = await checkIfTableExists(key);
    if (!b) {
      console.debug(`create table ${key}`);
      await db.exec(value);
      console.debug("done");
    }
  }
};

const destroyDb = async (ddlMap: DDLMap) => {
  const db = await openDb();
  // eslint-disable-next-line no-unused-vars
  for (const [key, _] of Object.entries(ddlMap)) {
    const b = await checkIfTableExists(key);
    if (b) {
      console.debug(`drop table ${key}`);
      await db.exec(`DROP TABLE ${key}`);
      console.debug("done");
    }
  }
};

export const handleError = (err: any) => {
  console.error(err);
  if (err instanceof Error) {
    const { message } = err;
    if (message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed:")) {
      throw new Error("UNIQUE_CONSTRAINT_FAILED");
    }
  }
  throw err;
};

export const UNIQUE_CONSTRAINT_FAILED = "UNIQUE_CONSTRAINT_FAILED";
export const FOREIGN_KEY_CONSTRAINT_FAILED = "FOREIGN_KEY_CONSTRAINT_FAILED";

export default {
  createDb,
  destroyDb,
  openDb,
  handleError,
  checkIfTableExists,
};
