import { assert } from "chai";
import { CredentialOffer } from "../../src/oid4vci/protocol.types";
import {credentialOffer2Url, generatePreAuthCredentialOffer} from "../../src/oid4vci/CredentialOffer";

describe("credentialOffer2Url", () => {
  it("should return the correct URL when endpoint is provided", () => {
    const credentialOffer: CredentialOffer = {
      credential_issuer: "https://issuer.example.com",
      credential_configuration_ids: ["config1", "config2"],
    };
    const endpoint = "https://example.com/offer";

    const result = credentialOffer2Url(credentialOffer, endpoint);
    const expectedUrl = `https://example.com/offer?credential_offer=${encodeURIComponent(
      JSON.stringify(credentialOffer),
    )}`;
    assert.equal(result, expectedUrl);
  });

  it("should return the correct URL when endpoint is not provided", () => {
    const credentialOffer: CredentialOffer = {
      credential_issuer: "https://issuer.example.com",
      credential_configuration_ids: ["config1", "config2"],
    };

    const result = credentialOffer2Url(credentialOffer);
    const expectedUrl = `openid-credential-offer://?credential_offer=${encodeURIComponent(
      JSON.stringify(credentialOffer),
    )}`;
    assert.equal(result, expectedUrl);
  });

  it("should handle grants property correctly", () => {
    const credentialOffer: CredentialOffer = {
      credential_issuer: "https://issuer.example.com",
      credential_configuration_ids: ["config1", "config2"],
      grants: {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": "code123",
          tx_code: {}, // empty object also indicates that the tx_code is required
        },
      },
    };

    const result = credentialOffer2Url(credentialOffer);
    const expectedUrl = `openid-credential-offer://?credential_offer=${encodeURIComponent(
      JSON.stringify(credentialOffer),
    )}`;
    assert.equal(result, expectedUrl);
  });
});


describe("generatePreAuthCredentialOffer", () => {
  it("should not include tx_code in the grants when txCode is undefined", () => {
    const credentialIssuer = "https://issuer.example.com";
    const credentials = ["config1", "config2"];
    const preAuthCode = "code123";

    const result = generatePreAuthCredentialOffer(credentialIssuer, credentials, preAuthCode);
    const credentialOffer = new URL(result).searchParams.get("credential_offer");
    assert.isNotNull(credentialOffer, "credential_offer parameter is missing in the URL.")
    if (credentialOffer) {
      const resultObject = JSON.parse(decodeURIComponent(credentialOffer));
      assert.notProperty(resultObject.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"], "tx_code");
    }
  });

  it("should include tx_code in the grants when txCode is defined", () => {
    const credentialIssuer = "https://issuer.example.com";
    const credentials = ["config1", "config2"];
    const preAuthCode = "code123";

    const txCode = {
      input_mode: "numeric",
      length: 6,
      description: "Transaction Code"
    };

    const result = generatePreAuthCredentialOffer(credentialIssuer, credentials, preAuthCode, txCode);
    const credentialOffer1 = new URL(result).searchParams.get("credential_offer");
    assert.isNotNull(credentialOffer1, "credential_offer parameter is missing in the URL.");
    if (credentialOffer1) {
      const resultObject = JSON.parse(decodeURIComponent(credentialOffer1));
      assert.deepPropertyVal(resultObject.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"], "tx_code", txCode);
    }
  });

  it("should include tx_code in the grants when txCode is defined (empty txCode)", () => {
    const credentialIssuer = "https://issuer.example.com";
    const credentials = ["config1", "config2"];
    const preAuthCode = "code123";

    const txCode = {};

    const result = generatePreAuthCredentialOffer(credentialIssuer, credentials, preAuthCode, txCode);
    const credentialOffer1 = new URL(result).searchParams.get("credential_offer");
    assert.isNotNull(credentialOffer1, "credential_offer parameter is missing in the URL.");
    if (credentialOffer1) {
      const resultObject = JSON.parse(decodeURIComponent(credentialOffer1));
      assert.deepPropertyVal(resultObject.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"], "tx_code", txCode);
    }
  });

});