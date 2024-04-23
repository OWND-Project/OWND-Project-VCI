import { assert } from "chai";
import {
  getDisclosableClaims,
  issueFlatCredential,
} from "../../../../src/credentials/sd-jwt/issuer";
import { CRV, newPrivateJwk, publicJwkFromPrivate } from "elliptic-jwk";
import { importJWK, jwtVerify } from "jose";
import { base64encode, verifySDJWT } from "@meeco/sd-jwt";
import crypto from "crypto";
import { KTY } from "elliptic-jwk/dist/types/src/ec/types";

describe("test getDisclosableClaims", () => {
  it("should return _sd", () => {
    const privateJwk = newPrivateJwk("secp256k1");
    const publicJwk = publicJwkFromPrivate(privateJwk);
    const claims = {
      cnf: publicJwk,
      iat: 1,
      iss: "",
      vct: "",
      first_name: "",
      is_order_than_15: false,
      is_order_than_18: false,
      is_order_than_20: false,
      is_order_than_65: false,
      last_name: "",
      verified_at: 0,
    };
    const expect = [
      "first_name",
      "is_order_than_15",
      "is_order_than_18",
      "is_order_than_20",
      "is_order_than_65",
      "last_name",
      "verified_at",
    ];
    const result = getDisclosableClaims(claims);
    assert.deepEqual([...result].sort(), [...expect].sort());
  });
});

describe("test issueFlatCredential", () => {
  it("issue and verify credential", async () => {
    const issuerPrivateJwk = newPrivateJwk("secp256k1");
    const issuerPublicJwk = publicJwkFromPrivate(issuerPrivateJwk);

    const publicKey = await importJWK(issuerPublicJwk, "ES256K");

    const tbsClaims = {
      cnf: publicJwkFromPrivate(newPrivateJwk("secp256k1")),
      iat: 0,
      type: "",
      iss: "",
      verified_at: 0,
      last_name: "",
      first_name: "",
      is_order_than_15: false,
      is_order_than_18: false,
      is_order_than_20: false,
      is_order_than_65: false,
    };
    const credential = await issueFlatCredential(
      tbsClaims,
      issuerPrivateJwk,
      [],
    );

    assert.isString(credential);
    assert.equal((credential.match(/\./g) || []).length, 2);

    const result = await verifySDJWT(
      credential,
      async (jwt) => {
        try {
          await jwtVerify(jwt, publicKey);
          return true;
        } catch (e) {
          return false;
        }
      },
      // eslint-disable-next-line no-unused-vars
      (hashAlg: string) => {
        // @ts-ignore
        const hasher = (data) => {
          const digest = crypto.createHash("sha256").update(data).digest();
          return base64encode(digest);
        };
        return Promise.resolve(hasher);
      },
    );
    assert.isObject(result);
  });

  it("valid x5c jwt", async () => {
    const issuerPrivateJwk = {
      kty: "EC" as KTY,
      crv: "secp256k1" as CRV,
      x: "zbmfCiY-9W68azyCB5Tq-7fZ374HvJvLVvkYFOcb6FE",
      y: "qwXg_LYLX4FWsCHmeqGg1Ug050HNLs9YPj2GZTJkYQI",
      d: "BVskTbJVCxMDQxL6nC-1Hxetgx_NOlZQbQ9B8X8zA0Y",
    };
    const issuerPublicJwk = publicJwkFromPrivate(issuerPrivateJwk);
    /*
    -----BEGIN PUBLIC KEY-----
    MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEzbmfCiY+9W68azyCB5Tq+7fZ374HvJvL
    VvkYFOcb6FGrBeD8tgtfgVawIeZ6oaDVSDTnQc0uz1g+PYZlMmRhAg==
    -----END PUBLIC KEY-----
     */

    const publicKey = await importJWK(issuerPublicJwk, "ES256K");
    const x5c = [
      "MIIBZjCCAQ2gAwIBAgIUYudY7jzVQ9be8x7eWIzu8JeSfMYwCgYIKoZIzj0EAwIwNTELMAkGA1UEBhMCVVMxEDAOBgNVBAoMB0V4YW1wbGUxFDASBgNVBAMMC2V4YW1wbGUuY29tMB4XDTIzMTAxMTExMDgzNloXDTI0MTAxMDExMDgzNlowNTELMAkGA1UEBhMCVVMxEDAOBgNVBAoMB0V4YW1wbGUxFDASBgNVBAMMC2V4YW1wbGUuY29tMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEzbmfCiY+9W68azyCB5Tq+7fZ374HvJvLVvkYFOcb6FGrBeD8tgtfgVawIeZ6oaDVSDTnQc0uz1g+PYZlMmRhAjAKBggqhkjOPQQDAgNHADBEAiAPACy+fKvDYZuXAmfHn9fERNJNpvjPik9O9HNZDzsIlQIgdP9SejoRYSU7xr+LExIu3aLKH2hSUMgn53O6U9Uj+2w=",
    ];

    const tbsClaims = {
      cnf: publicJwkFromPrivate(newPrivateJwk("secp256k1")),
      iat: 0,
      type: "",
      iss: "",
      verified_at: 0,
      last_name: "",
      first_name: "",
      is_order_than_15: false,
      is_order_than_18: false,
      is_order_than_20: false,
      is_order_than_65: false,
    };
    const credential = await issueFlatCredential(
      tbsClaims,
      issuerPrivateJwk,
      x5c,
    );

    assert.isString(credential);
    assert.equal((credential.match(/\./g) || []).length, 2);

    const result = await verifySDJWT(
      credential,
      async (jwt) => {
        try {
          await jwtVerify(jwt, publicKey);
          return true;
        } catch (e) {
          return false;
        }
      },
      // eslint-disable-next-line no-unused-vars
      (hashAlg: string) => {
        // @ts-ignore
        const hasher = (data) => {
          const digest = crypto.createHash("sha256").update(data).digest();
          return base64encode(digest);
        };
        return Promise.resolve(hasher);
      },
    );
    assert.isObject(result);
  });

  it("broken JWT signature", async () => {
    const issuerPrivateJwk = newPrivateJwk("secp256k1");
    const issuerPublicJwk = publicJwkFromPrivate(issuerPrivateJwk);

    const publicKey = await importJWK(issuerPublicJwk, "ES256K");

    const tbsClaims = {
      cnf: publicJwkFromPrivate(newPrivateJwk("secp256k1")),
      iat: 0,
      type: "",
      iss: "",
      verified_at: 0,
      last_name: "",
      first_name: "",
      is_order_than_15: false,
      is_order_than_18: false,
      is_order_than_20: false,
      is_order_than_65: false,
    };
    let credential = await issueFlatCredential(tbsClaims, issuerPrivateJwk, []);

    assert.isString(credential);
    assert.equal((credential.match(/\./g) || []).length, 2);

    const parts = credential.split(".");
    const signature = parts[2].split("~")[0];
    const brokenSignature = signature + "abc";

    const brokenCredential = credential.replace(signature, brokenSignature);
    let pass = false;

    try {
      await verifySDJWT(
        brokenCredential,
        async (jwt) => {
          try {
            await jwtVerify(jwt, publicKey);
            return true;
          } catch (e) {
            return false;
          }
        },
        // eslint-disable-next-line no-unused-vars
        (hashAlg: string) => {
          // @ts-ignore
          const hasher = (data) => {
            const digest = crypto.createHash("sha256").update(data).digest();
            return base64encode(digest);
          };
          return Promise.resolve(hasher);
        },
      );
    } catch (e) {
      pass = true;
    }
    assert.isTrue(pass);
  });
});
