interface CredentialGrant {
  "pre-authorized_code": string;
  user_pin_required: boolean;
}

interface Grants {
  "urn:ietf:params:oauth:grant-type:pre-authorized_code": CredentialGrant;
}

type CredentialItem = string | { [key: string]: any };

export interface CredentialOffer {
  credential_issuer: string;
  credentials: CredentialItem[];
  grants: Grants;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  c_nonce?: string;
  c_nonce_expires_in?: number;
}
