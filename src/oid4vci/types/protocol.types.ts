export interface TxCode {
  input_mode?: string;
  length?: number;
  description?: string;
}

interface CredentialGrant {
  "pre-authorized_code": string;
  tx_code?: TxCode;
}

interface Grants {
  "urn:ietf:params:oauth:grant-type:pre-authorized_code": CredentialGrant;
}

export interface CredentialOffer {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants?: Grants;
}

/**
 * @TJS-additionalProperties true
 */
export interface Proof {
  proof_type: string;
}

export interface BaseCredentialRequest {
  // Conditionally required: its necessity depends on the presence of other parameters.
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-ID1.html#name-credential-request
  //   REQUIRED when the credential_identifiers parameter was not returned from the Token Response.
  //   It MUST NOT be used otherwise.
  format?: string;

  // Conditionally required: its necessity depends on the presence of other parameters.
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-ID1.html#name-credential-request
  //   The proof object is REQUIRED if the proof_types_supported parameter is non-empty and present in the
  //   credential_configurations_supported parameter of the Issuer metadata for the requested Credential.
  proof?: Proof;

  // Conditionally required: its necessity depends on the presence of other parameters.
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-ID1.html#name-credential-request
  //   REQUIRED when credential_identifiers parameter was returned from the Token Response.
  //   It MUST NOT be used otherwise
  credential_identifier?: string;

  credential_response_encryption?: {
    jwk: {
      [key: string]: any; // todo: Should be restricted to appropriate properties as jwk
    };
    alg: string;
    end: string;
  };
}

export interface CredentialRequestSelectiveDisclosureJwtVc
  extends BaseCredentialRequest {
  // REQUIRED when the format parameter is present in the Credential Request. It MUST NOT be used otherwise
  vct?: string;
  claims?: Claims;
}

export interface CredentialRequestJwtVcWithoutJsonLd
  extends BaseCredentialRequest {
  // REQUIRED when the format parameter is present in the Credential Request.
  // It MUST NOT be used otherwise
  credential_definition?: {
    type: string[];
    credentialSubject?: ClaimsOnlyMandatory;
  };
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  c_nonce?: string;
  c_nonce_expires_in?: number;
}

export interface CredentialResponseEncryption {
  alg_values_supported: string[];
  enc_values_supported: string[];
  encryption_required: boolean;
}

export interface BaseDisplay {
  name?: string;
  locale?: string;
}

/**
 * @TJS-additionalProperties true
 */
export interface BaseLogo {
  uri: string;
  alt_text?: string;
}

/**
 * @TJS-additionalProperties true
 */
export interface IssuerDisplay extends BaseDisplay {
  logo?: BaseLogo;
}

/**
 * @TJS-additionalProperties true
 */
export interface CredentialDisplay extends BaseDisplay {
  logo?: BaseLogo;
  description?: string;
  background_color?: string;
  background_image?: {
    uri: string;
  };
  text_color?: string;
}

/**
 * @TJS-additionalProperties true
 */
export interface ClaimDisplay extends BaseDisplay {}

interface BaseIssuerMetadata {
  credential_issuer: string;
  authorization_servers?: string[];
  credential_endpoint: string;
  batch_credential_endpoint?: string;
  deferred_credential_endpoint?: string;
  notification_endpoint?: string;
  credential_response_encryption?: CredentialResponseEncryption;
  credential_identifiers_supported?: boolean;
  signed_metadata?: string;
  display?: IssuerDisplay[];

  // Add `credential_configurations_supported` depending on the type of credential
}

export interface Claim {
  mandatory?: boolean;
  value_type?: string;
  display?: ClaimDisplay[];
}

export type ClaimOnlyMandatory = Omit<Claim, "value_type" | "display">;

export interface Claims {
  // todo: support nested structure
  [key: string]: Claim;
}

export interface ClaimsOnlyMandatory {
  // todo: support nested structure
  [key: string]: ClaimOnlyMandatory;
}

// A.1.1  VC Signed as a JWT, Not Using JSON-LD
export interface IssuerMetadataJwtVcWithoutJsonLd extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope?: string;
      cryptographic_binding_methods_supported?: string[];
      credential_signing_alg_values_supported?: string[];
      proof_types_supported?: {
        [key: string]: {
          proof_signing_alg_values_supported: string[];
        };
      };
      display?: CredentialDisplay[];

      // Added parameters specific to A.1.1.
      credential_definition: {
        type: string[];
        credentialSubject?: Claims;
      };
      order?: string[];
    };
  };
}

// A.1.2  VC Secured using Data Integrity, using JSON-LD, with a Proof Suite Requiring Linked Data Canonicalization
export interface IssuerMetadataDataIntegrityVcWithJsonLd
  extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope?: string;
      cryptographic_binding_methods_supported?: string[];
      credential_signing_alg_values_supported?: string[];
      proof_types_supported?: {
        [key: string]: {
          proof_signing_alg_values_supported: string[];
        };
      };
      display?: CredentialDisplay[];

      // Added parameters specific to A.1.2.
      credential_definition: {
        "@context": string[];
        type: string[];
        credentialSubject?: Claims;
      };
      order?: string[];
    };
  };
}

// A.1.3  VC signed as a JWT, Using JSON-LD
// The definitions in Appendix A.1.2.2 apply for metadata of Credentials of this type as well.
export interface IssuerMetadataJwtVcWithJsonLd
  extends IssuerMetadataDataIntegrityVcWithJsonLd {}

// A.3 IETF SD-JWT VC
export interface IssuerMetadataSelectiveDisclosureJwtVc
  extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope?: string;
      cryptographic_binding_methods_supported?: string[];
      credential_signing_alg_values_supported?: string[];
      proof_types_supported?: {
        [key: string]: {
          proof_signing_alg_values_supported: string[];
        };
      };
      display?: CredentialDisplay[];

      // Added parameters specific to A.3.
      vct: string;
      claims: Claims;
      order?: string[];
    };
  };
}

export type IssuerMetadata =
  | IssuerMetadataJwtVcWithJsonLd
  | IssuerMetadataJwtVcWithoutJsonLd
  | IssuerMetadataDataIntegrityVcWithJsonLd
  | IssuerMetadataSelectiveDisclosureJwtVc;

export type CredentialRequest =
  | CredentialRequestSelectiveDisclosureJwtVc
  | CredentialRequestJwtVcWithoutJsonLd;
