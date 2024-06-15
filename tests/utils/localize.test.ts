import { assert } from "chai";
import {
  IssuerMetadataJwtVcWithoutJsonLd,
  IssuerMetadataSelectiveDisclosureJwtVc,
} from "../../src/oid4vci/types/protocol.types.js";
import { localizeIssuerMetadata } from "../../src/utils/localize.js";

describe("localizeIssuerMetadata", () => {
  it("should localize IssuerDisplay correctly", () => {
    const metadata: IssuerMetadataJwtVcWithoutJsonLd = {
      credential_issuer: "issuer",
      credential_endpoint: "endpoint",
      credential_configurations_supported: {},
      display: [
        { name: "Issuer Default", locale: "en" },
        { name: "Issuer Spanish", locale: "es" },
      ],
    };

    const localizedMetadata = localizeIssuerMetadata(metadata, "es", "en");
    assert.deepEqual(localizedMetadata.display, [
      { name: "Issuer Spanish", locale: "es" },
    ]);
  });

  it("should fallback to default locale if preferred locale is not found", () => {
    const metadata: IssuerMetadataJwtVcWithoutJsonLd = {
      credential_issuer: "issuer",
      credential_endpoint: "endpoint",
      credential_configurations_supported: {},
      display: [{ name: "Issuer Default", locale: "en" }],
    };

    const localizedMetadata = localizeIssuerMetadata(metadata, "es", "en");
    assert.deepEqual(localizedMetadata.display, [
      { name: "Issuer Default", locale: "en" },
    ]);
  });

  it("should return original displays if neither preferred nor default locale is found", () => {
    const metadata: IssuerMetadataJwtVcWithoutJsonLd = {
      credential_issuer: "issuer",
      credential_endpoint: "endpoint",
      credential_configurations_supported: {},
      display: [{ name: "Issuer French", locale: "fr" }],
    };

    const localizedMetadata = localizeIssuerMetadata(metadata, "es", "en");
    assert.deepEqual(localizedMetadata.display, [
      { name: "Issuer French", locale: "fr" },
    ]);
  });

  it("should localize CredentialDisplay within credential configurations", () => {
    const metadata: IssuerMetadataJwtVcWithoutJsonLd = {
      credential_issuer: "issuer",
      credential_endpoint: "endpoint",
      credential_configurations_supported: {
        config1: {
          format: "format",
          display: [
            { name: "Credential Default", locale: "en" },
            { name: "Credential Spanish", locale: "es" },
          ],
          credential_definition: {
            type: ["type"],
          },
          order: ["order"],
        },
      },
    };

    const localizedMetadata = localizeIssuerMetadata(metadata, "es", "en");
    assert.deepEqual(
      localizedMetadata.credential_configurations_supported.config1.display,
      [{ name: "Credential Spanish", locale: "es" }],
    );
  });

  it("should localize ClaimDisplay within credential configurations", () => {
    const metadata: IssuerMetadataJwtVcWithoutJsonLd = {
      credential_issuer: "issuer",
      credential_endpoint: "endpoint",
      credential_configurations_supported: {
        config1: {
          format: "format",
          credential_definition: {
            type: ["type"],
            credentialSubject: {
              claim1: {
                display: [
                  { name: "Claim Default", locale: "en" },
                  { name: "Claim Spanish", locale: "es" },
                ],
              },
            },
          },
          order: ["order"],
        },
      },
    };

    const localizedMetadata = localizeIssuerMetadata(
      metadata,
      "es",
      "en",
    ) as IssuerMetadataJwtVcWithoutJsonLd;
    assert.deepEqual(
      localizedMetadata.credential_configurations_supported.config1
        .credential_definition.credentialSubject?.claim1.display,
      [{ name: "Claim Spanish", locale: "es" }],
    );
  });

  it("should localize ClaimDisplay within claims", () => {
    const metadata: IssuerMetadataSelectiveDisclosureJwtVc = {
      credential_issuer: "issuer",
      credential_endpoint: "endpoint",
      credential_configurations_supported: {
        config1: {
          format: "format",
          vct: "vct",
          claims: {
            claim1: {
              display: [
                { name: "Claim Default", locale: "en" },
                { name: "Claim Spanish", locale: "es" },
              ],
            },
          },
          order: ["order"],
        },
      },
    };

    const localizedMetadata = localizeIssuerMetadata(
      metadata,
      "es",
      "en",
    ) as IssuerMetadataSelectiveDisclosureJwtVc;
    assert.deepEqual(
      localizedMetadata.credential_configurations_supported.config1.claims
        ?.claim1.display,
      [{ name: "Claim Spanish", locale: "es" }],
    );
  });
});
