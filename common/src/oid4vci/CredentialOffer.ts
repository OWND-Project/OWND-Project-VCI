import { CredentialOffer } from "./types";

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
export const url2CredentialOffer = (credentialOfferUrl: string) => {
  const urlParams = new URLSearchParams(new URL(credentialOfferUrl).search);
  const encodedCredentialOffer = urlParams.get("credential_offer");

  if (!encodedCredentialOffer) {
    throw new Error("credential_offer parameter is missing in the URL.");
  }

  const decodedCredentialOffer = decodeURIComponent(encodedCredentialOffer);

  return JSON.parse(decodedCredentialOffer);
};

export const generatePreAuthCredentialOffer = (
  credentialIssuer: string,
  credentials: string[],
  preAuthCode: string,
  pinRequired: boolean,
  endpoint?: string,
): string => {
  const credentialOffer = {
    credential_issuer: credentialIssuer || "",
    credentials: credentials,
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": preAuthCode,
        user_pin_required: pinRequired,
      },
    },
  };
  return credentialOffer2Url(credentialOffer, endpoint);
};
