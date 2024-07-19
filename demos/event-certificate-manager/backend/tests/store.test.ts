import { assert } from "chai";
import store, {
  addPreAuthCodeAsTicket,
  getEventAndTicketByAuthCode,
  NewEvent,
  registerEvent,
} from "../src/store";
import {
  getAllParticipation,
  getParticipationById,
  addPreAuthCodeAsParticipation,
  getPreAuthCodeForParticipationCredentialAndEvent,
  addAccessToken,
} from "../src/store";

describe("Store functions test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("Get all participations with no data", async () => {
    const participations = await getAllParticipation();
    assert.equal(participations.length, 0);
  });

  it("Get all participations with data", async () => {
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };

    const eventId = await store.registerEvent(event);
    await addPreAuthCodeAsParticipation("test-code", 3600, "1234", eventId);

    const participations = await getAllParticipation();
    assert.equal(participations.length, 1);
    assert.equal(participations[0].eventId, eventId);
  });

  it("Get participation by ID with no data", async () => {
    const participation = await getParticipationById("1");
    assert.isNull(participation);
  });

  it("Get participation by ID with data", async () => {
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };

    const eventId = await store.registerEvent(event);
    const participation = await addPreAuthCodeAsParticipation(
      "test-code",
      3600,
      "1234",
      eventId,
    );

    const fetchedParticipation = await getParticipationById(
      String(participation.id),
    );
    assert.isNotNull(fetchedParticipation);
    assert.equal(fetchedParticipation!.eventId, eventId);
    assert.equal(fetchedParticipation!.authorizedCode.code, "test-code");
  });

  it("Add pre-auth code as participation", async () => {
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };

    const eventId = await store.registerEvent(event);
    const code = "test-code";
    const expiresIn = 3600;
    const userPin = "1234";
    const participation = await addPreAuthCodeAsParticipation(
      code,
      expiresIn,
      userPin,
      eventId,
    );

    assert.isObject(participation);
    assert.equal(participation.eventId, eventId);
    assert.equal(participation.authorizedCode.code, code);
    assert.equal(participation.authorizedCode.expiresIn, expiresIn);
    assert.equal(participation.authorizedCode.userPin, userPin);
  });

  it("Get pre-auth code and event", async () => {
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };

    const eventId = await store.registerEvent(event);
    const code = "test-code";
    const expiresIn = 3600;
    const userPin = "1234";
    await addPreAuthCodeAsParticipation(code, expiresIn, userPin, eventId);

    const result = await getPreAuthCodeForParticipationCredentialAndEvent(code);
    assert.isNotNull(result);
    assert.equal(result!.event.id, eventId);
    assert.equal(result!.storedAuthCode.code, code);
  });

  it("Add access token", async () => {
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };

    const eventId = await store.registerEvent(event);
    const code = "test-code";
    const expiresIn = 3600;
    const userPin = "1234";
    const participation = await addPreAuthCodeAsParticipation(
      code,
      expiresIn,
      userPin,
      eventId,
    );

    const accessToken = "access-token";
    const cNonce = "c-nonce";
    const cNonceExpiresIn = 3600;

    await addAccessToken(
      accessToken,
      expiresIn,
      cNonce,
      cNonceExpiresIn,
      participation.authorizedCode.id,
    );

    const result = await getPreAuthCodeForParticipationCredentialAndEvent(code);
    assert.isNotNull(result);
    assert.equal(result!.event.id, eventId);
    assert.equal(result!.storedAuthCode.code, code);
  });

  it("Get event and ticket by auth code with no data", async () => {
    const result = await getEventAndTicketByAuthCode("non-existent-code");
    assert.isNull(result);
  });

  it("Get event and ticket by auth code with data", async () => {
    const event: NewEvent = {
      name: "a event",
      description: "event description",
      location: "event location",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      url: "url",
      organizerUrl: "organizer url",
      organizerName: "organizer name",
    };

    const eventId = await registerEvent(event);
    const code = "test-code";
    const expiresIn = 3600;
    const userPin = "1234";
    const ticket = await addPreAuthCodeAsTicket(
      code,
      expiresIn,
      userPin,
      eventId,
    );

    const result = await getEventAndTicketByAuthCode(code);
    assert.isNotNull(result);
    assert.equal(result!.event.id, eventId);
    assert.equal(result!.ticketNo, ticket.ticketNo);
  });
});
