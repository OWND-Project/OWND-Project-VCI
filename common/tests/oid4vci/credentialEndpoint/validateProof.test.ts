import { assert } from "chai";
import ellipticJwk, { publicJwkFromPrivate } from "elliptic-jwk";
import * as jose from "jose"; // joseライブラリを使用しています。

import { validateProof } from "../../../src/oid4vci/credentialEndpoint/validateProof"; // 適切なパスに置き換えてください。

const privateJwk = ellipticJwk.newPrivateJwk("P-256");
// @ts-ignore
const privateKey = await jose.importJWK(privateJwk, "ES256");
const jwk = publicJwkFromPrivate(privateJwk);

describe("validateProof function", () => {
  const INVALID_OR_MISSING_PROOF = "invalid_or_missing_proof"; // この値は実際の値に置き換えてください。
  const credentialIssuer = "https://example.com"; // 適切なCredential Issuer URLに置き換えてください。
  const cNonce = "test-cnonce"; // テスト用のcNonceを設定してください。
  const createdAt = new Date().toISOString();
  const expiresIn = 3600; // 1時間の有効期限
  const proofElements = {
    cNonce,
    createdAt,
    expiresIn,
  };

  it("should return an error if proof_type is missing or malformed", async () => {
    const proof = { jwt: "dummy-jwt" }; // proof_typeがない場合
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Missing or malformed proof_type");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  // JWTのデコードに失敗した場合のテスト
  it("should return an error if JWT header decoding fails", async () => {
    const proof = { proof_type: "jwt", jwt: "invalid-jwt" };
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Failed to decode JWT header");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  it("should return an error if JWK is missing in JWT header", async () => {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: "ES256" })
      .setIssuedAt()
      .setIssuer("urn:example:issuer")
      .setAudience("urn:example:audience")
      .setExpirationTime("2h")
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Missing JWK in JWT header");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  it("should return an error if JWT verification fails", async () => {
    const anotherPrivateJwk = ellipticJwk.newPrivateJwk("P-256");
    const token = await new jose.SignJWT({})
      .setProtectedHeader({
        alg: "ES256",
        jwk: publicJwkFromPrivate(anotherPrivateJwk),
      })
      .setIssuedAt()
      .setIssuer("urn:example:issuer")
      .setAudience("urn:example:audience")
      .setExpirationTime("2h")
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Failed to verify JWT");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  it("should return an error if iss verification fails 1", async () => {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: "ES256", jwk })
      .setIssuedAt()
      .setAudience(credentialIssuer)
      .setExpirationTime("2h")
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Failed to verify iss");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });
  it("should return an error if iss verification fails 2", async () => {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: "ES256", jwk })
      .setIssuedAt()
      .setAudience(credentialIssuer)
      .setExpirationTime("2h")
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    const result = await validateProof(proof, credentialIssuer, proofElements, {
      preAuthorizedFlow: true,
      supportAnonymousAccess: false,
    });
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Failed to verify iss");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });
  it("should return an error if iat verification fails", async () => {
    const token = await new jose.SignJWT({ nonce: cNonce })
      .setProtectedHeader({
        alg: "ES256",
        jwk: publicJwkFromPrivate(privateJwk),
      })
      .setIssuer("urn:example:issuer")
      .setAudience(credentialIssuer)
      .setExpirationTime("2h")
      // iatを意図的に設定しない
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "Failed to verify iat");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });
  it("should return an error if c_nonce is expired", async () => {
    const token = await new jose.SignJWT({ nonce: cNonce })
      .setProtectedHeader({
        alg: "ES256",
        jwk: publicJwkFromPrivate(privateJwk),
      })
      .setIssuedAt()
      .setIssuer("urn:example:issuer")
      .setAudience(credentialIssuer)
      .setExpirationTime("2h")
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    // 過去の日付を作成日として渡す
    const pastDate = new Date(
      Date.now() - (expiresIn * 1000 + 1000),
    ).toISOString();
    const result = await validateProof(proof, credentialIssuer, {
      cNonce,
      expiresIn,
      createdAt: pastDate,
    });
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_OR_MISSING_PROOF);
      assert.equal(error_description, "The c_nonce expired");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });
  it("should return a valid payload if all verifications pass", async () => {
    const token = await new jose.SignJWT({ nonce: cNonce })
      .setProtectedHeader({ alg: "ES256", jwk })
      .setIssuedAt()
      .setIssuer("urn:example:issuer")
      .setAudience(credentialIssuer)
      .setExpirationTime("2h")
      .sign(privateKey);
    const proof = { proof_type: "jwt", jwt: token };
    const result = await validateProof(proof, credentialIssuer, proofElements);
    if (result.ok) {
      const { jwt } = result.payload;
      assert.deepEqual(jwt.header.jwk, publicJwkFromPrivate(privateJwk));
    } else {
      assert.fail("result.ok is false when it should be true");
    }
  });
});
