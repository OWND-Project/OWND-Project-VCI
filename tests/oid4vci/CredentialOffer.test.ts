import { assert } from "chai";
import { CredentialOffer } from "../../src/oid4vci/protocol.types";
import { credentialOffer2Url } from "../../src/oid4vci/CredentialOffer";

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
          user_pin_required: true,
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
