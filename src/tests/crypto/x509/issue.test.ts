import { assert } from "chai";
import * as jsrsasign from "jsrsasign";
import {
  generateCsr,
  generateRootCertificate,
  trimmer,
} from "../../../crypto/x509/issue";
import { hexToBinary, sha1Binary } from "../../../crypto/util";

/*
    // jsrsasign key generation sample code

    const keyPair = jsrsasign.KEYUTIL.generateKeypair("EC", "secp256r1")

    console.log(jsrsasign.KEYUTIL.getJWKFromKey(keyPair.pubKeyObj))
    console.log(jsrsasign.KEYUTIL.getJWKFromKey(keyPair.prvKeyObj))
    console.log(jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj))
    console.log(jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV"))
*/

describe("createCsr", () => {
  it("secp256r1/secp384r1/secp384r1", async () => {
    for (var curve of ["secp256r1", "secp384r1", "secp521r1"]) {
      // @ts-ignore
      const keyPair = jsrsasign.KEYUTIL.generateKeypair("EC", curve);
      const subject =
        "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=Example Company/CN=example.jp";
      const csr = generateCsr(
        subject,
        jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj),
        jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV"),
        "SHA256withECDSA",
        [],
      );
      const parsed = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(csr);
      assert.equal(
        trimmer(parsed.sbjpubkey),
        trimmer(jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj)),
      );
      assert.equal(parsed.subject.str, subject);
    }
  });

  it("with extension", async () => {
    // @ts-ignore
    const keyPair = jsrsasign.KEYUTIL.generateKeypair("EC", "secp256r1");
    const subject =
      "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=Example Company/CN=example.jp";

    const csr = generateCsr(
      subject,
      jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj),
      jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV"),
      "SHA256withECDSA",
      [{ extname: "subjectAltName", array: [{ dns: "example.com" }] }],
    );
    const parsed = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(csr);
    assert.equal(
      trimmer(parsed.sbjpubkey),
      trimmer(jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj)),
    );
    assert.equal(parsed.subject.str, subject);

    assert.isDefined(parsed.extreq);
    if (parsed.extreq !== undefined) {
      parsed.extreq.forEach((ext: any) => {
        if (ext.extname === "subjectAltName") {
          assert.equal(ext.array[0].dns, "example.com");
        }
      });
    }
  });
});

describe("generateRootCertificate", () => {
  it("IACA Certificate", async () => {
    const keyPair = jsrsasign.KEYUTIL.generateKeypair("EC", "secp256r1");
    const subject =
      "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=Example Company/CN=example.jp";

    const subjectKeyHex = keyPair.pubKeyObj.generatePublicKeyHex();
    const binary = hexToBinary(subjectKeyHex);
    const spki = sha1Binary(binary);

    const extension = [
      {
        extname: "cRLDistributionPoints",
        array: [
          {
            dpname: {
              full: [
                {
                  uri: "https://example.jp/certificate-revocation-list/crl.pem",
                },
              ],
            },
          },
        ],
      },
      {
        extname: "issuerAltName",
        array: [{ uri: "https://example.jp/mvd/contact-mvd" }],
      },
      {
        extname: "subjectKeyIdentifier",
        kid: { hex: spki },
      },
      {
        extname: "authorityKeyIdentifier",
        kid: { hex: spki },
      },
      { extname: "basicConstraints", critical: true, cA: true },
      {
        extname: "keyUsage",
        critical: true,
        names: ["keyCertSign", "cRLSign"],
      },
    ];
    const csr = generateCsr(
      subject,
      jsrsasign.KEYUTIL.getPEM(keyPair.pubKeyObj),
      jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV"),
      "SHA256withECDSA",
      extension,
    );

    const rootCertificate = generateRootCertificate(
      csr,
      new Date(Date.UTC(2023, 7, 21, 19, 55, 14)),
      new Date(Date.UTC(2031, 9, 5, 19, 55, 14)),
      "SHA256withECDSA",
      jsrsasign.KEYUTIL.getPEM(keyPair.prvKeyObj, "PKCS8PRV"),
    );

    console.log(rootCertificate);
    assert.ok(rootCertificate);
  });
});
