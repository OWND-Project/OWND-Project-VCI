import axios, { AxiosResponse } from "axios";
import _sodium from "libsodium-wrappers";
import * as jose from "jose";

import {
  xIdResponse,
  MynaInfoCredential,
} from "../../../../src/credentials/sd-jwt/types";
import store from "../store.js";
import keyStore from "../../../../src/store/keyStore.js";
import { issueFlatCredential } from "../../../../src/credentials/sd-jwt/issuer.js";
import { ErrorPayload, Result } from "../../../../src/types";

const convertVerifiedAt = (verifiedAt: number): string => {
  const date = new Date(verifiedAt * 1000);
  return date.toISOString();
};

const convertGender = (responseGender: string): string => {
  switch (responseGender) {
    case "1":
      return "男性";
    case "2":
      return "女性";
    default:
      return "不明";
  }
};

const interpretXIDResponse = (userData: xIdResponse): MynaInfoCredential => {
  const notCopy = ["verified_at", "gender"];
  const tmp = {} as MynaInfoCredential;
  for (const key in userData) {
    if (notCopy.includes(key)) continue;
    // @ts-ignore
    tmp[key] = userData[key];
  }

  const verified_at = convertVerifiedAt(userData.verified_at);
  const gender = convertGender(userData.gender);
  const ageOver = generateAgeOverInfo(
    userData.year,
    userData.month,
    userData.date,
  );

  return { ...tmp, ...ageOver, verified_at, gender };
};

const issueIdentityCredential = async (
  preAuthorizedCode: string,
  jwk: jose.JWK,
): Promise<Result<string, ErrorPayload>> => {
  const xIDAccessToken = await store.getXIDAccessToken(preAuthorizedCode);

  const rawUserData = await getUserData(xIDAccessToken?.token!);
  const userData = interpretXIDResponse(rawUserData);

  const keyPair = await keyStore.getLatestKeyPair();
  if (keyPair) {
    const { x509cert } = keyPair;
    const x5c = x509cert ? JSON.parse(x509cert) : [];
    // issue vc
    const iss = process.env.CREDENTIAL_ISSUER_IDENTIFIER;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 365;
    const vct = "IdentityCredential";
    const claims = { ...userData, cnf: { jwk }, iss, iat, exp, vct };
    const credential = await issueFlatCredential(claims, keyPair, x5c);
    return { ok: true, payload: credential };
  } else {
    const error = { status: 500, error: "No keypair exists" };
    return { ok: false, error };
  }
};

const fieldsToDecrypt = [
  "gender",
  "sub_char_common_name",
  "previous_name",
  "sub_char_previous_name",
  "year",
  "month",
  "date",
  "prefecture",
  "city",
  "address",
  "sub_char_address",
];

const getUserData = async (accessToken: string): Promise<xIdResponse> => {
  try {
    const xIDApiBaseUrl = process.env.X_ID_API_BASE_URL || "";
    const response: AxiosResponse<xIdResponse> = await axios.get(
      `${xIDApiBaseUrl}/verification/userdata`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const privateKey = process.env.X_ID_CLIENT_KEY_PAIR_PRIVATE || "";
    const publicKey = process.env.X_ID_CLIENT_KEY_PAIR_PUBLIC || "";
    const decrypted = { ...response.data };

    for (const field of fieldsToDecrypt) {
      // @ts-ignore
      decrypted[field] = await decrypt(decrypted[field], publicKey, privateKey);
    }
    return { ...decrypted };
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};

const toBufferIfString = (key: string | Uint8Array) => {
  if (typeof key === "string") {
    return Buffer.from(key, "base64");
  } else if (key instanceof Uint8Array) {
    return key;
  } else {
    throw new Error("Invalid publicKey type. Should be a string or Buffer.");
  }
};
async function encrypt(plainText: string, publicKey: string | Uint8Array) {
  await _sodium.ready;
  const sodium = _sodium;

  const publicKeyBytes = toBufferIfString(publicKey);

  // ランダムなNonceを生成
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  // メッセージをプレーンテキストからUTF-8エンコードしてバイナリデータに変換
  const message = Buffer.from(plainText, "utf-8");

  // メッセージを受信者の公開鍵を使用して暗号化
  const encryptedMessage = sodium.crypto_box_seal(message, publicKeyBytes);

  // Nonceを含めて暗号文をBase64エンコード
  const encryptedMessageWithNonce = Buffer.concat([nonce, encryptedMessage]);
  return encryptedMessageWithNonce.toString("base64");
}
async function decrypt(
  encryptedMessageBase64: string,
  publicKey: string | Uint8Array,
  privateKey: string | Uint8Array,
) {
  await _sodium.ready;
  const sodium = _sodium;

  const privateKeyBytes = toBufferIfString(privateKey);
  const publicKeyBytes = toBufferIfString(publicKey);
  const recipientKeypair = {
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
  };
  const encryptedMessage = Buffer.from(encryptedMessageBase64, "base64");

  // メッセージを受信者の秘密鍵を使用して復号化
  const decryptedMessage = sodium.crypto_box_seal_open(
    encryptedMessage.slice(24),
    recipientKeypair.publicKey,
    recipientKeypair.privateKey,
  );
  if (decryptedMessage) {
    return Buffer.from(decryptedMessage).toString("utf-8");
  } else {
    console.error(`Decryption failed. cipher text:${encryptedMessageBase64}`);
    throw new Error("Decryption failed.");
  }
}
async function generateKeyPair() {
  await _sodium.ready;
  const sodium = _sodium;
  return sodium.crypto_box_keypair();
}

const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
};

const generateAgeOverInfo = (
  year: string,
  month: string,
  date: string,
): {
  is_older_than_13: boolean;
  is_older_than_18: boolean;
  is_older_than_20: boolean;
} => {
  const birthdate = new Date(Number(year), Number(month) - 1, Number(date));
  const age = calculateAge(birthdate);

  return {
    is_older_than_13: age >= 13,
    is_older_than_18: age >= 18,
    is_older_than_20: age >= 20,
  };
};

export default {
  issueIdentityCredential,
  getUserData,
  decrypt,
  encrypt,
  generateKeyPair,
};
