import { fileURLToPath } from "url";
import path, { dirname } from "path";

import Koa from "koa";

import { TokenIssuer } from "../../../../common/src/oid4vci/tokenEndpoint/TokenIssuer.js";
import { readLocalMetadataResource } from "../../../../common/src/utils/resourceUtils.js";
import { CredentialIssuer } from "../../../../common/src/oid4vci/credentialEndpoint/CredentialIssuer.js";

import keyStore from "../../../../common/src/store/keyStore.js";
import { tokenConfigure } from "../../logic/vciConfigProvider.js";
import { configure } from "../../logic/credentialsConfigProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

const wrap64str = (str: string): string => {
  var result = "";
  for (const [index, char] of str.split("").entries()) {
    if (index % 64 == 0 && index != 0) {
      result += "\n";
    }
    result += char;
  }
  return result;
};

const jsonCertChainToPem = (jsonCertChain: string): string => {
  const preamble = "-----BEGIN CERTIFICATE-----\n";
  const postamble = "\n-----END CERTIFICATE-----";
  const jsn = JSON.parse(jsonCertChain);
  return jsn
    .map((cert: string) => {
      const decodedBuffer: Buffer = Buffer.from(cert, "base64");
      const base64EncodedString: string = decodedBuffer.toString("base64");
      return preamble + wrap64str(base64EncodedString) + postamble;
    })
    .join("\n");
};

// Delete the following routes as soon as the certificate is issued
export async function handleSectigoDomainValidation(ctx: Koa.Context) {
  ctx.body = `24DDAEF7A546FFD4AE8CD12AB7341C1B1932DEAAD26D978EB5462AA7E2467A41
sectigo.com
J001`;
  ctx.status = 200;
  ctx.set("Content-Type", "text/plain");
}
// Delete the above routes as soon as the certificate is issued

export async function handleCertificateChain(ctx: Koa.Context) {
  const keyPair = await keyStore.getLatestKeyPair();
  if (keyPair) {
    const { x509cert } = keyPair;
    if (x509cert) {
      ctx.body = jsonCertChainToPem(x509cert);
      ctx.status = 200;
      ctx.set("Content-Type", "application/x-pem-file");
    } else {
      ctx.status = 404;
      ctx.body = { message: "Not Found" };
    }
  } else {
    ctx.status = 404;
    ctx.body = { message: "Not Found" };
  }
}

export async function handleIssueMetadata(ctx: Koa.Context) {
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(__dirname, "metadata", environment),
      "credential_issuer_metadata.json",
    );
    console.debug(metadataJson);

    ctx.body = metadataJson;
    ctx.status = 200;
    ctx.set("Content-Type", "application/json");
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}

export async function handleAuthServer(ctx: Koa.Context) {
  console.debug("handle metadata:");
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(__dirname, "metadata", environment),
      "authorization_server.json",
    );
    console.debug(metadataJson);

    ctx.body = metadataJson;
    ctx.status = 200;
    ctx.set("Content-Type", "application/json");
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}

export async function handleToken(ctx: Koa.Context) {
  console.debug("handleToken:");
  const tokenRequest = new TokenIssuer(tokenConfigure());
  const result = await tokenRequest.issue({
    getHeader: (name: string) => ctx.get(name),
    getBody: () => ctx.request.body,
  });

  if (!result.ok) {
    console.debug("result is not ok");
    console.info(`result : ${JSON.stringify(result)}`);
    const { status, payload } = result.error;
    ctx.status = status;
    ctx.body = payload;
    return;
  }

  // return access token
  ctx.body = result.payload;
  ctx.status = 200;
  ctx.set("Cache-Control", "no-store");
  ctx.set("Content-Type", "application/json");
}

export async function handleCredential(ctx: Koa.Context) {
  const credentialIssuer = new CredentialIssuer(configure());
  const result = await credentialIssuer.issue({
    getHeader: (name: string) => ctx.get(name),
    getBody: () => ctx.request.body,
  });
  if (!result.ok) {
    console.info({ error: result.error });
    ctx.status = result.error.status;
    ctx.body = result.error.payload;
    return;
  }

  const { format, credential, nonce } = result.payload;
  const responseBody = { format, credential };
  ctx.body = nonce
    ? {
        ...responseBody,
        c_nonce: nonce.nonce,
        c_nonce_expires_in: nonce.expiresIn,
      }
    : responseBody;
  ctx.status = 200;
}

export default {
  handleSectigoDomainValidation,
  handleIssueMetadata,
  handleAuthServer,
  handleToken,
  handleCredential,
  handleCertificateChain,
};
