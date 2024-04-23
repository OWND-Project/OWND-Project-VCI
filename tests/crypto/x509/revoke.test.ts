import { assert } from "chai";
import * as jsrsasign from "jsrsasign";
import {
  generateCrl,
  RevokedCertificate,
} from "../../../src/crypto/x509/revoke.js";

describe("generateCrl", () => {
  it("empty", async () => {
    // @ts-ignore
    const keyPair = jsrsasign.KEYUTIL.generateKeypair("EC", "P-256");
    const publicPem = jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj);
    const privatePem = jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV");
    const revoked: RevokedCertificate[] = [];
    const crl = generateCrl(
      revoked,
      "/CN=issuerName",
      1,
      new Date(),
      "SHA256withECDSA",
      "12ab",
      privatePem,
    );

    assert.ok(crl);
  });
  it("revoked multiple certificates", async () => {
    // @ts-ignore
    const keyPair = jsrsasign.KEYUTIL.generateKeypair("EC", "P-256");
    const publicPem = jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj);
    const privatePem = jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV");
    const revoked = [
      {
        serialNumber: "12",
        revocationDate: new Date(),
        reason: undefined,
      },
      {
        serialNumber: "34",
        revocationDate: new Date(),
        reason: 0,
      },
    ];
    const crl = generateCrl(
      revoked,
      "/CN=issuerName",
      1,
      new Date(),
      "SHA256withECDSA",
      "12ab",
      privatePem,
    );
    assert.ok(crl);
  });
});
