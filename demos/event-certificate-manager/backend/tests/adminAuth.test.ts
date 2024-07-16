import { assert } from "chai";
import request from "supertest";
import session from "koa-session";

import { init } from "../src/app";

import { isLoggedIn } from "../src/middleware/adminAuth";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "./testUtils";

const appName = process.env.APP_NAME || "";

describe("admin auth logic test", () => {
  it("Unauthorized request without session", async () => {
    const ret = isLoggedIn(null, {});
    assert.equal(ret, false);
  });
  it("Unauthorized request without sessionId", async () => {
    const sess = {} as session.Session;
    const ret = isLoggedIn(sess, {});
    assert.equal(ret, false);
  });
  it("authorized request with sessionId", async () => {
    const sess = {} as session.Session;
    sess["sessionId"] = "1";
    const ret = isLoggedIn(sess, { sessionId: "1" });
    assert.equal(ret, true);
  });
});

describe("admin auth routes test", () => {
  const app = init();
  // const app = initTestApp();
  let cookie = "";
  it("access admin endpoint before login", async () => {
    const response = await request(app.callback()).get(
      `/admin/${appName}/events`,
    );
    assert.equal(response.status, 401);
  });
  it("login", async () => {
    const response = await request(app.callback()).post("/login").send({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });
    // @ts-ignore
    const cookies = response.headers["set-cookie"].map(parseCookie);
    assert.ok(cookies);
    console.debug(cookies);
    assert.ok(
      cookies.some((cookie: ParsedCookie) => cookie.name === "koa.sess"),
    );
    assert.equal(response.status, 204);

    // 後続のリクエストでリクエストヘッダーに含める
    cookie = `koa.sess=${cookies[0].value}; koa.sess.sig=${cookies[1].value}`;
  });
  it("access admin endpoint after login", async () => {
    const response = await request(app.callback())
      .get(`/admin/${appName}/events`)
      .set("Cookie", cookie);
    assert.equal(response.status, 200);
  });
});

interface ParsedCookie {
  name: string;
  value: string;
  expires?: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httponly?: boolean;
  samesite?: string;
  [key: string]: any;
}

export function parseCookie(cookieString: string): ParsedCookie {
  const parts = cookieString.split(";").map((part) => part.trim());
  const cookie: ParsedCookie = {
    name: "",
    value: "",
  };

  // 最初の部分はCookieの名前と値
  const firstEqualIndex = parts[0].indexOf("=");
  const name = parts[0].substring(0, firstEqualIndex).trim();
  const value = parts[0].substring(firstEqualIndex + 1).trim();
  cookie.name = name;
  cookie.value = value;

  // その他の属性
  parts.slice(1).forEach((part) => {
    const equalIndex = part.indexOf("=");
    if (equalIndex !== -1) {
      const key = part.substring(0, equalIndex).trim().toLowerCase();
      const val = part.substring(equalIndex + 1).trim();
      cookie[key] = val;
    } else {
      const key = part.trim().toLowerCase();
      cookie[key] = true;
    }
  });
  return cookie;
}
