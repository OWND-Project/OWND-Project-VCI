import { assert } from "chai";
import request from "supertest";
import * as jose from "jose";
import ellipticJwk, { newPrivateJwk, publicJwkFromPrivate } from "elliptic-jwk";
import { decodeDisclosure } from "@meeco/sd-jwt";

import {
  generateRandomString,
  generateRandomNumericString,
} from "../../common/src/utils/randomStringUtils";
import keyStore from "../../common/src/store/keyStore";

import { init } from "../src/app";
import store, { NewEmployee } from "../src/store";

const app = init();

describe("POST /token", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
    const employee: NewEmployee = {
      companyName: "companyName",
      employeeNo: "1",
      givenName: "test1",
      familyName: "test2",
      gender: "test3",
      division: "test4",
    };
    await store.registerEmployee(employee);
  });
  it("should return 400 when request body is missing", async () => {
    const response = await request(app.callback()).post("/token");
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_request");
  });

  it("should return 400 when grant_type is not supported", async () => {
    const response = await request(app.callback()).post("/token").send({
      grant_type: "unsupported-type",
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "unsupported_grant_type");
  });

  it("should return 400 when pre-authorized_code is missing", async () => {
    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_grant");
  });

  it("should return 400 when pre-authorized_code is invalid", async () => {
    const employee = await store.getEmployeeByNo("1");
    await store.addPreAuthCode("valid-code", 3600, "12345678", employee?.id!);
    const preAuthorizedCode = "invalid-code";
    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_grant");
  });
  it("should return 400 when the token has expired", async () => {
    const employee = await store.getEmployeeByNo("1");
    const preAuthorizedCode = generateRandomString();
    const userPin = generateRandomNumericString();
    await store.addPreAuthCode(preAuthorizedCode, -1, userPin, employee?.id!);

    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      user_pin: userPin,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_grant");
    assert.equal(
      response.body.error_description,
      "the Pre-Authorized Code has expired",
    );
  });

  it("should return 200 and access token details when correct pre-authorized_code is provided", async () => {
    const employee = await store.getEmployeeByNo("1");
    const preAuthorizedCode = generateRandomString();
    const userPin = generateRandomNumericString();
    await store.addPreAuthCode(
      preAuthorizedCode,
      86400,
      userPin,
      employee?.id!,
    );

    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      user_pin: userPin,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.token_type, "bearer");

    const accessToken = response.body.access_token;
    const storedAccessToken = await store.getAccessToken(accessToken);
    assert.equal(response.body.expires_in, storedAccessToken?.expiresIn);
    assert.equal(response.body.c_nonce, storedAccessToken?.cNonce);
    assert.equal(
      response.body.c_nonce_expires_in,
      storedAccessToken?.cNonceExpiresIn,
    );
  });

  it("should return 400 when the same user_pin is provided again", async () => {
    const employee = await store.getEmployeeByNo("1");
    const preAuthorizedCode = generateRandomString();
    const userPin = generateRandomNumericString();
    await store.addPreAuthCode(
      preAuthorizedCode,
      86400,
      userPin,
      employee?.id!,
    );
    // 1st time
    let response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      user_pin: userPin,
    });
    assert.equal(response.status, 200);
    // 2nd time
    response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      user_pin: userPin,
    });
    assert.equal(response.status, 400);
  });
});

const validAccessTokenMock = async () => {
  const id = await store.addPreAuthCode("dummy code", 30, "dummy-user-pin", 1);
  const accessToken = "validToken";
  const expiresIn = 86400;
  const cNonce = "randomNonce";
  const cNonceExpiresIn = 86400;
  await store.addAccessToken(
    accessToken,
    expiresIn,
    cNonce,
    cNonceExpiresIn,
    id!,
  );
};
const privateJwk = ellipticJwk.newPrivateJwk("P-256");
// @ts-ignore
const privateKey = await jose.importJWK(privateJwk, "ES256");
const jwk = publicJwkFromPrivate(privateJwk);
describe("POST /credential", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
    const employee: NewEmployee = {
      companyName: "companyName",
      employeeNo: "1",
      division: "test4",
      givenName: "test1",
      familyName: "test2",
      gender: "test3",
    };
    await store.registerEmployee(employee);
  });

  describe("401 error cases", () => {
    it("should return 401 when token does not exist", async () => {
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({});
      assert.equal(response.status, 401);
      assert.equal(response.body.error, "invalid_token");
      assert.equal(response.body.error_description, "Invalid access token");
    });

    it("should return 401 when the token has expired", async () => {
      const accessToken = "validToken";
      const expiresIn = -1;
      const cNonce = "";
      const cNonceExpiresIn = 0;
      const id = await store.addPreAuthCode(
        "dummy code",
        30,
        "dummy user pin",
        0,
      );
      await store.addAccessToken(
        accessToken,
        expiresIn,
        cNonce,
        cNonceExpiresIn,
        id!,
      );
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken");
      assert.equal(response.status, 401);
      assert.equal(response.body.error, "invalid_token");
      assert.equal(response.body.error_description, "The access token expired");
    });
  });

  describe("vc+sd-jwt specific cases", async () => {
    it("should return 400 when proof is missing in request body", async () => {
      await validAccessTokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "vc+sd-jwt",
          credential_definition: { type: "EmployeeCredential" },
          proof: {},
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Missing or malformed proof_type",
      );
    });

    it("should return 400 when nonce is valid in JWT payload", async () => {
      const payload = { nonce: "wrong_nonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", jwk })
        .setIssuedAt()
        .setAudience(process.env.CREDENTIAL_ISSUER || "")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccessTokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "vc+sd-jwt",
          credential_definition: { type: "EmployeeCredential" },
          proof: { proof_type: "jwt", jwt: token },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(response.body.error_description, "Failed to verify nonce");
    });
    it("should return 200 when JWK is valid in JWT header", async () => {
      const privateJwk = newPrivateJwk("P-256");
      const { kty, crv, x, y, d } = privateJwk;
      await keyStore.insertECKeyPair({
        kid: "key-1",
        kty,
        crv,
        x,
        y: y || "",
        d,
      });

      const payload = { nonce: "randomNonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", jwk })
        .setIssuedAt()
        .setAudience(process.env.CREDENTIAL_ISSUER || "")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccessTokenMock();
      const body = {
        format: "vc+sd-jwt",
        credential_definition: { vct: "EmployeeIdentificationCredential" },
        proof: { proof_type: "jwt", jwt: token },
      };
      console.log(token);

      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(body);
      assert.equal(response.status, 200);
      assert.equal(response.body.format, "vc+sd-jwt");
      assert.isString(response.body.credential);
      const tmp = response.body.credential.split("~");
      const disclosures = decodeDisclosure(tmp.slice(1, tmp.length - 1));
      console.log("==================================");
      console.log(disclosures);
      assert.equal(disclosures.length, 6);

      assert.equal(disclosures[0].key, "companyName");
      assert.equal(disclosures[0].value, "companyName");

      assert.equal(disclosures[1].key, "employeeNo");
      assert.equal(disclosures[1].value, "1");

      assert.equal(disclosures[2].key, "division");
      assert.equal(disclosures[2].value, "test4");

      assert.equal(disclosures[3].key, "givenName");
      assert.equal(disclosures[3].value, "test1");

      assert.equal(disclosures[4].key, "familyName");
      assert.equal(disclosures[4].value, "test2");

      assert.equal(disclosures[5].key, "gender");
      assert.equal(disclosures[5].value, "test3");
    });
  });
});
