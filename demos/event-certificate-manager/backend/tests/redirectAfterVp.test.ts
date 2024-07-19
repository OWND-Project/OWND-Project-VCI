import { generateRedirectUri } from "../src/oid4vp/routesHandler";
import store from "../src/store";
import {
  defaultFixtureEvent,
  defaultFixtureTicket,
  fixtureEvent,
  fixtureTicket,
} from "./tickets.test";
import { assert } from "chai";
import url from "url";

describe("generateRedirectUri", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("should concatenate eventId to baseUri", async () => {
    // Arrange
    const baseUri = "http://example.com/#/vci/credential-offer";
    process.env.OID4VP_REDIRECT_URI_AFTER_DIRECT_POST = baseUri;
    const eventId = await fixtureEvent(defaultFixtureEvent);
    const ticket = await fixtureTicket(eventId, defaultFixtureTicket);

    const result = await generateRedirectUri(ticket.ticketNo);

    assert.ok(result.ok);
    assert.equal(result.payload, `${baseUri}/${eventId}`);
  });
});
