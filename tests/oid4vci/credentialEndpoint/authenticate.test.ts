import { assert } from "chai";
import { authenticate } from "../../../src/oid4vci/credentialEndpoint/authenticate.js";
import {
  AccessTokenStateProvider,
  ValidAccessTokenState,
} from "../../../src/oid4vci/credentialEndpoint/types.js";

const accessToken: ValidAccessTokenState<{}> = {
  authorizedCode: {
    code: "test token",
    proofElements: {
      cNonce: "test nonce",
      expiresIn: 86400,
      createdAt: "test crated at",
    },
  },
  expiresIn: 86400,
  createdAt: new Date(),
  storedAccessToken: {},
};
// const authCode: PreAuthorizedCodeWithStoredData = {
//     code: "test code",
//     expiresIn: 86400,
//     userPin: "test pin",
//     useNonce: true,
//     isUsed: false,
//     createdAt: "test crated at",
//     storedData: {},
// }
// eslint-disable-next-line no-unused-vars
const accessTokenStateProvider1: AccessTokenStateProvider<{}> = async (
  token: string,
) => {
  return {
    exists: true,
    payload: accessToken,
  };
};
describe("authenticate function", () => {
  const INVALID_TOKEN = "invalid_token"; // この値は実際の値に置き換えてください。

  beforeEach(() => {});

  it("should return an error if authHeader is missing", async () => {
    const result = await authenticate("", accessTokenStateProvider1);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_TOKEN);
      assert.equal(error_description, "Invalid data received!");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });
  it("should return an error if authHeader does not start with BEARER", async () => {
    const result = await authenticate(
      "WRONGPREFIX token",
      accessTokenStateProvider1,
    );
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_TOKEN);
      assert.equal(error_description, "Invalid data received!");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  it("should return an error if the access token does not exist", async () => {
    // eslint-disable-next-line no-unused-vars
    const accessTokenStateProvider: AccessTokenStateProvider<{}> = async (
      token: string,
    ) => {
      return {
        exists: false,
      };
    };
    const result = await authenticate("BEARER token", accessTokenStateProvider);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_TOKEN);
      assert.equal(error_description, "Invalid access token");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  it("should return an error if the access token is expired", async () => {
    const accessToken: ValidAccessTokenState<{}> = {
      authorizedCode: {
        code: "test token",
        proofElements: {
          cNonce: "test nonce",
          expiresIn: 86400,
          createdAt: "test crated at",
        },
      },
      expiresIn: 3600, // 1時間で期限切れ
      createdAt: new Date(new Date().getTime() - 10000000), // 過去の日付を設定
      storedAccessToken: {},
    };
    // eslint-disable-next-line no-unused-vars
    const accessTokenStateProvider: AccessTokenStateProvider<{}> = async (
      token: string,
    ) => {
      return {
        exists: true,
        payload: accessToken,
      };
    };
    const result = await authenticate("BEARER token", accessTokenStateProvider);
    if (!result.ok) {
      const { error, error_description } = result.error;
      assert.equal(error, INVALID_TOKEN);
      assert.equal(error_description, "The access token expired");
    } else {
      assert.fail("result.ok is true when it should be false");
    }
  });

  it("should return a valid payload if the access token is valid", async () => {
    const accessToken: ValidAccessTokenState<{}> = {
      authorizedCode: {
        code: "test token",
        proofElements: {
          cNonce: "test nonce",
          expiresIn: 86400,
          createdAt: "test crated at",
        },
      },
      expiresIn: 86400,
      createdAt: new Date(),
      storedAccessToken: {},
    };
    // eslint-disable-next-line no-unused-vars
    const accessTokenStateProvider: AccessTokenStateProvider<{}> = async (
      token: string,
    ) => {
      return {
        exists: true,
        payload: accessToken,
      };
    };
    const result = await authenticate(
      "BEARER validtoken",
      accessTokenStateProvider,
    );
    if (result.ok) {
      assert.deepEqual(result.payload, accessToken);
    } else {
      assert.fail("result.ok is false when it should be true");
    }
  });
});
