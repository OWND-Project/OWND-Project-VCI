import axios from "axios";

const generateRandomString = (length = 32) => {
  const possibleCharacters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * possibleCharacters.length);
    result += possibleCharacters[randomIndex];
  }

  return result;
};

const buildAuthCodeFlowURL = () => {
  const OAUTH2_AUTH_ENDPOINT = process.env.OAUTH2_AUTH_ENDPOINT || "";
  const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID || "";
  const OAUTH2_REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI || "";
  const OAUTH2_SCOPE = process.env.OAUTH2_SCOPE || "";
  const state = generateRandomString();
  const nonce = generateRandomString();

  const oauth2AuthorizationUrl = `${OAUTH2_AUTH_ENDPOINT}?client_id=${OAUTH2_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    OAUTH2_REDIRECT_URI,
  )}&scope=${encodeURIComponent(
    OAUTH2_SCOPE,
  )}&response_type=code&response_mode=query&state=${state}&nonce=${nonce}`;
  return { oauth2AuthorizationUrl, state, nonce };
};

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
}
const getAccessToken = async (code: string) => {
  const tokenEndpoint = process.env.OAUTH2_TOKEN_ENDPOINT || "";
  const clientId = process.env.OAUTH2_CLIENT_ID || "";
  const clientSecret = process.env.OAUTH2_CLIENT_SECRET || "";
  const redirectUri = process.env.OAUTH2_REDIRECT_URI || "";
  const encodedCredentials = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");

  const response = await axios.post<TokenResponse>(
    tokenEndpoint,
    `code=${code}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&grant_type=authorization_code&client_id=${clientId}`,
    {
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    },
  );

  return response.data;
};
export default { buildAuthCodeFlowURL, generateRandomString, getAccessToken };
