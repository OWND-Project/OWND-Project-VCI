import Koa from "koa";

import { handleNotSuccessResult } from "../../../common/src/routerCommon.js";
import keys from "../../../common/src/keys.js";

export async function handleNewKey(ctx: Koa.Context) {
  if (!ctx.request.body) {
    ctx.body = { status: "error", message: "Invalid data received!" };
    ctx.status = 400;
    return;
  }
  const kid = ctx.request.body.kid;
  const curve = ctx.request.body.curve || "P-256";
  const result = await keys.genKey(kid, curve);
  if (result.ok) {
    ctx.body = { status: "success", message: "Data created successfully!" };
    ctx.status = 201;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

export async function handleRevokeKey(ctx: Koa.Context) {
  const { kid } = ctx.params;
  const result = await keys.revokeKey(kid);
  if (result.ok) {
    ctx.body = { status: "success", message: "Data revoked successfully!" };
    ctx.status = 200;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}
export async function handleCsr(ctx: Koa.Context) {
  const { kid } = ctx.params;
  const subject = ctx.request.body.subject;
  const result = await keys.createCsr(kid, subject);
  if (result.ok) {
    ctx.body = { status: "success", payload: result.payload };
    ctx.status = 200;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

export async function handleSignSelfCert(ctx: Koa.Context) {
  const { kid } = ctx.params;
  const csr = ctx.request.body.csr;
  const result = await keys.createSelfCert(kid, csr);
  if (result.ok) {
    ctx.body = { status: "success", payload: result.payload };
    ctx.status = 200;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}
export async function handleRegisterCert(ctx: Koa.Context) {
  const { kid } = ctx.params;
  const certificates = ctx.request.body.certificates || [];
  const result = await keys.registerCert(kid, certificates);
  if (result.ok) {
    ctx.body = {
      status: "success",
      message: "certificate registration succeeded",
    };
    ctx.status = 200;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}
export async function handleGetKey(ctx: Koa.Context) {
  const { kid } = ctx.params;
  const result = await keys.getKey(kid);
  if (result.ok) {
    ctx.body = { status: "success", payload: result.payload };
    ctx.status = 200;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

export default {
  handleNewKey,
  handleRevokeKey,
  handleSignSelfCert,
  handleCsr,
  handleRegisterCert,
  handleGetKey,
};
