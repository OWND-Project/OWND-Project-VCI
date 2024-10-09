import url from "url";

import { assert } from "chai";
import * as jose from "jose";

import { generateRequestObjectJwt } from "../src/oid4vp/authRequest";
import { getKeyAlgorithm } from "ownd-vci/dist/crypto/util";
import {
  CERT_PEM_POSTAMBLE,
  CERT_PEM_PREAMBLE,
} from "ownd-vci/dist/crypto/x509/constant";
import { generateCert, privateJwk } from "./testUtils";

describe("generate request object", () => {
  it("should be verified by public key included in jwt header as x5c property", async () => {
    const { cert } = await generateCert();
    const x5c = [cert];
    const presentationDefinition = {};
    const baseUrl = "https://example.com";
    const clientId = baseUrl;
    const path = "/vp/responseruri";
    const responseUri = url.resolve(baseUrl, path);
    const jwt = await generateRequestObjectJwt(clientId, privateJwk, {
      responseUri,
      clientIdScheme: "x509_san_dns",
      clientMetadata: {
        clientId,
        policyUri: `${baseUrl}/policy`,
        tosUri: `${baseUrl}/tos`,
        vpFormats: {
          jwt_vp: {
            alg: ["ES256"],
          },
        },
      },
      presentationDefinition,
      x509CertificateInfo: { x5c },
    });
    try {
      const decodedHeader = jose.decodeProtectedHeader(jwt);
      const leafKey = decodedHeader.x5c![0];
      const leafKeyX509 = `${CERT_PEM_PREAMBLE}\n${leafKey}\n${CERT_PEM_POSTAMBLE}`;

      const alg = getKeyAlgorithm(privateJwk);
      const ecPublicKey = await jose.importX509(leafKeyX509, alg);

      const verifyResult = await jose.jwtVerify(jwt, ecPublicKey);
      console.debug(verifyResult);
      assert.equal(verifyResult.payload.client_id_scheme, "x509_san_dns");
    } catch (err) {
      assert.fail("failed to generate request object", err);
    }
  });
});
