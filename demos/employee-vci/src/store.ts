import store from "../../../src/store.js";
import keyStore from "../../../src/store/keyStore.js";
import authStore, {
  StoredAccessToken,
  TBL_NM_AUTH_CODES,
} from "../../../src/store/authStore.js";
import {
  Identifiable,
  AuthorizedCode,
} from "../../../src/oid4vci/types.js";

/*
@startuml


entity employees {
  * id: int
  --
  *  employeeNo string PRIMARY KEY
  *  givenName string
  *  familyName string
  *  gender string
  *  division string
  *  createdAt datetime
  *  updatedAt datetime
}

entity auth_codes_employees {
  * auth_code_id <<FK>>
  * employee_id <<FK>>
  --
  * created_at: datetime
}

auth_codes ||..o| access_tokens
auth_codes ||..|| auth_codes_employees
access_tokens ||..|{ c_nonces

employees ||..o| auth_codes_employees

@enduml
*/

const TBL_NM_EMPLOYEES = "employees";
const TBL_NM_AUTH_CODES_EMPLOYEES = "auth_codes_employees";

const DDL_EMPLOYEES = `
  CREATE TABLE ${TBL_NM_EMPLOYEES} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyName VARCHAR(255),
    employeeNo VARCHAR(255) UNIQUE,
    givenName VARCHAR(255),
    familyName VARCHAR(255),
    gender VARCHAR(10),
    division VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`.trim();
const DDL_PRE_AUTH_CODES_EMPLOYEES = `
  CREATE TABLE ${TBL_NM_AUTH_CODES_EMPLOYEES} (
    auth_code_id INTEGER,
    employee_id INTEGER,
    PRIMARY KEY (auth_code_id, employee_id),
    FOREIGN KEY (auth_code_id) REFERENCES ${TBL_NM_AUTH_CODES}(id),
    FOREIGN KEY (employee_id) REFERENCES ${TBL_NM_EMPLOYEES}(id)
  )
`.trim();

const DDL_MAP = {
  [TBL_NM_EMPLOYEES]: DDL_EMPLOYEES,
  [TBL_NM_AUTH_CODES_EMPLOYEES]: DDL_PRE_AUTH_CODES_EMPLOYEES,
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

export interface Employee {
  id: number;
  companyName: string;
  employeeNo: string;
  givenName: string;
  familyName: string;
  gender: string;
  division: string;
}
export type NewEmployee = Omit<Employee, "id">;

export const registerEmployee = async (
  newEmployee: NewEmployee,
): Promise<void> => {
  const db = await store.openDb();
  const sql = `
    INSERT INTO ${TBL_NM_EMPLOYEES}
    (companyName, employeeNo, givenName, familyName, gender, division)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    newEmployee.companyName,
    newEmployee.employeeNo,
    newEmployee.givenName,
    newEmployee.familyName,
    newEmployee.gender,
    newEmployee.division,
  ];

  try {
    await db.run(sql, params);
    console.log("New employee inserted");
  } catch (err) {
    console.error("Could not insert new employee", err);
    throw err;
  }
};

export const getEmployeeByNo = async (employeeNo: string) => {
  try {
    const db = await store.openDb();
    const employee = await db.get<Employee>(
      `SELECT * FROM ${TBL_NM_EMPLOYEES} WHERE employeeNo = ?`,
      employeeNo,
    );
    return employee || null;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const addPreAuthCode = async (
  code: string,
  expiresIn: number,
  userPin: string,
  employeeId: number,
) => {
  try {
    const db = await store.openDb();
    const authCodeId = await authStore.addAuthCode(
      code,
      expiresIn,
      true,
      userPin,
      true,
    );
    await db.run(
      `INSERT INTO ${TBL_NM_AUTH_CODES_EMPLOYEES} (auth_code_id, employee_id) VALUES (?, ?)`,
      authCodeId,
      employeeId,
    );
    return authCodeId;
  } catch (err) {
    store.handleError(err);
  }
};

type StoredPreAuthCode = {
  usedAt: string;
} & Omit<AuthorizedCode, "isUsed"> &
  Identifiable;
export const getPreAuthCodeAndEmployee = async (code: string) => {
  try {
    const db = await store.openDb();

    // pre_auth_codesテーブルからcodeに一致するレコードを取得
    const storedAuthCode = await db.get<StoredPreAuthCode>(
      `
      SELECT * FROM ${TBL_NM_AUTH_CODES} WHERE code = ?
    `,
      [code],
    );

    if (!storedAuthCode) {
      return null; // 該当するpre_auth_codeがない場合はnullを返す
    }

    // pre_auth_codes_employeesからemployee_idを取得
    const relation = await db.get(
      `
      SELECT * FROM ${TBL_NM_AUTH_CODES_EMPLOYEES} WHERE auth_code_id = ?
    `,
      [storedAuthCode.id],
    );

    if (!relation) {
      throw new Error("PreAuthCode found but no related employee found");
    }

    // employeesテーブルから該当するemployeeを取得
    const employee = await db.get<Employee>(
      `
      SELECT * FROM ${TBL_NM_EMPLOYEES} WHERE id = ?
    `,
      [relation.employee_id],
    );
    if (!employee) {
      throw new Error("Relation found but no related employee found");
    }

    return { storedAuthCode, employee };
  } catch (err) {
    store.handleError(err); // エラー処理
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
  return await authStore.refreshNonce(accessTokenId, cNonce, expiresIn);
};

export default {
  createDb,
  destroyDb,
  registerEmployee,
  getEmployeeByNo,
  addPreAuthCode,
  getPreAuthCodeAndEmployee,
  addAccessToken,
  getAccessToken,
  refreshNonce,
};
