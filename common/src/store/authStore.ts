import { Identifiable, AuthorizedCode, VCIAccessToken } from "../oid4vci/types";
import store, { handleError, UNIQUE_CONSTRAINT_FAILED } from "../store.js";
/*
@startuml

entity auth_codes {
  * id int
  --
  * code string
  * pre_auth_flow boolean
  * pin string
  * needs_proof boolean
  * expired_in number
  * created_at datetime
  * used_at datetime
}

entity access_tokens {
  * id number
  --
  * auth_code_id number <<FK>>
  * token string
  * expired_in number
  * created_at datetime
}

entity c_nonces {
  * id number
  --
  * access_token_id number <<FK>>
  * nonce string
  * expired_in number
  * created_at datetime
}

package service_specific {
  abstract subject ##[dashed]
  abstract auth_codes_subject_rel ##[dashed]
  note top of subject: `subject` is entity \n defined by each vci system
}

auth_codes ||..o| access_tokens
access_tokens ||..o{ c_nonces

auth_codes ||..|{ auth_codes_subject_rel
subject ||..|{ auth_codes_subject_rel

@enduml
*/
export const TBL_NM_AUTH_CODES = "auth_codes";
export const TBL_NM_ACCESS_TOKENS = "access_tokens";
export const TBL_NM_C_NONCES = "c_nonces";

const DDL_AUTH_CODES = `
  CREATE TABLE ${TBL_NM_AUTH_CODES} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(32),
    expiresIn INTEGER,
    preAuthFlow BOOLEAN,
    userPin VARCHAR(8),
    needsProof BOOLEAN,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    usedAt DATETIME DEFAULT NULL
  )
`.trim();
const DDL_ACCESS_TOKENS = `
  CREATE TABLE ${TBL_NM_ACCESS_TOKENS} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(2048) UNIQUE,
    expiresIn INTEGER,
    authorized_code_id INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorized_code_id) REFERENCES ${TBL_NM_AUTH_CODES}(id)
  )
`.trim();
const DDL_C_NONCES = `
  CREATE TABLE ${TBL_NM_C_NONCES} (
  access_token_id INTEGER NOT NULL,
  nonce TEXT NOT NULL,
  expired_in INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (access_token_id) REFERENCES ${TBL_NM_ACCESS_TOKENS}(id)
  )
`.trim();

const DDL_MAP = {
  [TBL_NM_AUTH_CODES]: DDL_AUTH_CODES,
  [TBL_NM_ACCESS_TOKENS]: DDL_ACCESS_TOKENS,
  [TBL_NM_C_NONCES]: DDL_C_NONCES,
};

export const createDb = async () => {
  await store.createDb(DDL_MAP);
};
export const destroyDb = async () => {
  await store.destroyDb(DDL_MAP);
};
interface JoinedAuthCode {
  authorized_code_id: number;
  code: string;
  userPin: string;
  needsProof: boolean;
  preAuthFlow: boolean;
  codeExpiresIn: number;
  codeCreatedAt: string;
  usedAt: string;
}
export const addAuthCode = async (
  code: string,
  expiresIn: number,
  preAuthFlow: boolean,
  userPin: string,
  needsProof: boolean,
) => {
  try {
    const db = await store.openDb();
    const result = await db.run(
      `INSERT INTO ${TBL_NM_AUTH_CODES} (code, expiresIn, preAuthFlow, userPin, needsProof) VALUES (?, ?, ?, ?, ?)`,
      code,
      expiresIn,
      preAuthFlow,
      userPin,
      needsProof,
    );
    return result.lastID!;
  } catch (err) {
    handleError(err);
  }
};

export const getAuthCode = async (code: string) => {
  try {
    const db = await store.openDb();
    const result = await db.get<AuthorizedCode>(
      `SELECT id, code, expiresIn, preAuthFlow, userPin, needsProof, createdAt, usedAt FROM ${TBL_NM_AUTH_CODES} WHERE code = ?`,
      code,
    );
    if (result) {
      return result;
    } else {
      return undefined;
    }
  } catch (err) {
    handleError(err);
  }
};

export const updateAuthCode = async (id: number) => {
  try {
    const db = await store.openDb();
    await db.run(
      `UPDATE ${TBL_NM_AUTH_CODES} SET usedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      id,
    );
  } catch (err) {
    handleError(err);
  }
};

export const addAccessToken = async (
  accessToken: string,
  expiresIn: number,
  cNonce: string,
  cNonceExpiresIn: number,
  authorizedCodeId: number,
) => {
  try {
    const db = await store.openDb();
    let result = await db.run(
      `INSERT INTO ${TBL_NM_ACCESS_TOKENS} (token, expiresIn, authorized_code_id) VALUES (?, ?, ?)`,
      accessToken,
      expiresIn,
      authorizedCodeId,
    );
    const accessTokenId = result.lastID; // 最後に挿入されたレコードのIDを取得

    return await db.run(
      `INSERT INTO ${TBL_NM_C_NONCES} (access_token_id, nonce, expired_in) VALUES (?, ?, ?)`,
      accessTokenId,
      cNonce,
      cNonceExpiresIn,
    );
  } catch (err) {
    handleError(err);
  }
};

export type StoredAccessToken = {
  authorizedCode: AuthorizedCode & Identifiable;
} & VCIAccessToken &
  Identifiable;

export const getAccessToken = async (
  accessToken: string,
): Promise<StoredAccessToken | undefined> => {
  try {
    const db = await store.openDb();
    const row = await db.get<VCIAccessToken & Identifiable & JoinedAuthCode>(
      `
      SELECT 
        a.id,
        a.token, 
        a.expiresIn, 
        a.authorized_code_id,
        p.code, 
        p.expiresIn AS codeExpiresIn, 
        p.createdAt AS codeCreatedAt,
        p.userPin,
        p.needsProof,
        p.preAuthFlow,
        c.nonce as cNonce, 
        c.expired_in as cNonceExpiresIn,
        c.createdAt as cNonceCreatedAt, 
        a.createdAt 
      FROM ${TBL_NM_ACCESS_TOKENS} as a
      LEFT JOIN ${TBL_NM_AUTH_CODES} AS p ON a.authorized_code_id = p.id
      LEFT JOIN (
        SELECT *, MAX(createdAt) as MaxCreatedAt FROM ${TBL_NM_C_NONCES} GROUP BY access_token_id
      ) as c_max ON a.id = c_max.access_token_id
      LEFT JOIN ${TBL_NM_C_NONCES} as c ON c.access_token_id = a.id AND c.createdAt = c_max.MaxCreatedAt
      WHERE a.token = ? 
      ORDER BY a.createdAt DESC, a.rowid DESC
      `,
      accessToken,
    );
    if (row) {
      return {
        ...row,
        authorizedCode: {
          id: row.authorized_code_id,
          code: row.code,
          expiresIn: row.codeExpiresIn,
          userPin: row.userPin,
          needsProof: row.needsProof,
          preAuthFlow: row.preAuthFlow,
          isUsed: row.usedAt !== null,
          createdAt: row.codeCreatedAt,
        },
      };
    } else {
      return undefined;
    }
  } catch (err) {
    handleError(err);
  }
};

export const refreshNonce = async (
  accessTokenId: number,
  cNonce: string,
  expiresIn: number,
) => {
  try {
    const db = await store.openDb();

    return await db.run(
      `INSERT INTO ${TBL_NM_C_NONCES} (access_token_id, nonce, expired_in) VALUES (?, ?, ?)`,
      accessTokenId,
      cNonce,
      expiresIn,
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

export default {
  createDb,
  destroyDb,
  addAuthCode,
  updateAuthCode,
  getAuthCode,
  addAccessToken,
  getAccessToken,
  refreshNonce,
};
