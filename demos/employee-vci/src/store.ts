import store from "ownd-vci-common/dist/store.js";
import keyStore from "ownd-vci-common/dist/store/keyStore.js";
import authStore, {
  StoredAccessToken,
  TBL_NM_AUTH_CODES,
} from "ownd-vci-common/dist/store/authStore.js";
import {
  Identifiable,
  AuthorizedCode,
} from "ownd-vci/dist/oid4vci/types/types.js";

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

entity auth_codes {
  * id int
  --
  * code string
  * pre_auth_flow boolean
  * pin string
  * needs_proof boolean
  * sub string (employee.id)
  * expired_in number
  * created_at datetime
  * used_at datetime
}

auth_codes ||..o| access_tokens
access_tokens ||..|{ c_nonces

@enduml
*/

const TBL_NM_EMPLOYEES = "employees";

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

const DDL_MAP = {
  [TBL_NM_EMPLOYEES]: DDL_EMPLOYEES,
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

export const getEmployeeById = async (id: string | number) => {
  try {
    const db = await store.openDb();
    const employee = await db.get<Employee>(
      `SELECT * FROM ${TBL_NM_EMPLOYEES} WHERE id = ?`,
      typeof id === "string" ? Number(id) : id,
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
  txCode: string,
  sub: string,
) => {
  try {
    const authCodeId = await authStore.addAuthCode(
      code,
      expiresIn,
      true,
      txCode,
      true,
      sub,
    );
    return authCodeId;
  } catch (err) {
    store.handleError(err);
  }
};

type StoredPreAuthCode = {
  usedAt: string;
  sub?: string;
} & Omit<AuthorizedCode, "isUsed"> &
  Identifiable;
export const getPreAuthCodeAndEmployee = async (code: string) => {
  try {
    const db = await store.openDb();

    // auth_codesテーブルからcodeに一致するレコードを取得
    const storedAuthCode = await db.get<StoredPreAuthCode>(
      `
      SELECT * FROM ${TBL_NM_AUTH_CODES} WHERE code = ?
    `,
      [code],
    );

    if (!storedAuthCode) {
      return null; // 該当するauth_codeがない場合はnullを返す
    }

    if (!storedAuthCode.sub) {
      throw new Error("AuthCode found but no sub (employee identifier) found");
    }

    // employeesテーブルからsubに該当するemployeeを取得（subはemployee.idの文字列表現）
    const employee = await db.get<Employee>(
      `
      SELECT * FROM ${TBL_NM_EMPLOYEES} WHERE id = ?
    `,
      [Number(storedAuthCode.sub)],
    );
    if (!employee) {
      throw new Error("Employee not found for sub: " + storedAuthCode.sub);
    }

    return { storedAuthCode, employee };
  } catch (err) {
    store.handleError(err); // エラー処理
  }
};

export const addAccessToken = async (
  accessToken: string,
  expiresIn: number,
  authorizedCodeId: number,
) => {
  const accessTokenId = await authStore.addAccessToken(
    accessToken,
    expiresIn,
    authorizedCodeId,
  );
  // preAuthCodeを使用済みに更新
  await authStore.updateAuthCode(authorizedCodeId);
  return accessTokenId;
};

export const getAccessToken = async (
  accessToken: string,
): Promise<StoredAccessToken | undefined> => {
  return await authStore.getAccessToken(accessToken);
};

export const getAllEmployees = async (): Promise<Employee[]> => {
  try {
    const db = await store.openDb();
    const employees = await db.all<Employee[]>(
      `SELECT * FROM ${TBL_NM_EMPLOYEES} ORDER BY createdAt DESC`,
    );
    return employees;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const updateEmployee = async (
  id: number,
  employee: NewEmployee,
): Promise<void> => {
  try {
    const db = await store.openDb();
    const sql = `
      UPDATE ${TBL_NM_EMPLOYEES}
      SET companyName = ?, employeeNo = ?, givenName = ?,
          familyName = ?, gender = ?, division = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await db.run(
      sql,
      employee.companyName,
      employee.employeeNo,
      employee.givenName,
      employee.familyName,
      employee.gender,
      employee.division,
      id,
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  try {
    const db = await store.openDb();
    await db.run(`DELETE FROM ${TBL_NM_EMPLOYEES} WHERE id = ?`, id);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export default {
  createDb,
  destroyDb,
  registerEmployee,
  getEmployeeByNo,
  getEmployeeById,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  addPreAuthCode,
  getPreAuthCodeAndEmployee,
  addAccessToken,
  getAccessToken,
};
