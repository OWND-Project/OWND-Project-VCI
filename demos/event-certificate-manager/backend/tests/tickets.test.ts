import { v4 as uuidv4 } from "uuid";

import { assert } from "chai";
import request from "supertest";

import authStore from "ownd-vci/dist/store/authStore.js";
import { AuthorizedCode } from "ownd-vci/dist/oid4vci/types/types.js";

import { getSession } from "./testUtils";
import { init } from "../src/app";
import store, { Event, NewEvent, NewTicket, Ticket } from "../src/store";

const app = init();

const appName = process.env.APP_NAME || "";
const TICKETS_ENDPOINT = `/admin/${appName}/tickets`;

type FixtureEvent = Omit<NewEvent, "startDate" | "endDate">;
type FixtureTicket = Omit<
  AuthorizedCode,
  "id" | "needsProof" | "createdAt" | "isUsed" | "preAuthFlow"
> &
  NewTicket;
export const defaultFixtureEvent: FixtureEvent = {
  name: "a event",
  description: "event description",
  location: "event location",
  url: "url",
  organizerUrl: "organizer url",
  organizerName: "organizer name",
};

export const defaultFixtureTicket: FixtureTicket = {
  eventId: 1,
  ticketNo: uuidv4(),
  code: "test code",
  expiresIn: 86400,
  txCode: "test pin",
  updatedAt: new Date().toISOString(),
};

export const fixtureEvent = async (payload: FixtureEvent) => {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);
  return await store.registerEvent({
    ...payload,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
};
export const fixtureTicket = async (
  eventId: number,
  payload: FixtureTicket,
) => {
  const { code, expiresIn, txCode } = payload;
  return await store.addPreAuthCodeAsTicket(
    code,
    expiresIn,
    txCode || "",
    eventId,
  );
};

const assertTicket = (actual: Ticket, expected: FixtureTicket) => {
  const { eventId, code, expiresIn, txCode } = expected;
  assert.isObject(actual, "Payload should be an object");
  assert.isNumber(actual.id);
  assert.equal(actual.eventId, eventId);
  const { authorizedCode } = actual;
  assert.isObject(authorizedCode, "AuthorizedCode should be an object");
  assert.equal(authorizedCode.code, code);
  assert.equal(authorizedCode.expiresIn, expiresIn);
  assert.equal(authorizedCode.txCode, txCode);
};

describe("/admin/tickets/new endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(TICKETS_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("Bad Request 1", async () => {
    const response = await request(app.callback())
      .post(TICKETS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 400);
  });
  it("Bad Request 2", async () => {
    const response = await request(app.callback())
      .post(TICKETS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send({});
    assert.equal(response.status, 400);
  });
  it("Created Successfully", async () => {
    const eventId = await fixtureEvent(defaultFixtureEvent);
    const ticket: NewTicket = {
      eventId,
      ticketNo: uuidv4(),
      updatedAt: new Date().toISOString(),
    };
    const response = await request(app.callback())
      .post(TICKETS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(ticket);
    assert.equal(response.status, 201);

    const payload = response.body as Ticket;
    assert.isObject(payload, "Payload should be an object");

    const { code, txCode, expiresIn, createdAt, needsProof } =
      payload.authorizedCode;
    const authCode = await authStore.getAuthCode(code);
    assert.isObject(authCode, "AuthCode should be an object");

    assert.isNumber(payload.id);
    assert.equal(txCode, authCode!.txCode);
    assert.equal(expiresIn, authCode!.expiresIn);
    assert.equal(createdAt, authCode!.createdAt);
    assert.equal(needsProof, authCode!.needsProof);
    // todo usedAt assertion
  });
});

describe("/admin/tickets get endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).get(TICKETS_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("no data test", async () => {
    const response = await request(app.callback())
      .get(TICKETS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const payload = response.body as Event[];
    assert.equal(payload.length, 0);
  });
  it("1 record test", async () => {
    // record 1
    const eventId = await fixtureEvent(defaultFixtureEvent);
    await fixtureTicket(eventId, defaultFixtureTicket);

    // get records
    const response = await request(app.callback())
      .get(TICKETS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const payload = response.body as Ticket[];
    console.debug(payload);
    assert.equal(payload.length, 1);
    const record = payload[0];
    assertTicket(record, { ...defaultFixtureTicket, eventId });
  });
  it("2 records test", async () => {
    const eventId = await fixtureEvent(defaultFixtureEvent);
    // record 1
    await fixtureTicket(eventId, defaultFixtureTicket);

    // record 2
    const record2Input = {
      ...defaultFixtureTicket,
      code: "test code 2",
      txCode: "test pint 2",
      email: "test@test.com2",
      name: "test name 2",
    };
    await fixtureTicket(eventId, record2Input);

    // get records
    const response = await request(app.callback())
      .get(TICKETS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const payload = response.body as Ticket[];
    assert.equal(payload.length, 2);
    console.log(payload);

    // record1
    const record = payload[0];
    assertTicket(record, { ...defaultFixtureTicket, eventId });

    // record2
    const record2 = payload[1];
    assertTicket(record2, { ...record2Input, eventId });
  });
});

describe("/admin/tickets get detail endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/0`;
    const response = await request(app.callback()).get(TICKETS_DETAIL_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("no data test", async () => {
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/0`;
    const response = await request(app.callback())
      .get(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 404);
  });
  it("1 record test", async () => {
    const eventId = await fixtureEvent(defaultFixtureEvent);

    // record 1
    const ticket = await fixtureTicket(eventId, defaultFixtureTicket);
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/${ticket.id}`;

    // get records
    const response = await request(app.callback())
      .get(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const record = response.body as Ticket;
    assertTicket(record, { ...defaultFixtureTicket, eventId });
  });
  it("2 records test", async () => {
    const eventId = await fixtureEvent(defaultFixtureEvent);

    // record 1
    const ticket = await fixtureTicket(eventId, defaultFixtureTicket);
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/${ticket.id}`;

    // record 2
    const record2Input = {
      ...defaultFixtureTicket,
      code: "test code 2",
      txCode: "test pint 2",
    };
    await fixtureTicket(eventId, record2Input);

    // get records
    const response = await request(app.callback())
      .get(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const record = response.body as Ticket;
    assertTicket(record, { ...defaultFixtureTicket, eventId });
  });
});

describe("/admin/tickets/:id put endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/0`;
    const response = await request(app.callback()).put(TICKETS_DETAIL_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("Bad Request 1", async () => {
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/0`;
    const response = await request(app.callback())
      .put(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 400);
  });
  it("Bad Request 2", async () => {
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/0`;
    const response = await request(app.callback())
      .put(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send({});
    assert.equal(response.status, 400);
  });
  it("no data test", async () => {
    const eventId = await fixtureEvent(defaultFixtureEvent);
    const ticket = { eventId };
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/0`;
    const response = await request(app.callback())
      .put(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(ticket);
    assert.equal(response.status, 404);
  });
  it("Update Successfully", async () => {
    const eventId = await fixtureEvent(defaultFixtureEvent);
    const eventId2 = await fixtureEvent(defaultFixtureEvent);
    const ticket = await fixtureTicket(eventId, defaultFixtureTicket);
    const modified = {
      ...defaultFixtureTicket,
      eventId: eventId2,
    };
    const TICKETS_DETAIL_ENDPOINT = `${TICKETS_ENDPOINT}/${ticket.id}`;
    const response = await request(app.callback())
      .put(TICKETS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(modified);
    assert.equal(response.status, 200);

    const payload = response.body as Ticket;
    assert.isObject(payload, "Payload should be an object");

    assert.isNumber(payload.id);
    assert.equal(payload.eventId, eventId2);
  });
});
