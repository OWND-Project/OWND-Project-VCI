import Koa from "koa";
import session from "koa-session";
import { PresentationDefinition } from "../oid4vp/types";

import getLogger from "../logging.js";

const logger = getLogger();

export interface MemorySession {
  sessionId?: string;
  presentationDefinitions?: Record<string, PresentationDefinition>;
}

const authAdmin = (memorySession: MemorySession) => {
  return async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
    logger.debug("middleware: authAdmin");
    // console.debug(ctx.cookies);
    const path = ctx.request.path;
    // console.debug("ctx.session------>", ctx.session);
    // console.debug("memorySession--------->", memorySession);
    if (path.startsWith("/admin/event-certificate-manager")) {
      if (ctx.session) {
        console.log(ctx.session.maxAge);
        console.log(ctx.session.toJSON());
        logger.debug("session.maxAge %s", ctx.session.maxAge);
        logger.debug("session.json %s", ctx.session.toJSON());
      }
      if (isLoggedIn(ctx.session, memorySession)) {
        await next();
      } else {
        logger.debug("no session");
        ctx.status = 401;
      }
    } else {
      await next();
    }
    logger.debug("middleware: authAdmin done");
  };
};

/**
 * セッションIDを保持する方式は暫定
 * 今の形式ではサーバープロセス上で最後にログインした際のセッションIDのみが有効となる
 * イベント会場で複数人が同時にログインするケースが想定される場合は複数のセッションIDを保持する構造に変更する
 * その場合、期限切れやログアウトしたセッションを削除する仕組みが必要となる
 */
export const isLoggedIn = (
  session: session.Session | null,
  memorySession: MemorySession,
) => {
  if (!session || !session.sessionId || !memorySession.sessionId) {
    return false;
  }
  return session.sessionId === memorySession.sessionId;
};
export default authAdmin;
