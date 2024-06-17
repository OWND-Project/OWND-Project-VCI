import { assert } from "chai";
import {
  credentialRequestValidator,
  issuerMetadataValidator,
} from "../../../src/oid4vci/types/validator.js";

const validMetadata = [
  {
    credential_issuer: "https://example.co.jp",
    authorization_servers: ["https://example.co.jp"],
    credential_endpoint: "https://example.co.jp/credentials",
    display: [
      {
        name: "Organization",
        locale: "ja-JP",
        logo: {
          uri: "https://example.co.jp/public/logo.png",
          alt_text: "Organizationのロゴ",
        },
        background_color: "#12107c",
        text_color: "#FFFFFF",
      },
      {
        name: "Organization",
        locale: "en-US",
        logo: {
          uri: "https://example.co.jp/public/logo.png",
          alt_text: "a square logo of a Organization",
        },
        background_color: "#12107c",
        text_color: "#FFFFFF",
      },
    ],
    credential_configurations_supported: {
      ParticipationCertificate: {
        format: "jwt_vc_json",
        scope: "ProofOfParticipation",
        cryptographic_binding_methods_supported: ["jwk"],
        credential_signing_alg_values_supported: ["ES256K"],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ["ES256", "ES256K"],
          },
        },
        display: [
          {
            name: "イベント参加証",
            locale: "ja-JP",
            logo: {
              uri: "https://example.co.jp/public/event-participation-certificate-logo.png",
              alt_text: "イベント参加証のロゴ",
            },
            background_color: "#0A725B",
            background_image: {
              uri: "https://example.co.jp/images/PbDC2024.png",
            },
            text_color: "#FFFFFF",
          },
          {
            name: "Event Participation Certificate",
            locale: "en-US",
            logo: {
              uri: "https://example.co.jp/public/event-participation-certificate-logo.png",
              alt_text: "a square logo of a event participation certificate",
            },
            background_color: "#0A725B",
            background_image: {
              uri: "https://example.co.jp/images/PbDC2024.png",
            },
            text_color: "#FFFFFF",
          },
        ],
        credential_definition: {
          type: ["ParticipationCertificate"],
          credentialSubject: {
            name: {
              display: [
                {
                  name: "イベント名",
                  locale: "ja-JP",
                },
                {
                  name: "Event Name",
                  locale: "en-US",
                },
              ],
            },
            description: {
              display: [
                {
                  name: "イベント説明",
                  locale: "ja-JP",
                },
                {
                  name: "Description",
                  locale: "en-US",
                },
              ],
            },
            organizerName: {
              display: [
                {
                  name: "主催者名",
                  locale: "ja-JP",
                },
                {
                  name: "Organizer Name",
                  locale: "en-US",
                },
              ],
            },
            location: {
              display: [
                {
                  name: "場所",
                  locale: "ja-JP",
                },
                {
                  name: "Location",
                  locale: "en-US",
                },
              ],
            },
            startDate: {
              display: [
                {
                  name: "開始日時",
                  locale: "ja-JP",
                },
                {
                  name: "Start Date",
                  locale: "en-US",
                },
              ],
            },
            endDate: {
              display: [
                {
                  name: "終了日時",
                  locale: "ja-JP",
                },
                {
                  name: "End Date",
                  locale: "en-US",
                },
              ],
            },
            url: {
              display: [
                {
                  name: "イベントURL",
                  locale: "ja-JP",
                },
                {
                  name: "event URL",
                  locale: "en-US",
                },
              ],
            },
            organizerUrl: {
              display: [
                {
                  name: "主催者URL",
                  locale: "ja-JP",
                },
                {
                  name: "Organizer URL",
                  locale: "en-US",
                },
              ],
            },
          },
        },
      },
    },
  },
  {
    credential_issuer: "https://example.co.jp",
    authorization_servers: ["https://example.co.jp"],
    credential_endpoint: "https://example.co.jp/credentials",
    display: [
      {
        name: "株式会社Example",
        locale: "ja-JP",
        logo: {
          uri: "https://example.co.jp/public/example-inc-logo.png",
          alt_text: "Exampleのロゴ",
        },
        background_color: "#003289",
        text_color: "#FFFFFF",
      },
      {
        name: "Example Inc.",
        locale: "en-US",
        logo: {
          uri: "https://example.co.jp/public/example-inc-logo.png",
          alt_text: "a square logo of a Example Inc.",
        },
        background_color: "#003289",
        text_color: "#FFFFFF",
      },
    ],
    credential_configurations_supported: {
      EmployeeIdentificationCredential: {
        format: "vc+sd-jwt",
        scope: "EmployeeIdentification",
        cryptographic_binding_methods_supported: ["jwk"],
        credential_signing_alg_values_supported: ["ES256K"],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ["ES256", "ES256K"],
          },
        },
        display: [
          {
            name: "社員証",
            locale: "ja-JP",
            logo: {
              uri: "https://example.co.jp/public/employee-identification-credential-logo.png",
              alt_text: "社員証のロゴ",
            },
            background_color: "#003289",
            background_image: {
              uri: "https://example.co.jp/images/example.png",
            },
            text_color: "#FFFFFF",
          },
          {
            name: "Employee Identification Credential",
            locale: "en-US",
            logo: {
              uri: "https://example.co.jp/public/employee-identification-credential-logo.png",
              alt_text: "a square logo of a Employee Identification Credential",
            },
            background_color: "#003289",
            background_image: {
              uri: "https://example.co.jp/images/example.png",
            },
            text_color: "#FFFFFF",
          },
        ],
        vct: "EmployeeIdentificationCredential",
        claims: {
          companyName: {
            display: [
              {
                name: "会社名",
                locale: "ja-JP",
              },
              {
                name: "Company Name",
                locale: "en-US",
              },
            ],
          },
          employeeNo: {
            display: [
              {
                name: "社員番号",
                locale: "ja-JP",
              },
              {
                name: "Employee Number",
                locale: "en-US",
              },
            ],
          },
          givenName: {
            display: [
              {
                name: "名",
                locale: "ja-JP",
              },
              {
                name: "First Name",
                locale: "en-US",
              },
            ],
          },
          familyName: {
            display: [
              {
                name: "姓",
                locale: "ja-JP",
              },
              {
                name: "Last Name",
                locale: "en-US",
              },
            ],
          },
          gender: {
            display: [
              {
                name: "性別情報",
                locale: "ja-JP",
              },
              {
                name: "Gender",
                locale: "en-US",
              },
            ],
          },
          division: {
            display: [
              {
                name: "部署",
                locale: "ja-JP",
              },
              {
                name: "Division",
                locale: "en-US",
              },
            ],
          },
        },
      },
    },
  },
];

const invalidMetadata = [{}];

const validCredentialRequests = [
  {
    format: "jwt_vc_json",
    credential_definition: {
      type: ["VerifiableCredential", "UniversityDegreeCredential"],
      credentialSubject: {
        given_name: {},
        family_name: {},
        degree: {},
      },
    },
    proof: {
      proof_type: "jwt",
      jwt: "eyJraWQiOiJkaWQ6ZXhhbXBsZTplYmZlYjFmNzEyZWJjNmYxYzI3NmUxMmVjMjEva2V5cy8xIiwiYWxnIjoiRVMyNTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJzNkJoZFJrcXQzIiwiYXVkIjoiaHR0cHM6Ly9zZXJ2ZXIuZXhhbXBsZS5jb20iLCJpYXQiOiIyMDE4LTA5LTE0VDIxOjE5OjEwWiIsIm5vbmNlIjoidFppZ25zbkZicCJ9.ewdkIkPV50iOeBUqMXCC_aZKPxgihac0aW9EkL1nOzM",
    },
  },
  {
    format: "vc+sd-jwt",
    vct: "SD_JWT_VC_example_in_OpenID4VCI",
    proof: {
      proof_type: "jwt",
      jwt: "eyJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiblVXQW9BdjNYWml0aDhFN2kxOU9kYXhPTFlGT3dNLVoyRXVNMDJUaXJUNCIsInkiOiJIc2tIVThCalVpMVU5WHFpN1N3bWo4Z3dBS18weGtjRGpFV183MVNvc0VZIn19.eyJhdWQiOiJodHRwczovL2NyZWRlbnRpYWwtaXNzdWVyLmV4YW1wbGUuY29tIiwiaWF0IjoxNzAxOTYwNDQ0LCJub25jZSI6IkxhclJHU2JtVVBZdFJZTzZCUTR5bjgifQ.-a3EDsxClUB4O3LeDD5DVGEnNMT01FCQW4P6-2-BNBqc_Zxf0Qw4CWayLEpqkAomlkLb9zioZoipdP-jvh1WlA",
    },
  },
];

const invalidCredentialRequests = [
  {
    proof: {
      proof_type: "jwt",
      jwt: "eyJraWQiOiJkaWQ6ZXhhbXBsZTplYmZlYjFmNzEyZWJjNmYxYzI3NmUxMmVjMjEva2V5cy8xIiwiYWxnIjoiRVMyNTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJzNkJoZFJrcXQzIiwiYXVkIjoiaHR0cHM6Ly9zZXJ2ZXIuZXhhbXBsZS5jb20iLCJpYXQiOiIyMDE4LTA5LTE0VDIxOjE5OjEwWiIsIm5vbmNlIjoidFppZ25zbkZicCJ9.ewdkIkPV50iOeBUqMXCC_aZKPxgihac0aW9EkL1nOzM",
    },
    credential_response_encryption: {},
  },
  {
    format: "vc+sd-jwt",
    proof: {
      jwt: "eyJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiblVXQW9BdjNYWml0aDhFN2kxOU9kYXhPTFlGT3dNLVoyRXVNMDJUaXJUNCIsInkiOiJIc2tIVThCalVpMVU5WHFpN1N3bWo4Z3dBS18weGtjRGpFV183MVNvc0VZIn19.eyJhdWQiOiJodHRwczovL2NyZWRlbnRpYWwtaXNzdWVyLmV4YW1wbGUuY29tIiwiaWF0IjoxNzAxOTYwNDQ0LCJub25jZSI6IkxhclJHU2JtVVBZdFJZTzZCUTR5bjgifQ.-a3EDsxClUB4O3LeDD5DVGEnNMT01FCQW4P6-2-BNBqc_Zxf0Qw4CWayLEpqkAomlkLb9zioZoipdP-jvh1WlA",
    },
  },
];

describe("validator", () => {
  describe("IssuerMetadata", () => {
    describe("valid", () => {
      it("should return true", () => {
        for (const metadata of validMetadata) {
          assert.doesNotThrow(() => {
            issuerMetadataValidator(metadata);
          });
        }
      });
    });
    describe("invalid", () => {
      it("should throw an error", () => {
        for (const metadata of invalidMetadata) {
          assert.throws(() => {
            issuerMetadataValidator(metadata);
          });
        }
      });
    });
  });
  describe("CredentialRequest", () => {
    describe("valid", () => {
      it("should return true", () => {
        for (const credentialRequest of validCredentialRequests) {
          assert.doesNotThrow(() => {
            credentialRequestValidator(credentialRequest);
          });
        }
      });

      describe("invalid", () => {
        it("should throw an error", () => {
          for (const credentialRequest of invalidCredentialRequests) {
            assert.throws(() => {
              credentialRequestValidator(credentialRequest);
            });
          }
        });
      });
    });
  });
});
