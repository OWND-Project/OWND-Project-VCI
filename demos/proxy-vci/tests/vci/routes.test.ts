import { assert } from "chai";
import request from "supertest";
import ellipticJwk, { newPrivateJwk, publicJwkFromPrivate } from "elliptic-jwk";
import * as jose from "jose";
import nock from "nock";
import { decodeDisclosure } from "@meeco/sd-jwt";

import { init } from "../../src/app";
import store from "../../src/store";
import authStore from "ownd-vci/dist/store/authStore";
import keyStore from "ownd-vci/dist/store/keyStore";
import credentials from "../../src/logic/identityCredential";
import { URL } from "url";
import { xIdResponse } from "ownd-vci/dist/credentials/sd-jwt/types";
import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils";

const app = init();

const privateJwk = ellipticJwk.newPrivateJwk("P-256");
// @ts-ignore
const privateKey = await jose.importJWK(privateJwk, "ES256");
const jwk = publicJwkFromPrivate(privateJwk);

describe("POST /token", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
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
    const preAuthorizedCode = "invalid-code";
    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_grant");
  });
  it("should return 400 when the token has expired", async () => {
    const preAuthorizedCode = generateRandomString();
    const tokenResponse = {
      access_token: "expired-access-token",
      expires_in: -1, // Immediate expiry
      id_token: "some-id-token",
      scope: "some-scope",
      token_type: "Bearer",
    };
    const preAuthCodeId = await authStore.addAuthCode(
      preAuthorizedCode,
      30,
      true,
      "",
      false,
    );

    assert.isDefined(preAuthCodeId);
    if (preAuthCodeId) {
      await store.addXIDAccessToken(tokenResponse, preAuthCodeId);
    }

    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_grant");
    assert.equal(
      response.body.error_description,
      "Invalid pre-authorized_code",
    );
  });

  it("should return 200 and access token details when correct pre-authorized_code is provided", async () => {
    const preAuthorizedCode = generateRandomString();
    const tokenResponse = {
      access_token: "some-access-token",
      expires_in: 86400,
      id_token: "some-id-token",
      scope: "some-scope",
      token_type: "Bearer",
    };
    const preAuthCodeId = await authStore.addAuthCode(
      preAuthorizedCode,
      30,
      true,
      "",
      false,
    );
    assert.isDefined(preAuthCodeId);
    if (preAuthCodeId) {
      await store.addXIDAccessToken(tokenResponse, preAuthCodeId);
    }

    const response = await request(app.callback()).post("/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthorizedCode,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.token_type, "bearer");

    const accessToken = response.body.access_token;
    const storedAccessToken = await authStore.getAccessToken(accessToken);
    assert.equal(response.body.expires_in, storedAccessToken?.expiresIn);
    assert.equal(response.body.c_nonce, storedAccessToken?.cNonce);
    assert.equal(
      response.body.c_nonce_expires_in,
      storedAccessToken?.cNonceExpiresIn,
    );
  });
});

const validAccesstokenMock = async () => {
  const id = await authStore.addAuthCode("dummy code", 30, true, "", true);
  assert.isDefined(id);

  const accessToken = "validToken";
  const expiresIn = 86400;
  const cNonce = "randomNonce";
  const cNonceExpiresIn = 86400;
  if (id) {
    await authStore.addAccessToken(
      accessToken,
      expiresIn,
      cNonce,
      cNonceExpiresIn,
      id,
    );
  }
};

const validAccesstokenMockNotPreAuth = async () => {
  const id = await authStore.addAuthCode("dummy code", 30, false, "", true);
  assert.isDefined(id);

  const accessToken = "validToken";
  const expiresIn = 86400;
  const cNonce = "randomNonce";
  const cNonceExpiresIn = 86400;
  if (id) {
    await authStore.addAccessToken(
      accessToken,
      expiresIn,
      cNonce,
      cNonceExpiresIn,
      id,
    );
  }
};

describe("POST /credential", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });

  describe("401 error cases", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const response = await request(app.callback()).post("/credentials");
      assert.equal(response.status, 401);
      assert.equal(response.body.error, "invalid_token");
      assert.equal(response.body.error_description, "Invalid data received!");
    });

    it("should return 401 when Authorization header does not start with BEARER", async () => {
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "INVALID abc123")
        .send({});
      assert.equal(response.status, 401);
      assert.equal(response.body.error, "invalid_token");
      assert.equal(response.body.error_description, "Invalid data received!");
    });

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
      const id = await authStore.addAuthCode("dummy code", 30, true, "", false);
      assert.isDefined(id);
      if (id) {
        await authStore.addAccessToken(
          accessToken,
          expiresIn,
          cNonce,
          cNonceExpiresIn,
          id,
        );
      }
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken");
      assert.equal(response.status, 401);
      assert.equal(response.body.error, "invalid_token");
      assert.equal(response.body.error_description, "The access token expired");
    });
  });

  describe("400 error cases", () => {
    it("should return 400 when whole body is missing", async () => {
      await validAccesstokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken");

      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_request");
      assert.equal(response.body.error_description, "Invalid data received!");
    });

    it("should return 400 when format is missing in request body", async () => {
      await validAccesstokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({});
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_request");
      assert.equal(
        response.body.error_description,
        "Missing or malformed format",
      );
    });

    it("should return 400 when format is unsupported value", async () => {
      await validAccesstokenMock();
      const payload = { nonce: "randomNonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", jwk })
        .setIssuer("urn:example:issuer")
        .setIssuedAt()
        .setAudience(process.env.CREDENTIAL_ISSUER || "")
        .setExpirationTime("2h")
        .sign(privateKey);
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "unsupported format",
          proof: { proof_type: "jwt", jwt: token },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "unsupported_credential_format");
      assert.equal(
        response.body.error_description,
        "Unsupported Credential Format",
      );
    });
  });
  describe("jwt_vc_json specific cases", async () => {
    it("should return 400 when types is missing in request body", async () => {
      await validAccesstokenMock();
      const payload = { nonce: "randomNonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", jwk })
        .setIssuer("urn:example:issuer")
        .setIssuedAt()
        .setAudience(process.env.CREDENTIAL_ISSUER || "")
        .setExpirationTime("2h")
        .sign(privateKey);
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "jwt_vc_json",
          proof: { proof_type: "jwt", jwt: token },
          credential_definition: {
            // Not compliant with VCI draft-12 E.1.1.5, missing `type` property.
          },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_request");
      assert.equal(
        response.body.error_description,
        "The payload needs types and credentialSubject",
      );
    });

    it("should return 400 when proof is missing in request body", async () => {
      await validAccesstokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "jwt_vc_json",
          types: ["IdentityCredential"],
          credentialSubject: {},
          proof: {},
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Missing or malformed proof_type",
      );
    });

    it("should return 400 when JWT could not be decoded", async () => {
      await validAccesstokenMock();
      let response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "jwt_vc_json",
          types: ["IdentityCredential"],
          proof: { proof_type: "jwt" },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Failed to decode JWT header",
      );

      response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "jwt_vc_json",
          types: ["IdentityCredential"],
          proof: { proof_type: "jwt", jwt: null },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Failed to decode JWT header",
      );

      response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "jwt_vc_json",
          types: ["IdentityCredential"],
          proof: { proof_type: "jwt", jwt: "あ" },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Failed to decode JWT header",
      );

      response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send({
          format: "jwt_vc_json",
          types: ["IdentityCredential"],
          proof: { proof_type: "jwt", jwt: "invalidJWT" },
        });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Failed to decode JWT header",
      );
    });

    const getDefaultInput = async () => {
      const privateJwk = ellipticJwk.newPrivateJwk("secp256k1");
      const currentUnixTime = Math.floor(Date.now() / 1000);
      return {
        privateJwk: ellipticJwk.newPrivateJwk("secp256k1"),
        // @ts-ignore
        privateKey: await jose.importJWK(privateJwk, "ES256K"),
        currentUnixTime: Math.floor(Date.now() / 1000),
        defaultJwtPayload: {
          aud: "audience",
          iat: currentUnixTime,
          nonce: "randomNonce",
        },
        alg: "ES256K",
        jwk: ellipticJwk.publicJwkFromPrivate(privateJwk),
      };
    };
    const getPostPayload = (token: string) => {
      return {
        format: "vc+sd-jwt",
        credential_definition: {
          vct: "IdentityCredential",
        },
        proof: { proof_type: "jwt", jwt: token },
      };
    };

    it("should return 400 when JWK is missing in JWT header", async () => {
      const { defaultJwtPayload, alg, privateKey } = await getDefaultInput();
      const payload = defaultJwtPayload;
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setIssuer("urn:example:issuer")
        .setAudience("urn:example:audience")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccesstokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(getPostPayload(token));
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(
        response.body.error_description,
        "Missing JWK in JWT header",
      );
    });
    it("should return 400 when iss is invalid in JWT payload", async () => {
      const { defaultJwtPayload, alg, jwk, privateKey, currentUnixTime } =
        await getDefaultInput();
      const payload = { ...defaultJwtPayload, iat: currentUnixTime + 5 }; // 現在のUnix時間 + 5（秒）
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg, jwk })
        .setAudience("urn:example:audience")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccesstokenMockNotPreAuth();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(getPostPayload(token));
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(response.body.error_description, "Failed to verify iss");
    });
    it("should return 400 when iat is invalid in JWT payload", async () => {
      const { defaultJwtPayload, alg, jwk, privateKey, currentUnixTime } =
        await getDefaultInput();
      const payload = { ...defaultJwtPayload, iat: currentUnixTime + 6 };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg, jwk })
        .setIssuer("urn:example:issuer")
        .setAudience("urn:example:audience")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccesstokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(getPostPayload(token));
      console.log(`Response ; ${JSON.stringify(response)}`);
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(response.body.error_description, "Failed to verify iat");
    });
    it("should return 400 when nonce is invalid in JWT payload", async () => {
      const { defaultJwtPayload, alg, jwk, privateKey } =
        await getDefaultInput();
      const payload = { ...defaultJwtPayload, nonce: "wrong_nonce" };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg, jwk })
        .setIssuer("urn:example:issuer")
        .setAudience("urn:example:audience")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccesstokenMock();
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(getPostPayload(token));
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_or_missing_proof");
      assert.equal(response.body.error_description, "Failed to verify nonce");
    });
    it("should return 200 when JWK is valid in JWT header", async () => {
      const privateJwk = newPrivateJwk("secp256k1");
      const { kty, crv, x, y, d } = privateJwk;
      await keyStore.insertECKeyPair({
        kid: "key-1",
        kty,
        crv,
        x,
        y: y || "",
        d,
      });
      const { defaultJwtPayload, alg, jwk, privateKey } =
        await getDefaultInput();
      const payload = defaultJwtPayload;
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg, jwk })
        .setIssuer("urn:example:issuer")
        .setAudience("urn:example:audience")
        .setExpirationTime("2h")
        .sign(privateKey);
      await validAccesstokenMock();
      const publicKey = process.env.X_ID_CLIENT_KEY_PAIR_PUBLIC || "";
      const userData = await encryptUserData(
        {
          first_name: "太郎", // 0
          last_name: "テスト", // 1
          sub_char_common_name: "", // 2
          previous_name: "", // 3
          sub_char_previous_name: "", // 4
          year: "2000", // 5
          month: "4", // 6
          date: "2", // 7
          prefecture: "東京都", // 8
          city: "新宿区", // 9
          address: "1-1", // 10
          sub_char_address: "", // 11

          verified_at: 1697247508, // 15
          gender: "1", // 16
        },
        publicKey,
      );
      const xIDApiBaseUrl = process.env.X_ID_API_BASE_URL || "";
      const url = new URL(`${xIDApiBaseUrl}/verification/userdata`);
      const baseUrl = `${url.protocol}//${url.host}`;
      const path = url.pathname;
      nock(baseUrl).get(path).reply(200, userData);
      const response = await request(app.callback())
        .post("/credentials")
        .set("Authorization", "BEARER validToken")
        .send(getPostPayload(token));
      assert.equal(response.status, 200);
      assert.equal(response.body.format, "vc+sd-jwt");
      assert.isString(response.body.credential);
      const tmp = response.body.credential.split("~");
      const disclosures = decodeDisclosure(tmp.slice(1, tmp.length - 1));
      assert.equal(disclosures.length, 17);
      assert.equal(disclosures[0].key, "first_name");
      assert.equal(disclosures[0].value, "太郎");
      assert.equal(disclosures[1].key, "last_name");
      assert.equal(disclosures[1].value, "テスト");
      assert.equal(disclosures[5].key, "year");
      assert.equal(disclosures[5].value, "2000");
      assert.equal(disclosures[6].key, "month");
      assert.equal(disclosures[6].value, "4");
      assert.equal(disclosures[7].key, "date");
      assert.equal(disclosures[7].value, "2");
      assert.equal(disclosures[8].key, "prefecture");
      assert.equal(disclosures[8].value, "東京都");
      assert.equal(disclosures[9].key, "city");
      assert.equal(disclosures[9].value, "新宿区");
      assert.equal(disclosures[10].key, "address");
      assert.equal(disclosures[10].value, "1-1");
      assert.equal(disclosures[12].key, "is_older_than_13");
      assert.equal(disclosures[12].value, true);
      assert.equal(disclosures[13].key, "is_older_than_18");
      assert.equal(disclosures[13].value, true);
      assert.equal(disclosures[14].key, "is_older_than_20");
      assert.equal(disclosures[14].value, true);

      assert.equal(disclosures[15].key, "verified_at");
      assert.equal(disclosures[15].value, "2023-10-14T01:38:28.000Z");
      assert.equal(disclosures[16].key, "gender");
      assert.equal(disclosures[16].value, "男性");
    });
  });
});

async function encryptUserData(userData: xIdResponse, publicKey: string) {
  const encryptedUserData = {
    first_name: userData.first_name, // first_nameは暗号化しない
    last_name: userData.last_name, // last_nameは暗号化しない
    verified_at: userData.verified_at, // verified_atは暗号化しない
  };

  // 除外するプロパティ名（first_nameとlast_name）を指定
  const excludedProperties = ["first_name", "last_name", "verified_at"];

  // userDataの各プロパティをループして暗号化
  for (const property in userData) {
    if (!excludedProperties.includes(property)) {
      // @ts-ignore
      encryptedUserData[property] = await credentials.encrypt(
        // @ts-ignore
        userData[property],
        publicKey,
      );
    }
  }

  return encryptedUserData;
}
