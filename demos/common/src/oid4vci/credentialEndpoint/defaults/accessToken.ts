import { AccessTokenStateProvider } from "ownd-vci/dist/oid4vci/credentialEndpoint/types.js";
import authStore, {
  StoredAccessToken,
} from "../../../store/authStore.js";

export const accessTokenStateProvider: AccessTokenStateProvider<StoredAccessToken> = async (
  accessToken: string,
) => {
  const storedAccessToken = await authStore.getAccessToken(accessToken);
  if (!storedAccessToken) {
    return { exists: false };
  }

  // c_nonceはテーブルから削除されたので、proofElementsは不要
  const payload = {
    authorizedCode: {
      code: storedAccessToken.authorizedCode.code,
      sub: storedAccessToken.authorizedCode.sub,
      proofElements: undefined,
    },
    expiresIn: storedAccessToken.expiresIn,
    createdAt: new Date(storedAccessToken.createdAt),
    storedAccessToken,
  };
  return { exists: true, payload };
};
