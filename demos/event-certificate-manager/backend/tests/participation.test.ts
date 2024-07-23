import { assert } from "chai";
import request from "supertest";

import { getSession } from "./testUtils";
import { init } from "../src/app";
import store, { NewEvent, Participation } from "../src/store";

const app = init();

const appName = process.env.APP_NAME || "";
const PARTICIPATION_ENDPOINT = `/admin/${appName}/participation`;

describe("/admin/participation endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("Unauthorized request for all participations", async () => {
    const response = await request(app.callback()).get(PARTICIPATION_ENDPOINT);
    assert.equal(response.status, 401);
  });

  it("Retrieve all participations with no data", async () => {
    const response = await request(app.callback())
      .get(PARTICIPATION_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const payload = response.body as Participation[];
    assert.equal(payload.length, 0);
  });

  it("Retrieve all participations with data", async () => {
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

    const eventId = await store.registerEvent(event);

    await store.addPreAuthCodeAsParticipation(
      "test-code",
      3600,
      "1234",
      eventId,
    );

    const response = await request(app.callback())
      .get(PARTICIPATION_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const payload = response.body as Participation[];
    assert.equal(payload.length, 1);
    assert.equal(payload[0].eventId, eventId);
  });

  it("Unauthorized request for participation by ID", async () => {
    const PARTICIPATION_DETAIL_ENDPOINT = `${PARTICIPATION_ENDPOINT}/0`;
    const response = await request(app.callback()).get(
      PARTICIPATION_DETAIL_ENDPOINT,
    );
    assert.equal(response.status, 401);
  });

  it("Retrieve participation by ID with no data", async () => {
    const PARTICIPATION_DETAIL_ENDPOINT = `${PARTICIPATION_ENDPOINT}/0`;
    const response = await request(app.callback())
      .get(PARTICIPATION_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 404);
  });

  it("Retrieve participation by ID with data", async () => {
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

    const eventId = await store.registerEvent(event);

    const participationId = await store.addPreAuthCodeAsParticipation(
      "test-code",
      3600,
      "1234",
      eventId,
    );

    const PARTICIPATION_DETAIL_ENDPOINT = `${PARTICIPATION_ENDPOINT}/${participationId.id}`;
    const response = await request(app.callback())
      .get(PARTICIPATION_DETAIL_ENDPOINT)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);
    const payload = response.body as Participation;
    assert.equal(payload.eventId, eventId);
    assert.equal(payload.authorizedCode.code, "test-code");
  });
});
