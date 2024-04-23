import { PrivateJwk } from "elliptic-jwk";
import store, {
  FOREIGN_KEY_CONSTRAINT_FAILED,
  UNIQUE_CONSTRAINT_FAILED,
} from "../store";
/*
@startuml

entity ec_key_pairs {
  * kid string
  --
  * kty: string
  * crv string
  * x string
  * y string
  * d string
  * createdAt datetime
  * revokedAt datetime
}

entity x509_certificates {
  * kid number <<FK>>
  --
  * x509cert string
  * createdAt datetime
}

ec_key_pairs ||..o{ x509_certificates

@enduml
*/
export const TBL_NM_EC_KEY_PAIRS = "ec_key_pairs";
export const TBL_NM_EC_KEY_X509_CERTIFICATE = "ec_key_x509_certificate";

const DDL_EC_KEY_PAIRS = `
  CREATE TABLE ${TBL_NM_EC_KEY_PAIRS} (
    kid VARCHAR(80) UNIQUE,
    kty VARCHAR(40),
    crv VARCHAR(40),
    x VARCHAR(1024),
    y VARCHAR(1024),
    d VARCHAR(1024),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    revokedAt DATETIME DEFAULT NULL
  )
`.trim();

const DDL_EC_KEY_X509_CERTIFICATE = `
  CREATE TABLE ${TBL_NM_EC_KEY_X509_CERTIFICATE} (
    kid VARCHAR(80),
    x509cert VARCHAR(8192),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kid) references ${TBL_NM_EC_KEY_PAIRS}(kid)
  )
`.trim();

const DDL_MAP = {
  [TBL_NM_EC_KEY_PAIRS]: DDL_EC_KEY_PAIRS,
  [TBL_NM_EC_KEY_X509_CERTIFICATE]: DDL_EC_KEY_X509_CERTIFICATE,
};

export const createDb = async () => {
  await store.createDb(DDL_MAP);
};
export const destroyDb = async () => {
  await store.destroyDb(DDL_MAP);
};
export interface ECKeyPair extends PrivateJwk {
  kid: string;
  createdAt: string;
  revokedAt: string;
}
type NewECKeyPair = Omit<ECKeyPair, "createdAt" | "revokedAt">;

export const insertECKeyPair = async (keyPair: NewECKeyPair) => {
  try {
    const { kid, kty, crv, x, y, d } = keyPair;
    const db = await store.openDb();
    return await db.run(
      `INSERT INTO ${TBL_NM_EC_KEY_PAIRS} (kid, kty, crv, x, y, d) VALUES (?, ?, ?, ?, ?, ?)`,
      kid,
      kty,
      crv,
      x,
      y,
      d,
    );
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { message } = err;
      if (message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed:")) {
        throw new Error(UNIQUE_CONSTRAINT_FAILED);
      }
    }
    throw err;
  }
};

export const insertEcKeyX509Certificate = async (
  kid: string,
  x509cert: string,
) => {
  try {
    const db = await store.openDb();
    return await db.run(
      `INSERT INTO ${TBL_NM_EC_KEY_X509_CERTIFICATE} (kid, x509cert) VALUES (?, ?)`,
      kid,
      x509cert,
    );
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { message } = err;
      if (message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed:")) {
        throw new Error(UNIQUE_CONSTRAINT_FAILED);
      }
      if (message.includes("SQLITE_CONSTRAINT_FOREIGNKEY: ")) {
        throw new Error(FOREIGN_KEY_CONSTRAINT_FAILED);
      }
    }
    throw err;
  }
};

export const revokeECKeyPair = async (kid: string) => {
  try {
    const db = await store.openDb();
    return db.run(
      `UPDATE ${TBL_NM_EC_KEY_PAIRS} SET revokedAt = CURRENT_TIMESTAMP WHERE kid = ?`,
      kid,
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getEcKeyPair = async (kid: string) => {
  try {
    const db = await store.openDb();
    return await db.get<ECKeyPair>(
      `SELECT rowid, kid, kty, crv, x, y, d, createdAt, revokedAt FROM ${TBL_NM_EC_KEY_PAIRS} WHERE kid = ? ORDER BY createdAt DESC, rowid DESC`,
      kid,
    );
  } catch (err) {
    console.error(err);
    throw new Error("Failed to select data.");
  }
};

export const getX509Chain = async (kid: string) => {
  try {
    const db = await store.openDb();
    const row = await db.get<{ x509cert: string }>(
      `SELECT x509cert FROM ${TBL_NM_EC_KEY_X509_CERTIFICATE} WHERE kid = ?`,
      kid,
    );
    return JSON.parse(row?.x509cert || "[]");
  } catch (err) {
    console.error(err);
    throw new Error("Failed to select data.");
  }
};

export const getLatestKeyPair = async () => {
  try {
    const db = await store.openDb();

    const sql = `
      SELECT pairs.*, cert.x509cert
      FROM ${TBL_NM_EC_KEY_PAIRS} AS pairs
      LEFT JOIN ${TBL_NM_EC_KEY_X509_CERTIFICATE} AS cert ON pairs.kid = cert.kid
      WHERE pairs.revokedAt IS NULL
      ORDER BY pairs.createdAt DESC
      LIMIT 1;
    `;
    return await db.get<ECKeyPair & { x509cert?: string }>(sql);
  } catch (err) {
    console.error(err);
    throw new Error("Failed to get latest key pair and certificate.");
  }
};

export default {
  createDb,
  destroyDb,
  insertECKeyPair,
  getEcKeyPair,
  insertEcKeyX509Certificate,
  getLatestKeyPair,
  revokeECKeyPair,
  getX509Chain,
};
