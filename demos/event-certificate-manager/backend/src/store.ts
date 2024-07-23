import { v4 as uuidv4 } from "uuid";

import store, { handleError } from "ownd-vci/dist/store.js";
import keyStore from "ownd-vci/dist/store/keyStore.js";
import authStore, { TBL_NM_AUTH_CODES } from "ownd-vci/dist/store/authStore.js";
import { AuthorizedCode, Identifiable } from "ownd-vci/dist/oid4vci/types/types.js";

/*
@startuml


entity events {
  * id: int PRIMARY KEY
  --
  *  name string
  *  eventId string
  *  description string
  *  location string
  *  startDate datetime
  *  endDate datetime
  *  url string
  *  organizerName string
  *  organizerUrl string
  --
  *  createdAt datetime
  *  updatedAt datetime
}

entity auth_codes_events {
  * id: int PRIMARY KEY
  --
  * auth_code_id <<FK>>
  * event_id <<FK>>
  * ticketNo <<UK>>
  --
  * createdAt: datetime
  * updatedAt datetime
}
note bottom of auth_codes_events: UNIQUE (auth_code_id, event_id)

auth_codes ||..o| access_tokens
auth_codes ||..|| auth_codes_events
access_tokens ||..|{ c_nonces

events ||..o| auth_codes_events

@enduml
*/

const TBL_NM_EVENTS = "events";
const TBL_NM_AUTH_CODES_EVENTS = "auth_codes_events";
const TBL_NM_AUTH_CODES_PARTICIPATION = "auth_codes_participation";

const DDL_EVENTS = `
  CREATE TABLE ${TBL_NM_EVENTS} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(4096) NULL,
    location VARCHAR(512) NULL,
    startDate DATETIME NOT NULL,
    endDate DATETIME NOT NULL,
    url VARCHAR(2048) NULL,
    organizerName VARCHAR(255) NOT NULL,
    organizerUrl VARCHAR(2048) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`.trim();
const DDL_AUTH_CODES_EVENTS = `
  CREATE TABLE ${TBL_NM_AUTH_CODES_EVENTS} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth_code_id INTEGER,
    event_id INTEGER,
    ticketNo VARCHAR(36),
    consumedAt DATETIME DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (auth_code_id, event_id),
    FOREIGN KEY (auth_code_id) REFERENCES ${TBL_NM_AUTH_CODES}(id),
    FOREIGN KEY (event_id) REFERENCES ${TBL_NM_EVENTS}(id)
  )
`.trim();
const DDL_AUTH_CODES_PARTICIPATION = `
  CREATE TABLE ${TBL_NM_AUTH_CODES_PARTICIPATION} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth_code_id INTEGER,
    event_id INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (auth_code_id, event_id),
    FOREIGN KEY (auth_code_id) REFERENCES ${TBL_NM_AUTH_CODES}(id),
    FOREIGN KEY (event_id) REFERENCES ${TBL_NM_EVENTS}(id)
  )
`.trim();

const DDL_MAP = {
  [TBL_NM_EVENTS]: DDL_EVENTS,
  [TBL_NM_AUTH_CODES_EVENTS]: DDL_AUTH_CODES_EVENTS,
  [TBL_NM_AUTH_CODES_PARTICIPATION]: DDL_AUTH_CODES_PARTICIPATION,
};

const createDb = async () => {
  await keyStore.createDb();
  await authStore.createDb();
  await store.createDb(DDL_MAP);
};
const destroyDb = async () => {
  await keyStore.destroyDb();
  await authStore.destroyDb();
  await store.createDb(DDL_MAP);
  await store.destroyDb(DDL_MAP);
};

export interface Event {
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

// todo usedAtがそのまま返されるのでIFと一致しないバグの扱いを考える(IFを変えるか実装を変えるか)
export interface AuthorizedCode2 extends Omit<AuthorizedCode, "isUsed"> {
  usedAt?: number;
}

export interface Ticket {
  id: number;
  eventId: number;
  ticketNo: string;
  updatedAt: string;
  authorizedCode: AuthorizedCode2;
  consumedAt?: string;
}

export type NewEvent = Omit<Event, "id">;
export type NewTicket = Omit<Ticket, "id" | "authorizedCode">;

export const registerEvent = async (
  newConference: NewEvent,
): Promise<number> => {
  const db = await store.openDb();
  const sql = `
    INSERT INTO ${TBL_NM_EVENTS}
    (name, description, location, startDate, endDate, url, organizerName, organizerUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  // デフォルト値を NULL に設定
  const params = [
    newConference.name,
    newConference.description || null,
    newConference.location || null,
    newConference.startDate,
    newConference.endDate,
    newConference.url || null,
    newConference.organizerName,
    newConference.organizerUrl || null,
  ];

  try {
    let result = await db.run(sql, params);
    console.log("New event inserted with ID:", result.lastID);
    return result.lastID!;
  } catch (err) {
    console.error("Could not insert new event", err);
    throw err;
  }
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const db = await store.openDb();
    const event = await db.get<Event>(
      `SELECT * FROM ${TBL_NM_EVENTS} WHERE id = ?`,
      eventId,
    );
    return event || null;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getAllEvents = async (
  sortField = "startDate",
  sortOrder = "ASC",
): Promise<Event[]> => {
  const db = await store.openDb();
  const sql = `
        SELECT * FROM ${TBL_NM_EVENTS}
        ORDER BY ${sortField} ${sortOrder}
    `;
  try {
    return await db.all<Event[]>(sql);
  } catch (err) {
    console.error("Could not retrieve events", err);
    throw err;
  }
};

export const updateEvent = async (
  eventId: number,
  updatedEvent: NewEvent,
): Promise<Event | undefined> => {
  const db = await store.openDb();
  const {
    name,
    description = null,
    location = null,
    startDate,
    endDate,
    url = null,
    organizerName,
    organizerUrl = null,
  } = updatedEvent;

  const sqlUpdate = `
    UPDATE ${TBL_NM_EVENTS}
    SET
      name = ?,
      description = ?,
      location = ?,
      startDate = ?,
      endDate = ?,
      url = ?,
      organizerName = ?,
      organizerUrl = ?
    WHERE id = ?
  `;

  const paramsUpdate = [
    name,
    description,
    location,
    startDate,
    endDate,
    url,
    organizerName,
    organizerUrl,
    eventId,
  ];

  try {
    await db.run(sqlUpdate, paramsUpdate);
    console.log("Event updated successfully");

    // 更新されたイベントを直接返す
    const sqlSelect = `SELECT * FROM ${TBL_NM_EVENTS} WHERE id = ?`;
    return await db.get<Event>(sqlSelect, [eventId]);
  } catch (err) {
    console.error("Could not update the event", err);
    throw err;
  }
};

export const addPreAuthCodeAsTicket = async (
  code: string,
  expiresIn: number,
  userPin: string,
  eventId: number,
): Promise<Ticket> => {
  try {
    const db = await store.openDb();
    const authCodeId = await authStore.addAuthCode(
      code,
      expiresIn,
      true,
      userPin,
      false,
    );
    const ticketNo = uuidv4();
    let result = await db.run(
      `INSERT INTO ${TBL_NM_AUTH_CODES_EVENTS} (auth_code_id, event_id, ticketNo) VALUES (?, ?, ?)`,
      authCodeId,
      eventId,
      ticketNo,
    );
    // return authCodeId;
    console.log("New ticket inserted");
    let authorizedCode = await authStore.getAuthCode(code);
    return {
      id: result.lastID!,
      eventId,
      ticketNo,
      updatedAt: new Date().toISOString(),
      authorizedCode: authorizedCode!,
    };
  } catch (err) {
    console.error("Could not insert new ticket", err);
    store.handleError(err);
  }
};

type TicketRow = Ticket & AuthorizedCode2 & { authorizedCodeId: number };
export const getTickets = async (): Promise<Ticket[]> => {
  const query = `
    SELECT 
        ace.id,
        ace.event_id,
        ace.ticketNo,
        ace.updatedAt,
        ac.id authorizedCodeId,
        ac.code,
        ac.expiresIn,
        ac.userPin,
        ac.needsProof,
        ac.preAuthFlow,
        ac.createdAt,
        ac.usedAt
    FROM ${TBL_NM_AUTH_CODES} ac
    JOIN ${TBL_NM_AUTH_CODES_EVENTS} ace ON ac.id = ace.auth_code_id
    JOIN ${TBL_NM_EVENTS} e ON ace.event_id = e.id
    ORDER BY ac.createdAt, ace.event_id
  `;
  try {
    const db = await store.openDb();
    const rows = await db.all<TicketRow[]>(query);
    return rows.map((row) => {
      const authorizedCode: AuthorizedCode2 = {
        id: row.authorizedCodeId,
        code: row.code,
        createdAt: row.createdAt,
        expiresIn: row.expiresIn,
        userPin: row.userPin,
        needsProof: row.needsProof,
        preAuthFlow: row.preAuthFlow,
        usedAt: row.usedAt,
      };
      // @ts-ignore
      const eventId = row.event_id;
      return {
        id: row.id,
        eventId,
        ticketNo: row.ticketNo,
        updatedAt: row.updatedAt,
        authorizedCode: authorizedCode,
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getTicketById = async (
  ticketId: string,
): Promise<Ticket | null> => {
  const query = `
    SELECT 
        ace.id,
        ace.event_id,
        ace.ticketNo,
        ace.updatedAt,
        ac.id authorizedCodeId,
        ac.code,
        ac.expiresIn,
        ac.userPin,
        ac.needsProof,
        ac.preAuthFlow,
        ac.createdAt,
        ac.usedAt
    FROM ${TBL_NM_AUTH_CODES} ac
    JOIN ${TBL_NM_AUTH_CODES_EVENTS} ace ON ac.id = ace.auth_code_id
    JOIN ${TBL_NM_EVENTS} e ON ace.event_id = e.id
    WHERE ace.id = ${ticketId}
    ORDER BY ac.createdAt, ace.event_id
  `;
  try {
    const db = await store.openDb();
    const row = await db.get<TicketRow>(query);
    if (!row) {
      return null;
    } else {
      const authorizedCode: AuthorizedCode2 = {
        id: row.authorizedCodeId,
        code: row.code,
        createdAt: row.createdAt,
        expiresIn: row.expiresIn,
        userPin: row.userPin,
        needsProof: row.needsProof,
        preAuthFlow: row.preAuthFlow,
        usedAt: row.usedAt,
      };
      // @ts-ignore
      const eventId = row.event_id;
      return {
        id: row.id,
        eventId,
        ticketNo: row.ticketNo,
        updatedAt: row.updatedAt,
        authorizedCode: authorizedCode,
      };
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const updateTicket = async (
  ticketId: string,
  eventId: string,
): Promise<void> => {
  try {
    const db = await store.openDb();
    await db.run(
      `UPDATE ${TBL_NM_AUTH_CODES_EVENTS} SET event_id = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      eventId,
      ticketId,
    );
    console.log("ticket updated");
  } catch (err) {
    console.error("Could not update ticket", err);
    store.handleError(err);
  }
};

export const getTicketByTicketNo = async (
  ticketNo: string,
): Promise<Ticket | null> => {
  const query = `
    SELECT 
        ace.id,
        ace.event_id,
        ace.ticketNo,
        ace.updatedAt,
        ace.consumedAt,
        ac.id authorizedCodeId,
        ac.code,
        ac.expiresIn,
        ac.userPin,
        ac.needsProof,
        ac.preAuthFlow,
        ac.createdAt,
        ac.usedAt
    FROM ${TBL_NM_AUTH_CODES} ac
    JOIN ${TBL_NM_AUTH_CODES_EVENTS} ace ON ac.id = ace.auth_code_id
    JOIN ${TBL_NM_EVENTS} e ON ace.event_id = e.id
    WHERE ace.ticketNo = '${ticketNo}'
    ORDER BY ac.createdAt, ace.event_id
  `;
  try {
    const db = await store.openDb();
    const row = await db.get<TicketRow>(query);
    if (!row) {
      return null;
    } else {
      const authorizedCode: AuthorizedCode2 = {
        id: row.authorizedCodeId,
        code: row.code,
        createdAt: row.createdAt,
        expiresIn: row.expiresIn,
        userPin: row.userPin,
        needsProof: row.needsProof,
        preAuthFlow: row.preAuthFlow,
        usedAt: row.usedAt,
      };
      // @ts-ignore
      const eventId = row.event_id;
      return {
        id: row.id,
        eventId,
        ticketNo: row.ticketNo,
        updatedAt: row.updatedAt,
        consumedAt: row.consumedAt,
        authorizedCode: authorizedCode,
      };
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const consumeTicket = async (
  // authorizedCode: AuthorizedCode2,
  id: number,
): Promise<void> => {
  try {
    // await authStore.updateAuthCode(authorizedCode.id);
    const db = await store.openDb();
    await db.run(
      `UPDATE ${TBL_NM_AUTH_CODES_EVENTS} SET consumedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      id,
    );
    console.log("ticket consumed");
  } catch (err) {
    console.error("Could not update ticket", err);
    store.handleError(err);
  }
};

export interface AuthCodeEventTicket {
  event: Event;
  ticketNo: string;
}

export const getEventIdByTicketNo = async (
  ticketNo: string,
): Promise<number | undefined> => {
  const query = `
    SELECT event_id FROM ${TBL_NM_AUTH_CODES_EVENTS} WHERE ticketNo = ?
  `;
  const db = await store.openDb();
  const row = await db.get<{ event_id: number }>(query, [ticketNo]);
  return row?.event_id;
};

export const getEventAndTicketByAuthCode = async (
  authCode: string,
): Promise<AuthCodeEventTicket | null> => {
  const query = `
    SELECT 
      e.*,
      ace.ticketNo
    FROM ${TBL_NM_AUTH_CODES} ac
    JOIN ${TBL_NM_AUTH_CODES_EVENTS} ace ON ac.id = ace.auth_code_id
    JOIN ${TBL_NM_EVENTS} e ON ace.event_id = e.id
    WHERE ac.code = ?
  `;

  try {
    const db = await store.openDb();
    const row = await db.get<Event & { ticketNo: string }>(query, [authCode]);

    if (!row) {
      return null;
    }

    const event: Event = {
      id: row.id,
      name: row.name,
      description: row.description,
      location: row.location,
      startDate: row.startDate,
      endDate: row.endDate,
      url: row.url,
      organizerName: row.organizerName,
      organizerUrl: row.organizerUrl,
    };

    return {
      event: event,
      ticketNo: row.ticketNo,
    };
  } catch (err) {
    console.error(err);
    handleError(err);
  }
};

export interface Participation {
  id: number;
  eventId: number;
  updatedAt: string;
  authorizedCode: AuthorizedCode2;
}

type ParticipationRow = Participation &
  AuthorizedCode2 & { authorizedCodeId: number };
export const getAllParticipation = async (): Promise<Participation[]> => {
  const query = `
    SELECT 
        ace.id,
        ace.event_id as eventId,
        ace.updatedAt,
        ac.id authorizedCodeId,
        ac.code,
        ac.expiresIn,
        ac.userPin,
        ac.needsProof,
        ac.preAuthFlow,
        ac.createdAt,
        ac.usedAt
    FROM ${TBL_NM_AUTH_CODES} ac
    JOIN ${TBL_NM_AUTH_CODES_PARTICIPATION} ace ON ac.id = ace.auth_code_id
    JOIN ${TBL_NM_EVENTS} e ON ace.event_id = e.id
    ORDER BY ac.createdAt, ace.event_id
  `;
  try {
    const db = await store.openDb();
    const rows = await db.all<ParticipationRow[]>(query);
    return rows.map((row) => {
      const authorizedCode: AuthorizedCode2 = {
        id: row.authorizedCodeId,
        code: row.code,
        createdAt: row.createdAt,
        expiresIn: row.expiresIn,
        userPin: row.userPin,
        needsProof: row.needsProof,
        preAuthFlow: row.preAuthFlow,
        usedAt: row.usedAt,
      };
      const eventId = row.eventId;
      return {
        id: row.id,
        eventId,
        updatedAt: row.updatedAt,
        authorizedCode: authorizedCode,
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getParticipationById = async (
  participationId: string,
): Promise<Participation | null> => {
  const query = `
    SELECT 
        ace.id,
        ace.event_id as eventId,
        ace.updatedAt,
        ac.id authorizedCodeId,
        ac.code,
        ac.expiresIn,
        ac.userPin,
        ac.needsProof,
        ac.preAuthFlow,
        ac.createdAt,
        ac.usedAt
    FROM ${TBL_NM_AUTH_CODES} ac
    JOIN ${TBL_NM_AUTH_CODES_PARTICIPATION} ace ON ac.id = ace.auth_code_id
    JOIN ${TBL_NM_EVENTS} e ON ace.event_id = e.id
    WHERE ace.id = ${participationId}
    ORDER BY ac.createdAt, ace.event_id
  `;
  try {
    const db = await store.openDb();
    const row = await db.get<ParticipationRow>(query);
    if (!row) {
      return null;
    } else {
      const authorizedCode: AuthorizedCode2 = {
        id: row.authorizedCodeId,
        code: row.code,
        createdAt: row.createdAt,
        expiresIn: row.expiresIn,
        userPin: row.userPin,
        needsProof: row.needsProof,
        preAuthFlow: row.preAuthFlow,
        usedAt: row.usedAt,
      };
      const eventId = row.eventId;
      return {
        id: row.id,
        eventId,
        updatedAt: row.updatedAt,
        authorizedCode: authorizedCode,
      };
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const addPreAuthCodeAsParticipation = async (
  code: string,
  expiresIn: number,
  userPin: string,
  eventId: number,
): Promise<Participation> => {
  try {
    const db = await store.openDb();
    const authCodeId = await authStore.addAuthCode(
      code,
      expiresIn,
      true,
      userPin,
      false,
    );
    let result = await db.run(
      `INSERT INTO ${TBL_NM_AUTH_CODES_PARTICIPATION} (auth_code_id, event_id) VALUES (?, ?)`,
      authCodeId,
      eventId,
    );
    console.log("New Participation inserted");
    let authorizedCode = await authStore.getAuthCode(code);
    return {
      id: result.lastID!,
      eventId,
      updatedAt: new Date().toISOString(),
      authorizedCode: authorizedCode!,
    };
  } catch (err) {
    console.error("Could not insert new ticket", err);
    store.handleError(err);
  }
};

type StoredPreAuthCode = {
  usedAt: string;
} & Omit<AuthorizedCode, "isUsed"> &
  Identifiable;
export const getPreAuthCodeForParticipationCredentialAndEvent = async (
  code: string,
) => {
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
      SELECT * FROM ${TBL_NM_AUTH_CODES_PARTICIPATION} WHERE auth_code_id = ?
    `,
      [storedAuthCode.id],
    );

    if (!relation) {
      const err = new Error("PreAuthCode found but no related event found");
      store.handleError(err);
    }

    const event = await db.get<Event>(
      `
      SELECT * FROM ${TBL_NM_EVENTS} WHERE id = ?
    `,
      [relation.event_id],
    );

    if (!event) {
      const err = new Error("Relation found but no related event found");
      store.handleError(err);
    }

    return { storedAuthCode, event: event };
  } catch (err) {
    store.handleError(err);
  }
};

export const getPreAuthCodeForTicketCredentialAndEvent = async (
  code: string,
) => {
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
      SELECT * FROM ${TBL_NM_AUTH_CODES_EVENTS} WHERE auth_code_id = ?
    `,
      [storedAuthCode.id],
    );

    if (!relation) {
      const err = new Error("PreAuthCode found but no related event found");
      store.handleError(err);
    }

    const event = await db.get<Event>(
      `
      SELECT * FROM ${TBL_NM_EVENTS} WHERE id = ?
    `,
      [relation.event_id],
    );

    if (!event) {
      const err = new Error("Relation found but no related event found");
      store.handleError(err);
    }

    return { storedAuthCode, event: event };
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
  await authStore.updateAuthCode(authorizedCodeId);
};

export default {
  createDb,
  destroyDb,
  registerEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  addPreAuthCodeAsTicket,
  getTickets,
  getTicketById,
  updateTicket,
  getTicketByTicketNo,
  consumeTicket,
  getEventAndTicketByAuthCode,
  getAllParticipation,
  getParticipationById,
  addPreAuthCodeAsParticipation,
  getPreAuthCodeForParticipationCredentialAndEvent,
  getPreAuthCodeForTicketCredentialAndEvent,
  addAccessToken,
  getEventIdByTicketNo,
};
