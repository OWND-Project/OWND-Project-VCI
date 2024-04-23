import Koa from "koa";

import keyStore from "ownd-vci/dist/store/keyStore.js";
import { jsonCertChainToPem } from "ownd-vci/dist/crypto/util.js";

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

export default {
  handleCertificateChain,
};
