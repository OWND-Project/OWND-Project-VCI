import { CredentialOffer, TxCode } from "./types/types.js";

/**
 * Converts a CredentialOffer object to a URL string.
 *
 * @param credentialOffer - The credential offer object to be converted
 * @param endpoint - Optional custom endpoint. If not provided, uses "openid-credential-offer://" as default
 * @returns A URL string with the credential offer encoded as a query parameter
 *
 * @example
 * const offer = {
 *   credential_issuer: "https://issuer.example.com",
 *   credential_configuration_ids: ["config1"]
 * };
 * const url = credentialOffer2Url(offer);
 * // Returns: "openid-credential-offer://?credential_offer=..."
 */
export const credentialOffer2Url = (
  credentialOffer: CredentialOffer,
  endpoint?: string,
) => {
  const serializedCredentialOffer = JSON.stringify(credentialOffer);
  const encodedCredentialOffer = encodeURIComponent(serializedCredentialOffer);
  return `${
    endpoint ? endpoint : "openid-credential-offer://"
  }?credential_offer=${encodedCredentialOffer}`;
};

/**
 * Parses a credential offer URL and extracts the CredentialOffer object.
 *
 * @param credentialOfferUrl - The URL containing the credential offer as a query parameter
 * @returns The parsed CredentialOffer object
 * @throws {Error} If the credential_offer parameter is missing in the URL
 * @throws {SyntaxError} If the credential_offer contains invalid JSON
 *
 * @example
 * const url = "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A...";
 * const offer = url2CredentialOffer(url);
 * // Returns: { credential_issuer: "...", credential_configuration_ids: [...] }
 */
export const url2CredentialOffer = (credentialOfferUrl: string) => {
  const urlParams = new URLSearchParams(new URL(credentialOfferUrl).search);
  const encodedCredentialOffer = urlParams.get("credential_offer");

  if (!encodedCredentialOffer) {
    throw new Error("credential_offer parameter is missing in the URL.");
  }

  const decodedCredentialOffer = decodeURIComponent(encodedCredentialOffer);

  // todo: should validate the data structure.
  return JSON.parse(decodedCredentialOffer) as CredentialOffer;
};

/**
 * Generates a Pre-Authorized Code Flow credential offer URL.
 *
 * This function creates a credential offer URL for the OID4VCI Pre-Authorized Code Flow,
 * which allows issuers to offer credentials to holders with a pre-authorized code.
 *
 * @param credentialIssuer - The credential issuer URL
 * @param credentialConfigurationIds - Array of credential configuration IDs to be offered
 * @param preAuthCode - The pre-authorized code for accessing the credentials
 * @param txCode - Optional transaction code (user PIN) requirement. If provided, the holder must enter this code.
 * @param endpoint - Optional custom endpoint. If not provided, uses "openid-credential-offer://" as default
 * @returns A credential offer URL string
 *
 * @example
 * // Without transaction code
 * const url = generatePreAuthCredentialOffer(
 *   "https://issuer.example.com",
 *   ["EmployeeCredential"],
 *   "eyJhbGciOiJSU..."
 * );
 *
 * @example
 * // With transaction code (user PIN)
 * const url = generatePreAuthCredentialOffer(
 *   "https://issuer.example.com",
 *   ["EmployeeCredential"],
 *   "eyJhbGciOiJSU...",
 *   { length: 4, input_mode: "numeric", description: "Enter your PIN" }
 * );
 */
export const generatePreAuthCredentialOffer = (
  credentialIssuer: string,
  credentialConfigurationIds: string[],
  preAuthCode: string,
  txCode?: TxCode,
  endpoint?: string,
): string => {
  const credentialOffer: CredentialOffer = {
    credential_issuer: credentialIssuer || "",
    credential_configuration_ids: credentialConfigurationIds,
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": preAuthCode,
        ...(txCode !== undefined && { tx_code: txCode }),
      },
    },
  };
  return credentialOffer2Url(credentialOffer, endpoint);
};
