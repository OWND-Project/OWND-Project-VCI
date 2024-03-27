import { assert } from "chai";
import request from "supertest";

import { init } from "../src/app";
import store, { Conference, NewConference } from "../src/store";

const app = init();
const username = "username";
const password = "password";

const NEW_CONFERENCE_ENDPOINT = "/admin/conferences/new";

describe("/admin/conferences/new endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(
      NEW_CONFERENCE_ENDPOINT,
    );
    assert.equal(response.status, 401);
  });
  it("Bad Request 1", async () => {
    const response = await request(app.callback())
      .post(NEW_CONFERENCE_ENDPOINT)
      .auth(username, password);
    assert.equal(response.status, 400);
  });
  it("Bad Request 2", async () => {
    const response = await request(app.callback())
      .post(NEW_CONFERENCE_ENDPOINT)
      .auth(username, password)
      .send({});
    assert.equal(response.status, 400);
  });
  it("Created Successfully", async () => {
    const conference: NewConference = {
      name: "a conference",
      description: "conference description",
      location: "conference location",
      startDate: "conference start date",
      endDate: "conference end date",
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name"
    };
    const response = await request(app.callback())
      .post(NEW_CONFERENCE_ENDPOINT)
      .auth(username, password)
      .send({ conference: conference });
    assert.equal(response.status, 201);

    const payload = response.body as Conference;
    assert.isObject(payload, "Payload should be an object");
    assert.equal(payload.name, conference.name);
    assert.equal(payload.description, conference.description);
    assert.equal(payload.location, conference.location);
    assert.equal(payload.startDate, conference.startDate);
    assert.equal(payload.endDate, conference.endDate);
  });
});
