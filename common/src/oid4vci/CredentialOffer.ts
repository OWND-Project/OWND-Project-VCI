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
