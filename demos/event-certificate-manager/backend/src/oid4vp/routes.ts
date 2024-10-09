import Koa from "koa";
import Router from "koa-router";
import { koaBody } from "koa-body";

import commonAdminRoutes from "ownd-vci/dist/routes/admin/routes.js";
import {
  handleNotSuccessResult,
  RouteContext,
} from "ownd-vci/dist/routes/common.js";
import {
  generateAuthRequest,
  generateRedirectUri,
  generateRequestObject,
  handleVPResponse,
  NotSuccessResult2,
} from "./routesHandler.js";

const init = () => {
  const router = new Router();

  commonAdminRoutes.setupCommonRoute(router);

  router.get(`/vp/request`, async (ctx: Koa.Context) => {
    const result = await generateAuthRequest();
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

  router.get(`/vp/requesturi`, async (ctx: Koa.Context) => {
    const result = await generateRequestObject();
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

  const vpResponsePath = new URL(process.env.OID4VP_RESPONSE_URI || "")
    .pathname;
  router.post(`${vpResponsePath}`, koaBody(), async (ctx: Koa.Context) => {
    const result = await handleVPResponse(ctx.request.body);
    if (result.ok) {
      const redirectUri = await generateRedirectUri(result.payload.ticketNo);
      if (redirectUri.ok) {
        ctx.body = {
          redirect_uri: redirectUri.payload,
        };
        ctx.status = 200;
      } else {
        handleNotSuccessResult(redirectUri.error, ctx);
      }
    } else {
      handleNotSuccessResult2(result.error, ctx);
    }
  });

  return router;
};

// todo move to common
export const handleNotSuccessResult2 = (
  result: NotSuccessResult2,
  ctx: RouteContext,
) => {
  if (result.type === "INVALID_PARAMETER2") {
    ctx.status = 400;
    ctx.body = {
      status: "error",
      message: result.message || "Invalid data received.",
    };
  } else {
    handleNotSuccessResult(result, ctx);
  }
};

export default init;
