import { assert } from "chai";
import request from "supertest";

import { getSession } from "./testUtils";
import { init } from "../src/app";
import store, { Event, NewEvent } from "../src/store";

const app = init();

const appName = process.env.APP_NAME || "";
const EVENTS_ENDPOINT = `/admin/${appName}/events`;

describe("/admin/events/new endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(EVENTS_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("Bad Request 1", async () => {
    const response = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 400);
  });
  it("Bad Request 2", async () => {
    const response = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send({});
    assert.equal(response.status, 400);
  });
  it("Created Successfully", async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };
    const response = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(event);
    assert.equal(response.status, 201);

    const payload = response.body as Event;
    assert.isObject(payload, "Payload should be an object");
    assert.isNumber(payload.id);
    assert.equal(payload.name, event.name);
    assert.equal(payload.description, event.description);
    assert.equal(payload.location, event.location);
    assert.equal(payload.startDate, event.startDate);
    assert.equal(payload.endDate, event.endDate);
  });
  it("Create event without optional fields", async () => {
    const startDate = new Date(2024, 0, 10).toISOString();
    const endDate = new Date(2024, 1, 10).toISOString();
    const minimalEvent = {
      name: "Minimal Event",
      startDate: startDate,
      endDate: endDate,
      organizerName: "organizer name",
    };
    const response = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(minimalEvent);
    assert.equal(response.status, 201);
    assert.isNotNull(response.body.id);
    assert.equal(response.body.name, minimalEvent.name);
    assert.equal(response.body.startDate, minimalEvent.startDate);
    assert.equal(response.body.endDate, minimalEvent.endDate);
    assert.equal(response.body.organizerName, minimalEvent.organizerName);
    assert.isNull(response.body.description);
    assert.isNull(response.body.location);
    assert.isNull(response.body.url);
    assert.isNull(response.body.organizerUrl);
  });
});

// List表示1件のみ
describe("/admin/events get endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).get(EVENTS_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("no data test", async () => {
    const response = await request(app.callback())
      .get(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const payload = response.body as Event[];
    assert.equal(payload.length, 0);
  });
  it("1 record test", async () => {
    // record 1
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };
    await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(event);

    // get records
    const response = await request(app.callback())
      .get(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const payload = response.body as Event[];
    assert.equal(payload.length, 1);
    const record = payload[0];
    assert.isObject(record, "Payload should be an object");
    assert.isNumber(record.id);
    assert.equal(record.name, event.name);
    assert.equal(record.description, event.description);
    assert.equal(record.location, event.location);
    assert.equal(record.startDate, event.startDate);
    assert.equal(record.endDate, event.endDate);
  });
});

// List表示複数件
describe("/admin/events sorted list endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
    // Prepare multiple events with different start dates
    await Promise.all([
      store.registerEvent({
        name: "Event1",
        description: "Event1 description",
        location: "Event1 location",
        startDate: new Date(2023, 0, 10).toISOString(),
        endDate: new Date(2023, 0, 11).toISOString(),
        url: "url1",
        organizerUrl: "Organizer1 url",
        organizerName: "Organizer1 name",
      }),
      store.registerEvent({
        name: "Event2",
        description: "Event2 description",
        location: "Event2 location",
        startDate: new Date(2023, 0, 20).toISOString(),
        endDate: new Date(2023, 0, 21).toISOString(),
        url: "url2",
        organizerUrl: "Organizer2 url",
        organizerName: "Organizer2 name",
      }),
      store.registerEvent({
        name: "Event3",
        description: "Event3 description",
        location: "Event3 location",
        startDate: new Date(2023, 0, 15).toISOString(),
        endDate: new Date(2023, 0, 16).toISOString(),
        url: "url3",
        organizerUrl: "Organizer3 url",
        organizerName: "Organizer3 name",
      }),
    ]);
  });

  it("Events sorted by startDate ASC", async () => {
    const response = await request(app.callback())
      .get(
        `${EVENTS_ENDPOINT}?sort=${encodeURIComponent(
          JSON.stringify(["startDate", "ASC"]),
        )}`,
      )
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const events = response.body;
    assert.equal(events.length, 3);
    assert.isTrue(
      new Date(events[0].startDate) <= new Date(events[1].startDate),
    );
    assert.isTrue(
      new Date(events[1].startDate) <= new Date(events[2].startDate),
    );
  });

  it("Events sorted by startDate DESC", async () => {
    const response = await request(app.callback())
      .get(
        `${EVENTS_ENDPOINT}?sort=${encodeURIComponent(
          JSON.stringify(["startDate", "DESC"]),
        )}`,
      )
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const events = response.body;
    assert.equal(events.length, 3);
    assert.isTrue(
      new Date(events[0].startDate) >= new Date(events[1].startDate),
    );
    assert.isTrue(
      new Date(events[1].startDate) >= new Date(events[2].startDate),
    );
  });
});

describe("/admin/events get detail endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const EVENTS_DETAIL_ENDPOINT = `${EVENTS_ENDPOINT}/0`;
    const response = await request(app.callback()).get(EVENTS_DETAIL_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("no data test", async () => {
    const EVENTS_DETAIL_ENDPOINT = `${EVENTS_ENDPOINT}/0`;
    const response = await request(app.callback())
      .get(EVENTS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 404);
  });
  it("1 record test", async () => {
    // record 1
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };
    const registeredResult = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(event);
    const newData = registeredResult.body as Event;
    const EVENTS_DETAIL_ENDPOINT = `${EVENTS_ENDPOINT}/${newData.id}`;

    // get records
    const response = await request(app.callback())
      .get(EVENTS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const record = response.body as Event;
    assert.isObject(record, "Payload should be an object");
    assert.isNumber(record.id);
    assert.equal(record.name, event.name);
    assert.equal(record.description, event.description);
    assert.equal(record.location, event.location);
    assert.equal(record.startDate, event.startDate);
    assert.equal(record.endDate, event.endDate);
  });
  it("2 records test", async () => {
    // record 1
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);

    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };
    const registeredResult = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(event);
    const newData = registeredResult.body as Event;
    const EVENTS_DETAIL_ENDPOINT = `${EVENTS_ENDPOINT}/${newData.id}`;

    // record 2
    const start2 = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const end2 = new Date(start2.getTime() + 7 * 60 * 60 * 1000);
    const event2: NewEvent = {
      name: "a event 2",
      description: "event description 2",
      location: "event location 2",
      startDate: start2.toISOString(),
      endDate: end2.toISOString(),
      url: "url 2",
      organizerUrl: "organizer url 2",
      organizerName: "organizer name 2",
    };
    // get records
    await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(event2);
    const response = await request(app.callback())
      .get(EVENTS_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const record = response.body as Event;
    assert.isObject(record, "Payload should be an object");
    assert.isNumber(record.id);
    assert.equal(record.name, event.name);
    assert.equal(record.description, event.description);
    assert.equal(record.location, event.location);
    assert.equal(record.startDate, event.startDate);
    assert.equal(record.endDate, event.endDate);
  });
});

describe("/admin/events update endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 60 * 60 * 1000);
  it("Unauthorized request", async () => {
    const response = await request(app.callback())
      .put(`${EVENTS_ENDPOINT}/1`)
      .send({});
    assert.equal(response.status, 401);
  });

  it("No data test", async () => {
    const session = await getSession(app);
    const response = await request(app.callback())
      .put(`${EVENTS_ENDPOINT}/1`)
      .set("Cookie", session)
      .send({});
    assert.equal(response.status, 400);
  });

  it("Event not found", async () => {
    const session = await getSession(app);
    const response = await request(app.callback())
      .put(`${EVENTS_ENDPOINT}/0`)
      .set("Cookie", session)
      .send({
        name: "a event",
        description: "event description",
        location: "event location",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        url: "url",
        organizerUrl: "organizer url",
        organizerName: "organizer name",
      });
    assert.equal(response.status, 404);
  });

  it("Update successfully", async () => {
    // First, create an event to update
    const newEvent: NewEvent = {
      name: "Initial Event",
      description: "Initial description",
      location: "Initial location",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      url: "https://initialUrl.com",
      organizerName: "Initial Organizer",
      organizerUrl: "https://initialOrganizerUrl.com",
    };
    const registerResponse = await request(app.callback())
      .post(EVENTS_ENDPOINT)
      .set("Cookie", await getSession(app))
      .send(newEvent);
    assert.equal(registerResponse.status, 201);

    const updatedEvent: NewEvent = {
      name: "Updated Event",
      description: "Updated description",
      location: "Updated location",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      url: "https://updatedUrl.com",
      organizerName: "Updated Organizer",
      organizerUrl: "https://updatedOrganizerUrl.com",
    };
    // Then, update that event
    const updateResponse = await request(app.callback())
      .put(`${EVENTS_ENDPOINT}/${registerResponse.body.id}`)
      .set("Cookie", await getSession(app))
      .send(updatedEvent);
    assert.equal(updateResponse.status, 200);

    // Verify the update
    const response = await request(app.callback())
      .get(`${EVENTS_ENDPOINT}/${registerResponse.body.id}`)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    assert.equal(response.body.name, updatedEvent.name);
    assert.equal(response.body.description, updatedEvent.description);
    assert.equal(response.body.location, updatedEvent.location);
    assert.equal(response.body.startDate, updatedEvent.startDate);
    assert.equal(response.body.endDate, updatedEvent.endDate);
  });
  it("Update event without optional fields", async () => {
    const eventToUpdate = await store.registerEvent({
      name: "Event1",
      description: "Event1 description",
      location: "Event1 location",
      startDate: new Date(2023, 0, 10).toISOString(),
      endDate: new Date(2023, 0, 11).toISOString(),
      url: "url1",
      organizerUrl: "Organizer1 url",
      organizerName: "Organizer1 name",
    });
    const updateData = {
      name: "Updated Name",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      organizerName: "Organizer1 name2",
    };
    const updateResponse = await request(app.callback())
      .put(`${EVENTS_ENDPOINT}/${eventToUpdate}`)
      .set("Cookie", await getSession(app))
      .send(updateData);
    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body.name, updateData.name);
    assert.isNull(updateResponse.body.description);
    assert.isNull(updateResponse.body.location);
    assert.isNull(updateResponse.body.url);
    assert.isNull(updateResponse.body.organizerUrl);
  });
});
