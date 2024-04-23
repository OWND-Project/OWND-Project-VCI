import { URL } from "url";

import { assert } from "chai";
import request from "supertest";
import nock from "nock";

import { init } from "../src/app";
import store from "../src/store";
import keyStore from "../../../src/store/keyStore";
import { CredentialOffer } from "../../../src/oid4vci/types";

const app = init();
const username = "username";
const password = "password";

describe("/admin/keys/new endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post("/admin/keys/new");
    assert.equal(response.status, 401);
  });
  it("Bad Request 1", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password);
    assert.equal(response.status, 400);
  });
  it("Bad Request 2", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({});
    assert.equal(response.status, 400);
  });
  it("Created Successfully (default curve)", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
    assert.equal(response.status, 201);
    const row = await keyStore.getEcKeyPair("key-1");
    assert.equal(row?.kid, "key-1");
    assert.equal(row?.kty, "EC");
    assert.equal(row?.crv, "P-256");
    assert.equal(row?.revokedAt, null);
  });
  it("Created Successfully (P-256)", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1", curve: "P-256" });
    assert.equal(response.status, 201);
    const row = await keyStore.getEcKeyPair("key-1");
    assert.equal(row?.kid, "key-1");
    assert.equal(row?.kty, "EC");
    assert.equal(row?.crv, "P-256");
    assert.equal(row?.revokedAt, null);
  });
  it("Created Successfully (secp256k1)", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1", curve: "secp256k1" });
    assert.equal(response.status, 201);
    const row = await keyStore.getEcKeyPair("key-1");
    assert.equal(row?.kid, "key-1");
    assert.equal(row?.kty, "EC");
    assert.equal(row?.crv, "secp256k1");
    assert.equal(row?.revokedAt, null);
  });
  it("Created Successfully (Ed25519)", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1", curve: "Ed25519" });
    assert.equal(response.status, 201);
    const row = await keyStore.getEcKeyPair("key-1");
    assert.equal(row?.kid, "key-1");
    assert.equal(row?.kty, "OKP");
    assert.equal(row?.crv, "Ed25519");
    assert.equal(row?.revokedAt, null);
  });
  it("Duplicated Error", async () => {
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
    const response = await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
    assert.equal(response.status, 409);
  });
});

describe("/admin/keys/:kid test", () => {
  before(async () => {
    await store.destroyDb();
    await store.createDb();
    await keyStore.destroyDb();
    await keyStore.createDb();
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
  });
  it("Not found", async () => {
    const response = await request(app.callback())
      .get("/admin/keys/key-0")
      .auth(username, password);
    assert.equal(response.status, 404);
  });
  it("Got Successfully", async () => {
    const response = await request(app.callback())
      .get("/admin/keys/key-1")
      .auth(username, password);
    assert.equal(response.status, 200);

    const body = response.body;
    assert.isObject(body, "Response body should be an object");
    assert.equal(body.status, "success", 'Status should be "success"');

    // payload の確認
    const payload = body.payload;
    assert.isObject(payload, "Payload should be an object");
    assert.equal(payload.kid, "key-1", 'kid should be "key-1"');
    assert.equal(payload.kty, "EC", 'kty should be "EC"');
    assert.equal(payload.crv, "P-256", 'crv should be "P-256"');

    // x と y の値がブランクではないことの確認
    assert.isString(payload.x, "x should be a string");
    assert.notEqual(payload.x, "", "x should not be blank");
    assert.isString(payload.y, "y should be a string");
    assert.notEqual(payload.y, "", "y should not be blank");

    // payload の存在しない d プロパティの確認
    assert.notExists(payload.d, 'Property "d" should not exist in payload');
  });
  it("Gone", async () => {
    await keyStore.revokeECKeyPair("key-1");
    const response = await request(app.callback())
      .get("/admin/keys/key-1")
      .auth(username, password);
    assert.equal(response.status, 410);
  });
});

describe("/admin/keys/:kid/revoke test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Not found", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/key-1/revoke")
      .auth(username, password);
    assert.equal(response.status, 404);
  });
  it("Revoked Successfully", async () => {
    // gen key
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });

    // before revoke
    let row = await keyStore.getEcKeyPair("key-1");
    assert.equal(row?.revokedAt, null);

    const beforeRevoke = getCurrentUtcTimeString();

    // revoke key
    const response = await request(app.callback())
      .post("/admin/keys/key-1/revoke")
      .auth(username, password);
    assert.equal(response.status, 200);

    const afterRevoke = getCurrentUtcTimeString();

    // get key
    row = await keyStore.getEcKeyPair("key-1");
    assert.isTrue(
      row?.revokedAt! >= beforeRevoke && row?.revokedAt! <= afterRevoke,
      "revokedAt should be within the time of test execution",
    );
  });
});

describe("/admin/keys/:kid/csr test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(
      "/admin/keys/key-1/csr",
    );
    assert.equal(response.status, 401);
  });

  it("Bad Request", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/key-1/csr")
      .auth(username, password)
      .send({});
    assert.equal(response.status, 400);
  });

  it("CSR Created Successfully", async () => {
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
    const response = await request(app.callback())
      .post("/admin/keys/key-1/csr")
      .auth(username, password)
      .send({ subject: "example_subject" });
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "success");
  });
});

describe("/admin/keys/:kid/signselfcert endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(
      "/admin/keys/key-1/signselfcert",
    );
    assert.equal(response.status, 401);
  });

  it("Bad Request", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/key-1/signselfcert")
      .auth(username, password)
      .send({});
    assert.equal(response.status, 400);
  });

  it("Sign Self Cert Successfully", async () => {
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });

    const csrResponse = await request(app.callback())
      .post("/admin/keys/key-1/csr")
      .auth(username, password)
      .send({ subject: "/CN=example_subject" });
    assert.equal(csrResponse.status, 200);
    const csr = csrResponse.body.payload.csr;

    const signSelfCertResponse = await request(app.callback())
      .post("/admin/keys/key-1/signselfcert")
      .auth(username, password)
      .send({ csr });

    assert.equal(signSelfCertResponse.status, 200);
    assert.equal(signSelfCertResponse.body.status, "success");
  });
});

describe("/admin/keys/:kid/registercert endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(
      "/admin/keys/key-1/registercert",
    );
    assert.equal(response.status, 401);
  });

  it("Bad Request", async () => {
    const response = await request(app.callback())
      .post("/admin/keys/key-1/registercert")
      .auth(username, password)
      .send({});
    assert.equal(response.status, 400);
  });

  it("Register Cert Successfully", async () => {
    await request(app.callback())
      .post("/admin/keys/new")
      .auth(username, password)
      .send({ kid: "key-1" });
    const csrResponse = await request(app.callback())
      .post("/admin/keys/key-1/csr")
      .auth(username, password)
      .send({ subject: "/CN=example_subject" });
    assert.equal(csrResponse.status, 200);
    const csr = csrResponse.body.payload.csr;

    const signSelfCertResponse = await request(app.callback())
      .post("/admin/keys/key-1/signselfcert")
      .auth(username, password)
      .send({ csr: csr });
    assert.equal(signSelfCertResponse.status, 200);

    const cert = signSelfCertResponse.body.payload.cert;

    const registerCertResponse = await request(app.callback())
      .post("/admin/keys/key-1/registercert")
      .auth(username, password)
      .send({ certificates: [cert] });

    const certificates = await keyStore.getX509Chain("key-1");

    assert.equal(certificates?.length, 1);
    assert.equal(registerCertResponse.status, 200);
    assert.equal(registerCertResponse.body.status, "success");
  });
});

describe("Root path test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("should respond with oauth2AuthorizationUrl and set a session_id cookie", async () => {
    const response = await request(app.callback()).get("/");

    // 1. Check HTTP status
    assert.equal(response.status, 200);

    // 2. Check if session_id cookie is set
    const sessionId = response.headers["set-cookie"][0]
      .split(";")[0]
      .replace("session_id=", "");
    assert.isOk(sessionId);

    // 3. Check if session is stored in the database with correct state
    const storedSession = await store.getSession(sessionId);
    assert.isNotNull(storedSession);
    assert.isNotNull(storedSession?.state);

    // 4. Check if the sessionId is included in the response text (as part of the oauth2AuthorizationUrl)
    assert.include(response.text, storedSession?.state!);
  });

  it("should respond with callback url and get a access token", async () => {
    const response = await request(app.callback()).get("/");
    const cookie = response.headers["set-cookie"][0]; // session_idのクッキーを取得

    const sessionId = cookie.split(";")[0].replace("session_id=", "");
    const storedSession = await store.getSession(sessionId);
    const state = storedSession!.state;

    assert.equal(storedSession?.checkedAt, null);

    const tokenEndpoint = process.env.OAUTH2_TOKEN_ENDPOINT || "";
    const url = new URL(tokenEndpoint);

    const accessTokenValue = "some_access_token";
    nock(`${url.protocol}//${url.host}`).post(url.pathname).reply(200, {
      access_token: accessTokenValue,
      expires_in: 3600,
      id_token: "some_id_token",
      scope: "openid",
      token_type: "Bearer",
    });

    // 認可サーバーからcodeがリダイレクトされてきた想定でcallbackを呼び出す
    const callbackResponse = await request(app.callback())
      .get(`/callback?code=xxx&state=${state}`)
      .set("Cookie", [cookie]);

    assert.equal(callbackResponse.status, 302);

    if (!process.env.CREDENTIAL_OFFER_ENDPOINT) {
      assert.fail("CREDENTIAL_OFFER_ENDPOINT is not set");
    }

    assert.include(
      callbackResponse.headers.location,
      process.env.CREDENTIAL_OFFER_ENDPOINT,
    );

    // 当該stateに対応するsessionが無効化されていること
    const storedSessionAfter = await store.getSession(sessionId);
    assert.notEqual(storedSessionAfter?.checkedAt, null);

    callbackResponse.headers.location;
    const encodedCredentialOffer = callbackResponse.headers.location
      .split("?")[1]
      .split("=")[1];
    const decodedCredentialOffer = decodeURIComponent(encodedCredentialOffer);

    const credentialOffer = JSON.parse(
      decodedCredentialOffer,
    ) as CredentialOffer;
    const preAuthorizedCode =
      credentialOffer.grants[
        "urn:ietf:params:oauth:grant-type:pre-authorized_code"
      ]["pre-authorized_code"];
    const accessToken = await store.getXIDAccessToken(preAuthorizedCode);
    assert.isNotNull(accessToken);
    assert.equal(accessToken?.token, accessTokenValue);
    assert.equal(accessToken?.expiresIn, 3600);
  });
});

function getCurrentUtcTimeString() {
  const date = new Date().toISOString();
  return date.split("T")[0] + " " + date.split("T")[1].slice(0, 8);
}
