import store from "ownd-vci/dist/store.js";
import keyStore from "ownd-vci/dist/store/keyStore.js";
import authStore, {
  StoredAccessToken,
  TBL_NM_AUTH_CODES,
} from "ownd-vci/dist/store/authStore.js";
import { AuthorizedCode, Identifiable } from "ownd-vci/dist/oid4vci/types.js";

/*
@startuml

@enduml
*/

export interface Conference {
  id: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  url: string;
  organizerName: string;
  organizerUrl: string;
}
export type NewConference = Omit<Conference, "id">;

const TBL_NM_CONFERENCES = "conferences";
const TBL_NM_AUTH_CODES_CONFERENCES = "auth_codes_conferences";

const DDL_CONFERENCES = `
  CREATE TABLE ${TBL_NM_CONFERENCES} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255),
    description VARCHAR(4096),
    location VARCHAR(512),
    startDate DATETIME,
    endDate DATETIME,
    url VARCHAR(2048),
    organizerName VARCHAR(255),
    organizerUrl VARCHAR(2048),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`.trim();
const DDL_PRE_AUTH_CODES_CONFERENCES = `
  CREATE TABLE ${TBL_NM_AUTH_CODES_CONFERENCES} (
    auth_code_id INTEGER,
    conference_id INTEGER,
    PRIMARY KEY (auth_code_id, conference_id),
    FOREIGN KEY (auth_code_id) REFERENCES ${TBL_NM_AUTH_CODES}(id),
    FOREIGN KEY (conference_id) REFERENCES ${TBL_NM_CONFERENCES}(id)
  )
`.trim();

const DDL_MAP = {
  [TBL_NM_CONFERENCES]: DDL_CONFERENCES,
  [TBL_NM_AUTH_CODES_CONFERENCES]: DDL_PRE_AUTH_CODES_CONFERENCES,
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

export const registerConference = async (
  newConference: NewConference,
): Promise<number> => {
  const db = await store.openDb();
  const sql = `
    INSERT INTO ${TBL_NM_CONFERENCES}
    (name, description, location, startDate, endDate, url, organizerName, organizerUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    newConference.name,
    newConference.description,
    newConference.location,
    newConference.startDate,
    newConference.endDate,
    newConference.url,
    newConference.organizerName,
    newConference.organizerUrl,
  ];

  try {
    let result = await db.run(sql, params);
    console.log("New conference inserted");
    return result.lastID!;
  } catch (err) {
    console.error("Could not insert new conference", err);
    throw err;
  }
};

export const getConferenceById = async (conferenceId: string) => {
  try {
    const db = await store.openDb();
    const conference = await db.get<Conference>(
      `SELECT * FROM ${TBL_NM_CONFERENCES} WHERE id = ?`,
      conferenceId,
    );
    return conference || null;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

type StoredPreAuthCode = {
  usedAt: string;
} & Omit<AuthorizedCode, "isUsed"> &
  Identifiable;
export const getPreAuthCodeAndConference = async (code: string) => {
  try {
    const db = await store.openDb();

    const storedAuthCode = await db.get<StoredPreAuthCode>(
      `
      SELECT * FROM ${TBL_NM_AUTH_CODES} WHERE code = ?
    `,
      [code],
    );

    if (!storedAuthCode) {
      return null; // 該当するpre_auth_codeがない場合はnullを返す
    }

    const relation = await db.get(
      `
      SELECT * FROM ${TBL_NM_AUTH_CODES_CONFERENCES} WHERE auth_code_id = ?
    `,
      [storedAuthCode.id],
    );

    if (!relation) {
      throw new Error("PreAuthCode found but no related conference found");
    }

    const conference = await db.get<Conference>(
      `
      SELECT * FROM ${TBL_NM_CONFERENCES} WHERE id = ?
    `,
      [relation.conference_id],
    );
    if (!conference) {
      throw new Error("Relation found but no related conference found");
    }

    return { storedAuthCode, conference: conference };
  } catch (err) {
    store.handleError(err); // エラー処理
  }
};

export const addPreAuthCode = async (
  code: string,
  expiresIn: number,
  userPin: string,
  conferenceId: number,
) => {
  try {
    const db = await store.openDb();
    const authCodeId = await authStore.addAuthCode(
      code,
      expiresIn,
      true,
      userPin,
      false,
    );
    await db.run(
      `INSERT INTO ${TBL_NM_AUTH_CODES_CONFERENCES} (auth_code_id, conference_id) VALUES (?, ?)`,
      authCodeId,
      conferenceId,
    );
    return authCodeId;
  } catch (err) {
    store.handleError(err);
  }
};
export const addAccessToken = async (
  accessToken: string,
  expiresIn: number,
  cNonce: string,
  cNonceExpiresIn: number,
  authorizedCodeId: number,
) => {
  await authStore.addAccessToken(
    accessToken,
    expiresIn,
    cNonce,
    cNonceExpiresIn,
    authorizedCodeId,
  );
  // preAuthCodeを使用済みに更新
  // todo: 使い回しする要件であるため、使用済みにしてはいけないはず
  await authStore.updateAuthCode(authorizedCodeId);
};

export const getAccessToken = async (
  accessToken: string,
): Promise<StoredAccessToken | undefined> => {
  return await authStore.getAccessToken(accessToken);
};
export const refreshNonce = async (
  accessTokenId: number,
  cNonce: string,
  expiresIn: number,
) => {
  // todo: 新規にnonceを登録しているだけなら、特段対応不要。使用済み処理などがあるならば、対応が必要
  return await authStore.refreshNonce(accessTokenId, cNonce, expiresIn);
};

export default {
  createDb,
  destroyDb,
  addPreAuthCode,
  addAccessToken,
  getAccessToken,
  getConferenceById,
  refreshNonce,
  registerConference,
  getPreAuthCodeAndConference,
};
