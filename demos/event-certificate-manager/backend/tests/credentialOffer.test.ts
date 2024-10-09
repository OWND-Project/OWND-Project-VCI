import { assert } from "chai";
import request from "supertest";

import { getSession } from "./testUtils";
import { init as initApp } from "../src/app";
import store, { NewEvent } from "../src/store";
import { ParticipationWithCredentialOffer } from "../src/admin/routesHandler";

const app = initApp();
const CREDENTIAL_OFFER_ENDPOINT = `/vci/credential-offer`;

describe("/vci/credential-offer/:id endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("Unauthorized request", async () => {
    const response = await request(app.callback()).get(
      `${CREDENTIAL_OFFER_ENDPOINT}/1`,
    );
    assert.equal(response.status, 404);
  });

  it("Invalid event ID", async () => {
    const response = await request(app.callback())
      .get(`${CREDENTIAL_OFFER_ENDPOINT}/invalid-id`)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 404);
  });

  it("Event not found", async () => {
    const response = await request(app.callback())
      .get(`${CREDENTIAL_OFFER_ENDPOINT}/9999`)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 404);
  });

  it("Generate credential offer successfully", async () => {
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

    const response = await request(app.callback())
      .get(`${CREDENTIAL_OFFER_ENDPOINT}/${eventId}`)
      .set("Cookie", await getSession(app));
    assert.equal(response.status, 200);

    const payload = response.body as ParticipationWithCredentialOffer;
    assert.isObject(payload, "Payload should be an object");
    assert.isNumber(payload.id);
    assert.equal(payload.eventId, eventId);
    assert.isString(payload.credentialOffer);
    assert.isObject(payload.authorizedCode);
    assert.isString(payload.authorizedCode.code);
  });
});
