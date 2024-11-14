export * from "./protocol.types.js";

export interface Identifiable {
  id: number;
}
export interface AuthorizedCode extends Identifiable {
  code: string;
  expiresIn: number;
  txCode?: string;
  needsProof: boolean;
  preAuthFlow: boolean;
  isUsed: boolean;
  createdAt: string;
}

export interface AccessToken {
  token: string;
  expiresIn: number;
  createdAt: string;
}

export interface VCIAccessToken extends AccessToken {
  cNonce?: string;
  cNonceExpiresIn?: number;
  cNonceCreatedAt?: string;
}

export interface HttpRequest {
  // eslint-disable-next-line no-unused-vars
  getHeader: (name: string) => string;
  getBody: () => any;
}

export interface NotExists {
  exists: false;
}

export interface Exists<T> {
  exists: true;
  payload: T;
}
