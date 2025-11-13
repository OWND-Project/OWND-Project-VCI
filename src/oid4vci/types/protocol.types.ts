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

export interface Proof {
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-ID1.html#section-7.2.1
  proof_type: string; // `jwt` or `cwt` or `ldp_vp`

  jwt?: string;
  ldp_vp?: {
    [key: string]: any;
  }; // todo: improve type definition
  cwt?: string;
}

export interface Proofs {
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
  // Map of proof type to array of proof JWTs/CWTs
  jwt?: string[];
  cwt?: string[];
  ldp_vp?: {
    [key: string]: any;
  }[]; // todo: improve type definition
}

export interface BaseCredentialRequest {
  // Conditionally required: its necessity depends on the presence of other parameters.
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-request
  //   REQUIRED when credential_identifiers parameter was not returned from the Token Response.
  //   It MUST NOT be used otherwise.
  credential_configuration_id?: string;

  // Conditionally required: its necessity depends on the presence of other parameters.
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-ID1.html#name-credential-request
  //   REQUIRED when the credential_identifiers parameter was not returned from the Token Response.
  //   It MUST NOT be used otherwise.
  format?: string;

  // Conditionally required: its necessity depends on the presence of other parameters.
  // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-request
  //   The proofs object is OPTIONAL. Contains proofs of possession of key material.
  proofs?: Proofs;

  // DEPRECATED: Use proofs instead. Kept for backward compatibility.
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

export interface CredentialRequestVcSdJwt extends BaseCredentialRequest {
  // REQUIRED when the format parameter is present in the Credential Request. It MUST NOT be used otherwise
  vct?: string;
  claims?: Claims;
}

export interface CredentialRequestJwtVcJson extends BaseCredentialRequest {
  // REQUIRED when the format parameter is present in the Credential Request.
  // It MUST NOT be used otherwise
  credential_definition?: {
    type: string[];
    credentialSubject?: ClaimsOnlyMandatory;
  };
}

export interface CredentialRequestLdpVc extends BaseCredentialRequest {
  // REQUIRED when the format parameter is present in the Credential Request.
  // It MUST NOT be used otherwise
  credential_definition?: {
    "@context": string[];
    type: string[];
    credentialSubject?: ClaimsOnlyMandatory;
  };
}

export interface CredentialRequestJwtVcJsonLd extends CredentialRequestLdpVc {}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface NonceResponse {
  c_nonce: string;
  c_nonce_expires_in?: number;
}

export interface CredentialResponse {
  // OPTIONAL. Contains issued Credential. It MUST be present when transaction_id is not returned.
  credential?: unknown;

  transaction_id?: string;
  notification_id?: string;
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
  background_color?: string;
  text_color?: string;
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
  nonce_endpoint?: string; // REQUIRED by HAIP when cryptographic binding is supported
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
export interface IssuerMetadataJwtVcJson extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope?: string; // REQUIRED by HAIP for each credential configuration
      cryptographic_binding_methods_supported: string[]; // REQUIRED by OID4VCI 1.0
      credential_signing_alg_values_supported: string[]; // REQUIRED by OID4VCI 1.0
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
export interface IssuerMetadataLdpVc extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope?: string; // REQUIRED by HAIP for each credential configuration
      cryptographic_binding_methods_supported: string[]; // REQUIRED by OID4VCI 1.0
      credential_signing_alg_values_supported: string[]; // REQUIRED by OID4VCI 1.0
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
export interface IssuerMetadataJwtVcJsonLd extends IssuerMetadataLdpVc {}

// A.3 IETF SD-JWT VC
export interface IssuerMetadataVcSdJwt extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope?: string; // REQUIRED by HAIP for each credential configuration
      cryptographic_binding_methods_supported: string[]; // REQUIRED by OID4VCI 1.0
      credential_signing_alg_values_supported: string[]; // REQUIRED by OID4VCI 1.0
      proof_types_supported?: {
        [key: string]: {
          proof_signing_alg_values_supported: string[];
        };
      };
      display?: CredentialDisplay[];

      // Added parameters specific to A.3.
      vct: string;
      credential_metadata: Claims; // Updated from 'claims' to 'credential_metadata' per latest spec
      order?: string[];
    };
  };
}

export type IssuerMetadata =
  | IssuerMetadataJwtVcJsonLd
  | IssuerMetadataJwtVcJson
  | IssuerMetadataLdpVc
  | IssuerMetadataVcSdJwt;

export type CredentialRequest =
  | CredentialRequestVcSdJwt
  | CredentialRequestJwtVcJson
  | CredentialRequestLdpVc
  | CredentialRequestJwtVcJsonLd;

/**
 * OAuth 2.0 Authorization Server Metadata
 * RFC 8414: https://www.rfc-editor.org/rfc/rfc8414.html
 */
export interface AuthorizationServerMetadata {
  // REQUIRED
  issuer: string; // Authorization server's issuer identifier URL

  // OPTIONAL but commonly used
  authorization_endpoint?: string;
  token_endpoint?: string; // REQUIRED for OID4VCI pre-authorized code flow
  jwks_uri?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  service_documentation?: string;
  ui_locales_supported?: string[];
  op_policy_uri?: string;
  op_tos_uri?: string;
  revocation_endpoint?: string;
  revocation_endpoint_auth_methods_supported?: string[];
  revocation_endpoint_auth_signing_alg_values_supported?: string[];
  introspection_endpoint?: string;
  introspection_endpoint_auth_methods_supported?: string[];
  introspection_endpoint_auth_signing_alg_values_supported?: string[];
  code_challenge_methods_supported?: string[];
}
