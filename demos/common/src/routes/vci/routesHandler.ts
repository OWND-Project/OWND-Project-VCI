import Koa from "koa";

import { TokenIssuerConfig } from "ownd-vci/dist/oid4vci/tokenEndpoint/types.js";
import { TokenIssuer } from "ownd-vci/dist/oid4vci/tokenEndpoint/TokenIssuer.js";
import { CredentialIssuerConfig } from "ownd-vci/dist/oid4vci/credentialEndpoint/types.js";
import { StoredAccessToken } from "../../store/authStore.js";
import { CredentialIssuer } from "ownd-vci/dist/oid4vci/credentialEndpoint/CredentialIssuer.js";
import { NonceIssuerConfig } from "ownd-vci/dist/oid4vci/nonceEndpoint/types.js";
import { NonceIssuer } from "ownd-vci/dist/oid4vci/nonceEndpoint/NonceIssuer.js";
import { resolveAcceptLanguage } from "resolve-accept-language";
import { localizeIssuerMetadata } from "ownd-vci/dist/utils/localize.js";
import { IMetadataRepository } from "ownd-vci/dist/metadata/IMetadataRepository.js";

/**
 * Issuer Metadataを返すハンドラ
 *
 * @param ctx - Koaコンテキスト
 * @param metadataRepository - メタデータリポジトリ実装（各demoから注入）
 * @param availableLocales - 対応ロケール
 * @param defaultLocale - デフォルトロケール
 */
export async function handleIssueMetadata(
  ctx: Koa.Context,
  metadataRepository: IMetadataRepository,
  availableLocales: string[],
  defaultLocale: string,
) {
  const needsLocalization = process.env.RESOLVE_ACCEPT_LANGUAGE === "true";

  try {
    // リポジトリから取得
    const originalMetadataJson = await metadataRepository.getIssuerMetadata();
    console.debug(originalMetadataJson);

    if (!needsLocalization) {
      ctx.body = originalMetadataJson;
      ctx.status = 200;
      ctx.set("Content-Type", "application/json");
      return;
    }

    const acceptLanguage = ctx.request.header["accept-language"];
    if (!acceptLanguage) {
      ctx.body = originalMetadataJson;
      ctx.status = 200;
      ctx.set("Content-Type", "application/json");
      return;
    }

    try {
      const preferred = resolveAcceptLanguage(
        acceptLanguage,
        availableLocales,
        defaultLocale,
      );
      ctx.body = localizeIssuerMetadata(
        structuredClone(originalMetadataJson),
        preferred,
        defaultLocale,
      );
    } catch (err) {
      console.log(
        `unable to localize metadata using accept-language header: ${acceptLanguage}`,
      );
      ctx.body = originalMetadataJson;
    }

    ctx.status = 200;
    ctx.set("Content-Type", "application/json");
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}

export async function handleAuthServer(
  ctx: Koa.Context,
  metadataRepository: IMetadataRepository,
) {
  try {
    const metadataJson =
      await metadataRepository.getAuthorizationServerMetadata();
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

export async function handleToken(
  ctx: Koa.Context,
  configGenerator: () => TokenIssuerConfig,
) {
  const tokenRequest = new TokenIssuer(configGenerator());
  const result = await tokenRequest.issue({
    getHeader: (name: string) => ctx.get(name),
    getBody: () => ctx.request.body,
  });

  if (!result.ok) {
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

export async function handleCredential(
  ctx: Koa.Context,
  configGenerator: () => CredentialIssuerConfig<StoredAccessToken>,
) {
  const credentialIssuer = new CredentialIssuer(configGenerator());
  const result = await credentialIssuer.issue({
    getHeader: (name: string) => ctx.get(name),
    getBody: () => ctx.request.body,
  });
  if (!result.ok) {
    console.debug({ error: result.error });
    ctx.status = result.error.status;
    ctx.body = result.error.payload;
    return;
  }

  ctx.body = result.payload;
  ctx.status = 200;
}

export async function handleNonce(
  ctx: Koa.Context,
  configGenerator: () => NonceIssuerConfig,
) {
  const nonceIssuer = new NonceIssuer(configGenerator());
  const result = await nonceIssuer.issue();

  if (!result.ok) {
    const { status, payload } = result.error;
    ctx.status = status;
    ctx.body = payload;
    return;
  }

  // return nonce response
  ctx.body = result.payload;
  ctx.status = 200;
  ctx.set("Cache-Control", "no-store");
  ctx.set("Content-Type", "application/json");
}

export default {
  handleIssueMetadata,
  handleAuthServer,
  handleToken,
  handleCredential,
  handleNonce,
};
