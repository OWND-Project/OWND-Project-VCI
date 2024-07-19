import * as querystring from "querystring";

import { assert, expect } from "chai";
import request from "supertest";

import store from "../src/store";

import { init } from "../src/app";

import {
  AuthorizationRequest,
  INPUT_DESCRIPTOR_TICKET,
  submissionRequirementTicket,
} from "../src/oid4vp/routesHandler";
import { ClientMetadata, PresentationDefinition } from "../src/oid4vp/types";
import { camelToSnake } from "../src/oid4vp";
import {
  generatePresentationDefinition,
  getClientMetadata,
} from "../src/oid4vp/authRequest";

const app = init();
const username = "username";
const password = "password";

const keyId = process.env.AUTH_REQUEST_SIGN_KEY_ID || "key-1";

const AUTH_REQUEST_ENDPOINT = `/vp/request`;
const REQUEST_URI_ENDPOINT = `/vp/requesturi`;

describe("auth request get endpoint test", () => {
  const baseUrl = process.env.OID4VP_HOST || "";
  const responseUri = process.env.OID4VP_RESPONSE_URI || "";
  const clientId = responseUri;

  const clientMetadata: ClientMetadata = getClientMetadata(clientId, baseUrl);
  const presentationDefinition: PresentationDefinition =
    generatePresentationDefinition(
      [INPUT_DESCRIPTOR_TICKET],
      submissionRequirementTicket,
    );

  const expectedHost = "openid4vp:///vp/auth-request";

  beforeEach(async () => {});

  it("[not prod] auth request should not include request_uri", async () => {
    process.env.ENVIRONMENT = "dev";
    // get records
    const response = await request(app.callback()).get(AUTH_REQUEST_ENDPOINT);
    assert.equal(response.status, 200);

    const payload = response.body as AuthorizationRequest;
    console.debug(payload);
    assert.isObject(payload, "response should be an object");

    const { authRequest } = payload;

    const expectedQueryParams = {
      clientId: "https://example.com/vp/responseuri",
      responseUri: "https://example.com/vp/responseuri",
      clientMetadata: JSON.stringify(camelToSnake(clientMetadata)),
      presentationDefinition: JSON.stringify(
        camelToSnake(presentationDefinition),
      ),
    };

    const url = new URL(authRequest);
    const host = `${url.protocol}//${url.host}${url.pathname}`;

    const queryParams = querystring.parse(url.search.slice(1));
    // host
    expect(host).to.equal(expectedHost);
    // client_id
    expect(queryParams).to.have.property(
      "client_id",
      expectedQueryParams.clientId,
    );
    // nonce
    expect(queryParams).to.have.property("nonce");
    // state
    expect(queryParams).to.have.property("state");
    // response_type
    expect(queryParams).to.have.property("response_type");
    // response_mode
    expect(queryParams).to.have.property("response_mode");
    // client_id_scheme
    expect(queryParams).to.have.property("client_id_scheme", "redirect_uri");
    // response_uri
    expect(queryParams).to.have.property(
      "response_uri",
      expectedQueryParams.responseUri,
    );
    // request_uri (not appeared!)
    expect(queryParams).to.not.have.property("request_uri");
    // client_metadata
    expect(queryParams).to.have.property(
      "client_metadata",
      expectedQueryParams.clientMetadata,
    );
    // presentation_definition
    expect(queryParams).to.have.property("presentation_definition");
    const parsedPd = JSON.parse(<string>queryParams["presentation_definition"]);
    assert.isString(parsedPd.id);
    assert.equal(
      JSON.stringify(parsedPd.input_descriptors),
      JSON.stringify(presentationDefinition.inputDescriptors),
    );
    // submission_requirements
    assert.equal(
      JSON.stringify(parsedPd.submission_requirements),
      JSON.stringify(presentationDefinition.submissionRequirements),
    );
  });

  it("[prod] auth request should include request_uri", async () => {
    process.env.ENVIRONMENT = "prod";
    // get records
    const response = await request(app.callback()).get(AUTH_REQUEST_ENDPOINT);
    assert.equal(response.status, 200);

    const payload = response.body as AuthorizationRequest;
    console.debug(payload);
    assert.isObject(payload, "response should be an object");

    const { authRequest } = payload;

    const expectedQueryParams = {
      response_type: "vp_token",
      client_id: "https://example.com/vp/responseuri",
      request_uri: "https://example.com/vp/requesturi",
    };
    const url = new URL(authRequest);
    const host = `${url.protocol}//${url.host}${url.pathname}`;

    const queryParams = querystring.parse(url.search.slice(1));
    // host
    expect(host).to.equal(expectedHost);
    expect(host).to.equal(expectedHost);
    // client_id
    expect(queryParams).to.have.property(
      "client_id",
      expectedQueryParams.client_id,
    );
    // nonce
    expect(queryParams).to.not.have.property("nonce");
    // state
    expect(queryParams).to.not.have.property("state");
    // response_type
    expect(queryParams).to.not.have.property("response_type");
    // response_mode
    expect(queryParams).to.not.have.property("response_mode");
    // client_id_scheme
    expect(queryParams).to.not.have.property("client_id_scheme");
    // response_uri
    expect(queryParams).to.not.have.property("response_uri");
    // request_uri (appeared!)
    expect(queryParams).to.have.property("request_uri");
    // client_metadata
    expect(queryParams).to.not.have.property("client_metadata");
    // presentation_definition
    expect(queryParams).to.not.have.property("presentation_definition");
  });
});

describe("request object get endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
    const csrResponse = await request(app.callback())
      .post(`/admin/keys/${keyId}/csr`)
      .auth(username, password)
      .send({ subject: "/CN=example_subject" });
    assert.equal(csrResponse.status, 200);
    const csr = csrResponse.body.payload.csr;

    const signSelfCertResponse = await request(app.callback())
      .post(`/admin/keys/${keyId}/signselfcert`)
      .auth(username, password)
      .send({ csr });
    const cert = signSelfCertResponse.body.payload.cert;

    await request(app.callback())
      .post(`/admin/keys/${keyId}/registercert`)
      .auth(username, password)
      .send({ certificates: [cert] });
  });
  it("should be a jwt string", async () => {
    // get records
    const response = await request(app.callback()).get(REQUEST_URI_ENDPOINT);
    assert.equal(response.status, 200);

    const payload = response.text;
    console.debug(payload);
    assert.isString(payload, "response should be a jwt string");
  });
});
