import { TokenResponse } from "./auth.js";
import keyStore from "../../../common/src/store/keyStore.js";
import authStore, {
  TBL_NM_AUTH_CODES,
} from "../../../common/src/store/authStore.js";
import store from "../../../common/src/store.js";
import { AccessToken } from "../../../common/src/oid4vci/types";

const TBL_NM_SESSIONS = "sessions";
const TBL_NM_XID_ACCESS_TOKENS = "xid_access_tokens";

/*
@startuml

entity pre_auth_codes {
  * id: int
  --
  * code: varchar(2048)
  * expired_in: integer
  * created_at: datetime
}

entity x_id_access_tokens {
  * id: int
  --
  * pre_auth_code_id <<FK>>
  * token: varchar(2048)
  * expired_in: integer
  * created_at: datetime
}

entity access_tokens {
  * id: int
  --
  * pre_auth_code_id <<FK>>
  * token: varchar(2048)
  * pre_auth_flow: boolean
  * expired_in: integer
  * created_at: datetime
}

entity c_nonces {
  * id: int
  --
  * access_token_id <<FK>>
  * nonce
  * expired_in
  * created_at
}

pre_auth_codes ||..o| x_id_access_tokens
pre_auth_codes ||..o| access_tokens
access_tokens ||..o{ c_nonces

entity ec_key_pairs {
  * kid: VARCHAR
  --
  * kty: VARCHAR
  * crv VARCHAR(40)
  * x VARCHAR(1024)
  * y VARCHAR(1024)
  * d VARCHAR(1024)
  * createdAt DATETIME
  * revokedAt DATETIME
}

entity x509_certificates {
  * kid: VARCHAR
  --
  * x509cert VARCHAR(4096)
  * createdAt DATETIME
}

ec_key_pairs ||..o{ x509_certificates

@enduml
*/

const DDL_SESSIONS = `
  CREATE TABLE ${TBL_NM_SESSIONS} (
    sessionId VARCHAR(36) UNIQUE,
    state VARCHAR(32),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    checkedAt DATETIME DEFAULT NULL
  )
`.trim();
const DDL_XID_ACCESS_TOKENS = `
  CREATE TABLE ${TBL_NM_XID_ACCESS_TOKENS} (
    token VARCHAR(2048) UNIQUE,
    expiresIn INTEGER,
    authorized_code_id INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorized_code_id) REFERENCES ${TBL_NM_AUTH_CODES}(id)
  )
`.trim();

const DDL_MAP = {
  [TBL_NM_SESSIONS]: DDL_SESSIONS,
  [TBL_NM_XID_ACCESS_TOKENS]: DDL_XID_ACCESS_TOKENS,
};

const createDb = async () => {
  await keyStore.createDb();
  await authStore.createDb();
  await store.createDb(DDL_MAP);
};
const destroyDb = async () => {
  await keyStore.destroyDb();
  await authStore.destroyDb();
  await store.destroyDb(DDL_MAP);
};

export const UNIQUE_CONSTRAINT_FAILED = "UNIQUE_CONSTRAINT_FAILED";

export interface Session {
  rowid: number;
  sessionId: string;
  state: string;
  createdAt: string;
  checkedAt: string;
}

export type XIDAccessToken = AccessToken;

const addSession = async (sessionId: string, state: string) => {
  try {
    const db = await store.openDb();
    return await db.run(
      `INSERT INTO ${TBL_NM_SESSIONS} (sessionId, state) VALUES (?, ?)`,
      sessionId,
      state,
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
const getSession = async (sessionId: string) => {
  try {
    const db = await store.openDb();
    return await db.get<Session>(
      `SELECT sessionId, state, createdAt, checkedAt FROM ${TBL_NM_SESSIONS} WHERE sessionId = ? ORDER BY createdAt DESC, rowid DESC`,
      sessionId,
    );
  } catch (err) {
    console.error(err);
    throw new Error("Failed to select data.");
  }
};

const updateSession = async (sessionId: string) => {
  try {
    const db = await store.openDb();
    await db.run(
      `UPDATE ${TBL_NM_SESSIONS} SET checkedAt = CURRENT_TIMESTAMP WHERE sessionId = ?`,
      sessionId,
    );
  } catch (err) {
    console.error(err);
    throw new Error("Failed to update data.");
  }
};

const addXIDAccessToken = async (
  tokenResponse: TokenResponse,
  preAuthorizedCodeId: number,
) => {
  const { access_token, expires_in } = tokenResponse;
  try {
    const db = await store.openDb();
    await db.run(
      `INSERT INTO ${TBL_NM_XID_ACCESS_TOKENS} (token, expiresIn, authorized_code_id) VALUES (?, ?, ?)`,
      access_token,
      expires_in,
      preAuthorizedCodeId,
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

interface JoinedPreAuthCode {
  authorized_code_id: number;
  code: string;
  codeExpiresIn: number;
  codeCreatedAt: string;
}
const getXIDAccessToken = async (
  preAuthorizedCode: string,
): Promise<XIDAccessToken | undefined> => {
  try {
    const db = await store.openDb();
    const row = await db.get<XIDAccessToken & JoinedPreAuthCode>(
      `SELECT 
         t1.token, 
         t1.expiresIn, 
         t1.createdAt, 
         t2.id AS authorized_code_id, 
         t2.code, 
         t2.expiresIn AS codeExpiresIn, 
         t2.createdAt AS codeCreatedAt 
       FROM ${TBL_NM_XID_ACCESS_TOKENS} AS t1
       LEFT JOIN ${TBL_NM_AUTH_CODES} AS t2 ON t1.authorized_code_id = t2.id
       WHERE t2.code = ? 
       ORDER BY t1.createdAt DESC, t1.rowid DESC`,
      preAuthorizedCode,
    );
    if (row) {
      return {
        token: row.token,
        expiresIn: row.expiresIn,
        createdAt: row.createdAt,
      };
    } else {
      return undefined;
    }
  } catch (err) {
    console.error(err);
    throw new Error("Failed to select data.");
  }
};

export default {
  createDb,
  destroyDb,
  addSession,
  updateSession,
  getSession,
  addXIDAccessToken,
  getXIDAccessToken,
};
