import Router from "koa-router";

import {
  credentialOfferForParticipation,
  getTicketCredentialOffer,
  handleCertificateChain,
} from "./routesHandler.js";

import { tokenConfigure } from "./vciConfigProvider.js";
import { configure } from "./credentialsConfigProvider.js";
import commonVciRoutes from "ownd-vci/dist/routes/vci/routes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Koa from "koa";
import { handleNotSuccessResult } from "ownd-vci/dist/routes/common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

const init = () => {
  const router = new Router();
  commonVciRoutes.setupCommonRoute(
    router,
    tokenConfigure,
    configure,
    __dirname,
  );

  router.get(
    `/vci/credential-offer/ticket/:ticketNo`,
    async (ctx: Koa.Context) => {
      const { ticketNo } = ctx.params;
      const result = await getTicketCredentialOffer(ticketNo);
      if (result.ok) {
        if (result.payload) {
          ctx.body = result.payload;
          ctx.status = 200;
        } else {
          ctx.status = 404;
        }
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.get(`/vci/credential-offer/:id`, async (ctx: Koa.Context) => {
    const { id } = ctx.params;
    const result = await credentialOfferForParticipation(id);
    if (result.ok) {
      if (result.payload) {
        ctx.body = result.payload;
        ctx.status = 200;
      } else {
        ctx.status = 404;
      }
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  router.get("/issuer-certificate/chain.pem", async (ctx: Koa.Context) => {
    const result = await handleCertificateChain();
    if (result.ok) {
      if (result.payload) {
        ctx.body = result.payload;
        ctx.set("Content-Type", "application/x-pem-file");
        ctx.status = 200;
      } else {
        ctx.status = 404;
      }
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  return router;
};

export default init;
