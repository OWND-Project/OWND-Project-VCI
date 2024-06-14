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
        credentialSubject?: {
          // todo: support nested structure
          [key: string]: {
            mandatory?: boolean;
            value_type?: string;
            display?: ClaimDisplay[];
          };
        };
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
        credentialSubject?: {
          // todo: support nested structure
          [key: string]: {
            mandatory?: boolean;
            value_type?: string;
            display?: ClaimDisplay[];
          };
        };
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
      claims: {
        // todo: support nested structure
        [key: string]: {
          mandatory?: boolean;
          value_type?: string;
          display?: ClaimDisplay[];
        };
      };
      order?: string[];
    };
  };
}

export type IssuerMetadata =
  | IssuerMetadataJwtVcWithJsonLd
  | IssuerMetadataJwtVcWithoutJsonLd
  | IssuerMetadataDataIntegrityVcWithJsonLd
  | IssuerMetadataSelectiveDisclosureJwtVc;
