import Koa from "koa";
import request from "supertest";
import ellipticJwk from "elliptic-jwk";

import * as datetimeUtils from "ownd-vci/dist/utils/datetime";
import { ellipticJwkToPem } from "ownd-vci/dist/crypto/util";
import {
  generateRootCertificate,
  generateCsr,
  trimmer,
} from "ownd-vci/dist/crypto/x509/issue";
import { parseCookie } from "./adminAuth.test";

export const ADMIN_USERNAME = process.env.ADMIN_AUTH_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_AUTH_PASSWORD;

export const getSession = async (app: Koa) => {
  const response = await request(app.callback()).post("/login").send({
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });
  // @ts-ignore
  const cookies = response.headers["set-cookie"].map(parseCookie);
  // リクエストヘッダーに含めるCookie値
  return `koa.sess=${cookies[0].value}; koa.sess.sig=${cookies[1].value}`;
};

export const privateJwk = ellipticJwk.newPrivateJwk("P-256");

export async function generateCert() {
  // @ts-ignore
  const keyPair = await ellipticJwkToPem(privateJwk);
  const subject = "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=Example Company/CN=example.jp";
  const extension = [
    { extname: "subjectAltName", array: [{ dns: "example.com" }] },
  ];
  const csr = trimmer(
    generateCsr(
      subject,
      keyPair.publicKey,
      keyPair.privateKey,
      "SHA256withECDSA",
      extension,
    ),
  );
  const notBefore = datetimeUtils.getCurrentUTCDate();
  const notAfter = datetimeUtils.addSeconds(notBefore, 86400 * 365);
  const cert = trimmer(
    generateRootCertificate(
      csr,
      notBefore,
      notAfter,
      "SHA256withECDSA",
      keyPair.privateKey,
    ),
  );
  return { cert, privateJwk };
}
