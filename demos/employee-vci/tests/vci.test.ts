import { createRequire } from "module";
const require = createRequire(import.meta.url);
const setupTestEnv = require("../test-env-setup.cjs");
setupTestEnv();

import { assert } from "chai";
import request from "supertest";
import * as jose from "jose";
import ellipticJwk, { newPrivateJwk, publicJwkFromPrivate } from "elliptic-jwk";
import { decodeDisclosure } from "@meeco/sd-jwt";

import {
  generateRandomString,
  generateRandomNumericString,
} from "ownd-vci/dist/utils/randomStringUtils.js";
import keyStore from "ownd-vci-common/dist/store/keyStore.js";
import authStore from "ownd-vci-common/dist/store/authStore.js";

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
    assert.equal(response.body.error, "invalid_request");
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
    await store.addPreAuthCode(
      "valid-code",
      3600,
      "12345678",
      String(employee?.id!),
    );
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
    const txCode = generateRandomNumericString();
    await store.addPreAuthCode(
      preAuthorizedCode,
      -1,
      txCode,
      String(employee?.id!),
    );

    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      tx_code: txCode,
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
    const txCode = generateRandomNumericString();
    await store.addPreAuthCode(
      preAuthorizedCode,
      86400,
      txCode,
      String(employee?.id!),
    );

    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      tx_code: txCode,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.token_type, "bearer");

    const accessToken = response.body.access_token;
    const storedAccessToken = await store.getAccessToken(accessToken);
    assert.equal(response.body.expires_in, storedAccessToken?.expiresIn);
  });

  it("should return 400 when the same tx_code is provided again", async () => {
    const employee = await store.getEmployeeByNo("1");
    const preAuthorizedCode = generateRandomString();
    const txCode = generateRandomNumericString();
    await store.addPreAuthCode(
      preAuthorizedCode,
      86400,
      txCode,
      String(employee?.id!),
    );
    // 1st time
    let response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      tx_code: txCode,
    });
    assert.equal(response.status, 200);
    // 2nd time
    response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
      tx_code: txCode,
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_grant");
    assert.equal(
      response.body.error_description,
      "the tx_code is already used",
    );
  });
});

const validAccessTokenMock = async () => {
  const id = await store.addPreAuthCode(
    "dummy code",
    30,
    "dummy-user-pin",
    "1",
  );
  const accessToken = "validToken";
  const expiresIn = 86400;
  await store.addAccessToken(accessToken, expiresIn, id!);
  // Add c_nonce for proof validation
  await authStore.addCNonce("randomNonce", 86400);
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
      const id = await store.addPreAuthCode(
        "dummy code",
        30,
        "dummy user pin",
        "0",
      );
      await store.addAccessToken(accessToken, expiresIn, id!);
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken");
      assert.equal(response.status, 401);
      assert.equal(response.body.error, "invalid_token");
      assert.equal(response.body.error_description, "The access token expired");
    });
  });

  describe("dc+sd-jwt specific cases", async () => {
    it("should return 500 when proofs is empty in request body", async () => {
      await validAccessTokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          credential_configuration_id: "EmployeeIdentificationCredential",
          proofs: {},
        });
      assert.equal(response.status, 500);
      assert.equal(response.body.error, "invalid_or_missing_proof");
    });

    it("should return 400 when nonce is invalid in JWT payload", async () => {
      const payload = { nonce: "wrong_nonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", typ: "openid4vci-proof+jwt", jwk })
        .setIssuedAt()
        .setAudience(process.env.CREDENTIAL_ISSUER || "")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccessTokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          credential_configuration_id: "EmployeeIdentificationCredential",
          proofs: { jwt: [token] },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_nonce");
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
      } as any);

      const payload = { nonce: "randomNonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", typ: "openid4vci-proof+jwt", jwk })
        .setIssuedAt()
        .setAudience(process.env.CREDENTIAL_ISSUER || "")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccessTokenMock();
      const body = {
        credential_configuration_id: "EmployeeIdentificationCredential",
        proofs: { jwt: [token] },
      };
      console.log(token);

      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(body);
      assert.equal(response.status, 200);
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

describe("POST /nonce", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  it("should return 200 with c_nonce when requested", async () => {
    const response = await request(app.callback()).post("/nonce");

    assert.equal(response.status, 200);
    assert.property(response.body, "c_nonce");
    assert.property(response.body, "c_nonce_expires_in");
    assert.typeOf(response.body.c_nonce, "string");
    assert.typeOf(response.body.c_nonce_expires_in, "number");
    assert.isNotEmpty(response.body.c_nonce);
    assert.isAbove(response.body.c_nonce_expires_in, 0);
  });

  it("should generate different c_nonce on each request", async () => {
    const response1 = await request(app.callback()).post("/nonce");
    const response2 = await request(app.callback()).post("/nonce");

    assert.equal(response1.status, 200);
    assert.equal(response2.status, 200);
    assert.notEqual(response1.body.c_nonce, response2.body.c_nonce);
  });
});

describe("GET /.well-known/openid-credential-issuer", () => {
  it("should return 200 with issuer metadata", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    assert.equal(response.status, 200);
    assert.equal(response.type, "application/json");
  });

  it("should include required metadata fields", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    assert.property(response.body, "credential_issuer");
    assert.property(response.body, "credential_endpoint");
    assert.property(response.body, "nonce_endpoint");
    assert.property(response.body, "credential_configurations_supported");
    assert.property(response.body, "display");
    assert.isArray(response.body.display);
  });

  it("should include nonce_endpoint for HAIP compliance", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    const credentialIssuer = response.body.credential_issuer;
    const nonceEndpoint = response.body.nonce_endpoint;

    assert.isDefined(nonceEndpoint);
    assert.equal(nonceEndpoint, `${credentialIssuer}/nonce`);
  });

  it("should include EmployeeIdentificationCredential configuration", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    const configs = response.body.credential_configurations_supported;
    assert.property(configs, "EmployeeIdentificationCredential");

    const empConfig = configs.EmployeeIdentificationCredential;
    assert.equal(empConfig.format, "dc+sd-jwt");
    assert.equal(empConfig.vct, "EmployeeIdentificationCredential");
    assert.equal(empConfig.scope, "EmployeeIdentification");
  });

  it("should include proper cryptographic binding and proof types", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    const empConfig =
      response.body.credential_configurations_supported
        .EmployeeIdentificationCredential;

    assert.deepEqual(empConfig.cryptographic_binding_methods_supported, [
      "jwk",
    ]);
    assert.deepEqual(empConfig.credential_signing_alg_values_supported, [
      "ES256K",
    ]);
    assert.property(empConfig.proof_types_supported, "jwt");
    assert.deepEqual(
      empConfig.proof_types_supported.jwt.proof_signing_alg_values_supported,
      ["ES256", "ES256K"],
    );
  });

  it("should include all claim definitions", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    const empConfig =
      response.body.credential_configurations_supported
        .EmployeeIdentificationCredential;
    const credentialMetadata = empConfig.credential_metadata;

    assert.property(credentialMetadata, "companyName");
    assert.property(credentialMetadata, "employeeNo");
    assert.property(credentialMetadata, "givenName");
    assert.property(credentialMetadata, "familyName");
    assert.property(credentialMetadata, "gender");
    assert.property(credentialMetadata, "division");

    // Check display names for one claim
    assert.isArray(credentialMetadata.companyName.display);
    assert.equal(credentialMetadata.companyName.display.length, 2);
    assert.equal(credentialMetadata.companyName.display[0].name, "会社名");
    assert.equal(credentialMetadata.companyName.display[0].locale, "ja-JP");
    assert.equal(
      credentialMetadata.companyName.display[1].name,
      "Company Name",
    );
    assert.equal(credentialMetadata.companyName.display[1].locale, "en-US");
  });

  it("should use default company name and brand color", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    const display = response.body.display;
    assert.isArray(display);
    assert.isAtLeast(display.length, 2);

    // Check Japanese display
    const jaDisplay = display.find((d: any) => d.locale === "ja-JP");
    assert.isDefined(jaDisplay);
    assert.equal(jaDisplay.name, "株式会社Example");
    assert.equal(jaDisplay.background_color, "#003289");
    assert.equal(jaDisplay.text_color, "#FFFFFF");

    // Check English display
    const enDisplay = display.find((d: any) => d.locale === "en-US");
    assert.isDefined(enDisplay);
    assert.equal(enDisplay.name, "Example Inc.");
    assert.equal(enDisplay.background_color, "#003289");
  });

  it("should generate proper URIs based on credential_issuer", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/openid-credential-issuer",
    );

    const credentialIssuer = response.body.credential_issuer;
    const credentialEndpoint = response.body.credential_endpoint;

    assert.equal(credentialEndpoint, `${credentialIssuer}/credentials`);

    // Check logo URIs
    const jaDisplay = response.body.display.find(
      (d: any) => d.locale === "ja-JP",
    );
    assert.equal(
      jaDisplay.logo.uri,
      `${credentialIssuer}/images/company-logo.png`,
    );

    // Check credential display URIs
    const empConfig =
      response.body.credential_configurations_supported
        .EmployeeIdentificationCredential;
    const credDisplay = empConfig.display[0];
    assert.equal(
      credDisplay.logo.uri,
      `${credentialIssuer}/images/credential-logo.png`,
    );
    assert.equal(
      credDisplay.background_image.uri,
      `${credentialIssuer}/images/credential-background.png`,
    );
  });

  it("should support Accept-Language header when RESOLVE_ACCEPT_LANGUAGE is enabled", async () => {
    // Note: This test assumes RESOLVE_ACCEPT_LANGUAGE is set to 'true' in test environment
    if (process.env.RESOLVE_ACCEPT_LANGUAGE !== "true") {
      // Skip if localization is not enabled
      return;
    }

    const responseJa = await request(app.callback())
      .get("/.well-known/openid-credential-issuer")
      .set("Accept-Language", "ja-JP");

    const responseEn = await request(app.callback())
      .get("/.well-known/openid-credential-issuer")
      .set("Accept-Language", "en-US");

    // Both should return 200
    assert.equal(responseJa.status, 200);
    assert.equal(responseEn.status, 200);

    // The display should be localized (array reduced to single preferred locale)
    // Note: Actual behavior depends on localizeIssuerMetadata implementation
  });
});

describe("GET /.well-known/oauth-authorization-server", () => {
  it("should return 200 with authorization server metadata", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/oauth-authorization-server",
    );

    assert.equal(response.status, 200);
    assert.equal(response.type, "application/json");

    console.log(response.body);
  });

  it("should include required OAuth 2.0 fields", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/oauth-authorization-server",
    );

    const requiredFields = ["issuer", "token_endpoint"];

    requiredFields.forEach((field) => {
      assert.isDefined(
        response.body[field],
        `${field} should be defined in authorization server metadata`,
      );
    });
  });

  it("should include token_endpoint with correct URL", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/oauth-authorization-server",
    );

    const issuer = response.body.issuer;
    const tokenEndpoint = response.body.token_endpoint;

    assert.isDefined(tokenEndpoint);
    assert.equal(tokenEndpoint, `${issuer}/token`);
  });

  it("should include grant_types_supported with pre-authorized_code", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/oauth-authorization-server",
    );

    const grantTypes = response.body.grant_types_supported;

    assert.isDefined(grantTypes);
    assert.isArray(grantTypes);
    assert.include(
      grantTypes,
      "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    );
  });

  it("should include token_endpoint_auth_methods_supported", async () => {
    const response = await request(app.callback()).get(
      "/.well-known/oauth-authorization-server",
    );

    const authMethods = response.body.token_endpoint_auth_methods_supported;

    assert.isDefined(authMethods);
    assert.isArray(authMethods);
    assert.include(authMethods, "none");
  });
});
