# Doing

# Done

### Authorization Server Metadataの動的生成への移行

Authorization Server MetadataをJSONファイルから読み込む方式から、TypeScriptでの動的生成に移行しました。

#### 実施内容

**型定義の追加（src/oid4vci/types/protocol.types.ts）**:
- AuthorizationServerMetadata型を追加（RFC 8414準拠）
- issuer, token_endpoint, grant_types_supported, token_endpoint_auth_methods_supportedなどを定義

**インターフェース拡張（src/metadata/IMetadataRepository.ts）**:
- getAuthorizationServerMetadata()メソッドを追加

**実装の追加（demos/employee-vci/src/metadata/MetadataRepository.ts）**:
- getAuthorizationServerMetadata()の実装
- 環境変数（CREDENTIAL_ISSUER）から動的に生成
- Anonymous Accessサポート（token_endpoint_auth_methods_supported: ["none"]）

**ルートハンドラの修正**:
- demos/common/src/routes/vci/routesHandler.ts: handleAuthServerをファイル読み込みからリポジトリ経由に変更
- demos/common/src/routes/vci/routes.ts: handleAuthServerにmetadataRepositoryを渡す

**テストの追加（demos/employee-vci/tests/vci.test.ts）**:
- Authorization Server Metadataエンドポイントのテスト5件追加
- token_endpoint, grant_types_supported, token_endpoint_auth_methods_supportedの検証

**その他の修正**:
- tests/oid4vci/types/validator.test.ts: SD-JWT VCテストデータの`claims`を`credential_metadata`に修正

**テスト結果**:
- ライブラリ: 32 passing, 1 pending
- employee-vci: 35 passing

**補足**:
- `supportAnonymousAccess: true`のため、`token_endpoint_auth_methods_supported: ["none"]`が適切
- Wallet Attestation (attest_jwt_client_auth) は将来的な拡張として検討可能

### OID4VCI仕様準拠のためのIssuer Metadata修正

最新のOID4VCI 1.0仕様およびHAIP draft-04との差異を修正しました。

#### 参考ドキュメント
- `documents/oid4vci-spec-compliance-analysis.md`（差異分析）
- [OID4VCI 1.0 WG Draft](https://openid.github.io/OpenID4VCI/openid-4-verifiable-credential-issuance-1_0-wg-draft.html)
- [HAIP draft-04](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0-04.html)

#### 実施内容

**型定義の修正（src/oid4vci/types/protocol.types.ts）**:
- `nonce_endpoint`をBaseIssuerMetadataに追加（HAIP要件）
- `cryptographic_binding_methods_supported`と`credential_signing_alg_values_supported`を必須フィールドに変更
- `scope`にHAIP要件のコメントを追加
- `IssuerDisplay`に`background_color`/`text_color`を追加
- SD-JWT VC設定の`claims`を`credential_metadata`にリネーム

**実装の修正**:
- demos/employee-vci/src/metadata/MetadataRepository.ts: `nonce_endpoint`を追加
- demos/employee-vci/src/metadata/credentialConfigs.ts: `credential_metadata`に対応
- demos/employee-vci/src/logic/credentialsConfigProvider.ts: 同上
- src/utils/localize.ts: `credential_metadata`のローカライゼーション対応
- tests/utils/localize.test.ts: テスト更新
- demos/employee-vci/tests/vci.test.ts: nonce_endpoint検証追加

**重要な修正**:
- `token_endpoint`はCredential Issuer Metadataには含めない（OAuth 2.0 Authorization Server Metadata (RFC 8414)に属するため）

**テスト結果**:
- ライブラリ: 32 passing, 1 pending
- employee-vci: 30 passing

### メタデータのハードコード実装への移行
現在、Issuer MetadataをJSONファイル(`metadata/dev/credential_issuer_metadata.json`)から読み込んでいるが、
TypeScriptでハードコード実装に移行し、将来的なDB実装への道筋をつける。

**実施内容**:
- IMetadataRepository interfaceを作成（src/metadata/）
- employee-vci固有のMetadataRepositoryとcredentialConfigsを実装
- JSONファイルからTypeScript設定への移行完了
- メタデータエンドポイントのテスト8件を追加
- 全テスト合格（ライブラリ: 32 passing 1 pending、employee-vci: 29 passing）
- 設計ドキュメント追加（documents/metadata-*.md）

### ts-toolboxの導入
以下のソースコードをパッケージ化したので置き換えました。
- src/credentials → @ownd-project/ts-toolbox
- src/crypto → @ownd-project/ts-toolbox

パッケージ情報: https://www.npmjs.com/package/@ownd-project/ts-toolbox

**実施内容**:
- @ownd-project/ts-toolbox (v1.0.0) をインストール
- src/credentials/jwt/issuer.ts, demos/common/src/keys.ts, demos/employee-vci/src/logic/employeeCredential.ts のインポート更新
- src/crypto/, src/credentials/sd-jwt/issuer.ts, tests/crypto/ を削除
- 全テスト合格（ライブラリ: 33, employee-vci: 21）
- コード削減: -406行

### SD-JWT-VCのformat文字列の変更
以下の通り仕様に変更が入ったので反映させてください。

- before: vc+sd-jwt
- after: dc+sd-jwt

### c_nonce, c_nonce_expires_inの全面撤去
最新のプロトコルではレスポンスとしての当該データは廃止されているので実装を修正してください

以下は/credentialsエンドポイントへのリクエストを処理する一連の流れから、変更を加えたい部分を抜粋して、大まかな処理順に並べたものです。
コードの各部分に埋め込んだTODOコメントの内容を読み取って、必要な対応をしてください。

- POST /credentials
    - デモアプリ側
        
        demos/common/src/routes/vci/routesHandler.ts
        
        ```tsx
        export async function handleCredential(
          ctx: Koa.Context,
          configGenerator: () => CredentialIssuerConfig<StoredAccessToken>,
        ) {
          const credentialIssuer = new CredentialIssuer(configGenerator());
          const result = await credentialIssuer.issue({
            getHeader: (name: string) => ctx.get(name),
            getBody: () => ctx.request.body,
          });
        
          const { credential, c_nonce, c_nonce_expires_in } = result.payload;
          const responseBody = { credential };
          ctx.body =
            c_nonce && c_nonce_expires_in
              ? {
                  ...responseBody,
                  c_nonce,
                  c_nonce_expires_in,
                }
              : responseBody;
          ctx.status = 200;
        }
        ```
        
    - 共通モジュール側
        
        src/oid4vci/credentialEndpoint/CredentialIssuer.ts
        
        ```tsx
        export class CredentialIssuer<T> {
          // eslint-disable-next-line no-unused-vars
          constructor(private config: CredentialIssuerConfig<T>) {}
          async issue(httpRequest: HttpRequest): Promise<IssueResult> {
          
            const authResult = await authenticate(
              httpRequest.getHeader("Authorization"),
              this.config.accessTokenStateProvider,
            );
            //TODO ✅ここでsubをもらうようにする(accessTokenStateProviderで頑張れるはず)
            
            const credentialRequest = (() => {
              try {
                return credentialRequestValidator(httpRequest.getBody());
              } catch (e) {
                return undefined;
              }
            })();
            
            const issueResult = await this._issue(
              credentialRequest,
              credentialConfig,
              authorizedCode.code,//TODO ✅ここでsubを渡すようにする
              proofOfPossession,
            );
        ```
        
        ```tsx
          async _issue(
            credentialRequest: CredentialRequest,
            credentialConfig: any, 
            preAuthorizedCode: string,//TODO ✅subに変更
            proofOfPossession?: DecodedProofJwt,
          ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
          
              case "vc+sd-jwt": {
                const vcSdJwtRequest =
                  credentialRequestVcSdJwtValidator(credentialRequest);
                return this._issueVcSdJwt(
                  vcSdJwtRequest,
                  credentialConfig,
                  preAuthorizedCode,
                  proofOfPossession,
                );
              }
        ```
        
        ```tsx
          async _issueVcSdJwt(
            credentialRequest: CredentialRequestVcSdJwt,
            credentialConfig: any, 
            preAuthorizedCode: string,//TODO ✅subに変更
            proofOfPossession?: DecodedProofJwt,
          ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
            // Get vct from credentialConfig (resolved from metadata)
            const vct = credentialConfig.vct;
        
            // Add vct to credentialRequest for backward compatibility with issuingExecutor
            const requestWithVct = { ...credentialRequest, vct };
        
            const result = await this.config.issuingExecutor.sdJwtVc(
              preAuthorizedCode,//TODO ✅subに変更
              requestWithVct,
              proofOfPossession,
            );
            if (result.ok) {
              return result;
            } else {
              return { ok: false, error: { status: 500, payload: result.error } };
            }
          }
        ```
        
    - アプリ側に戻る
        
        demos/employee-vci/src/logic/credentialsConfigProvider.ts
        
        ```tsx
        export const configure = (): CredentialIssuerConfig<StoredAccessToken> => {
          return {
            credentialIssuer: process.env.CREDENTIAL_ISSUER || "",
            issuerMetadata: issuerMetadata,
            supportAnonymousAccess: true,
            accessTokenStateProvider: accessTokenStateProvider,
            issuingExecutor: { sdJwtVc: issueSdJwtVcCredential },
            getCNonce: authStore.getCNonce,
          };
        };
        ```
        
        ```tsx
        const issueSdJwtVcCredential: IssueSdJwtVcCredential = async (
          authorizedCode: string,//TODO ✅subに変更
          payload: CredentialRequestVcSdJwt,
          proofOfPossession?: DecodedProofJwt,
        ) => {
          if (
            !proofOfPossession ||
            !proofOfPossession.jwt ||
            !proofOfPossession.jwt.header ||
            !proofOfPossession.jwt.header.jwk
          ) {
            const error = {
              error: "invalid_or_missing_proof",
            };
            return { ok: false, error };
          }
          const vct = payload.vct; //TODO✅ここでcredential_configuration_idをもらう
          console.debug({ payload });
          if (vct === "EmployeeIdentificationCredential") {
            return await employeeCredential.issueEmployeeCredential(
              authorizedCode,//TODO ✅subに変更
              proofOfPossession.jwt.header.jwk,
            );
          } else {
            const error = {
              error: "unsupported_credential_type",
            };
            return { ok: false, error };
          }
        };
        ```
        
        demos/employee-vci/src/logic/employeeCredential.ts
        
        ```tsx
        const issueEmployeeCredential = async (
          authorizedCode: string,//TODO ✅subに変更
          jwk: jose.JWK,
        ): Promise<Result<string, ErrorPayload>> => {
          const data = await store.getPreAuthCodeAndEmployee(authorizedCode);//TODO ✅employeesをsubで直接検索する
          if (!data) {
            return { ok: false, error: { error: "NotFound" } }; // todo define constant
          }
          const { employee } = data;
          const keyPair = await keyStore.getLatestKeyPair();
          if (keyPair) {
            const { x509cert } = keyPair;
            const x5c = x509cert ? JSON.parse(x509cert) : [];
            // issue vc
            const iss = process.env.CREDENTIAL_ISSUER_IDENTIFIER;
            const iat = Math.floor(Date.now() / 1000);
            const exp = iat + 60 * 60 * 24 * 365;
            const vct = "EmployeeIdentificationCredential";
            const { companyName, employeeNo, division, givenName, familyName, gender } =
              employee;
            const claims = {
              companyName,
              employeeNo,
              division,
              givenName,
              familyName,
              gender,
              cnf: { jwk },
              vct,
              iss,
              iat,
              exp,
            };
            const credential = await issueFlatCredential(claims, keyPair, x5c);
            return { ok: true, payload: credential };
          } else {
            const error = { status: 500, error: "No keypair exists" };
            return { ok: false, error };
          }
        };
        ```

### /credentialエンドポイントのIFを最新化する(続き)
- 現在の実装のペイロードが最新版に準拠していないので修正する
- credential_configuration_idを使用する方法に変更

現在の実装
```
{
  format: "vc+sd-jwt",
  vct: "EmployeeIdentificationCredential",
}
```

最新版の例
```
{
  "credential_configuration_id": "EmployeeIdentificationCredential",
}
```

実装内容:
- src/oid4vci/credentialEndpoint/CredentialIssuer.ts
    - credential_configuration_idによるクレデンシャル設定の解決を実装
    - IssuerMetadataのcredential_configurations_supportedから設定を取得
    - formatとvctはメタデータから取得するように変更
    - CredentialIssuerConfigにissuerMetadataフィールドを追加
    - credential_identifierは未サポートとしてエラーを返す
- demos/employee-vci/src/logic/credentialsConfigProvider.ts
    - IssuerMetadataVcSdJwtを定義してconfigureに追加
- demos/employee-vci/tests/vci.test.ts
    - credential_configuration_idを使用するようにテストを更新
- すべてのテスト(21個)が合格

### /credentialエンドポイントのIFを最新化する
- 現在の実装のペイロードが最新版に準拠していないので修正する
- proofをproofsに変更
    - ペイロードも以下の例の様に変更

現在の実装
```
{
  proof: {
    proof_type: "jwt",
    jwt: "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6InNqcTYxTGViS2tkNDk3MFBwOUhmYkZuNWNOci1aNlVsZWxQWmNzUXo0NkkiLCJ5Ijoiazc3bHBXLVVhV3M1RTUwM3NWdF9ub0MwUXR3OEREX3JvNVdub1BXZnlocyJ9fQ.eyJub25jZSI6InJhbmRvbU5vbmNlIiwiaWF0IjoxNzYyNDAzODE2LCJhdWQiOiJodHRwczovL2V4YW1wbGUuY29tIiwiZXhwIjoxNzYyNDExMDE2fQ.NjCLNgscYB8qOl8bDcKYS7zWN2ThHqN7lo1iYlRhfKLsIwc5z6Pggp5IEIKiKzlCfu8YKzMu3HEnIAyiv6CfVA",
  },
}
```

最新版の例
```
{
  "proofs": {
    "jwt": [
      "eyJraWQiOiJkaWQ6ZXhhbXBsZTplYmZlYjFmNzEyZWJjNmYxYzI3NmUxMmVjMjEva2V5cy8x
       IiwiYWxnIjoiRVMyNTYiLCJ0eXAiOiJKV1QifQ"
    ]
  }
}
```
### /tokenエンドポイントのerror codeの適切性の確認と修正
以下の実装を確認してerror codeが適切にハンドリング、レスポンスされているか確認して、必要があれば修正してください。
- src/oid4vci/tokenEndpoint/TokenIssuer.ts
- demos/employee-vci/tests/vci.test.ts

#### 対応するerror codeの仕様
https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-token-error-response
```
If the Token Request is invalid or unauthorized, the Authorization Server constructs the error response as defined as in Section 5.2 of OAuth 2.0 [RFC6749].

The following additional clarifications are provided for some of the error codes already defined in [RFC6749]:

- invalid_request:
The Authorization Server does not expect a Transaction Code in the Pre-Authorized Code Flow but the Client provides a Transaction Code.
The Authorization Server expects a Transaction Code in the Pre-Authorized Code Flow but the Client does not provide a Transaction Code.

- invalid_grant:
The Authorization Server expects a Transaction Code in the Pre-Authorized Code Flow but the Client provides the wrong Transaction Code.
The End-User provides the wrong Pre-Authorized Code or the Pre-Authorized Code has expired.

- invalid_client:
The Client tried to send a Token Request with a Pre-Authorized Code without a Client ID but the Authorization Server does not support anonymous access.
```

### /credentialエンドポイントのerror codeの適切性の確認と修正
以下の実装を確認してerror codeが適切にハンドリング、レスポンスされているか確認して、必要があれば修正してください。
- src/oid4vci/credentialEndpoint/validateProof.ts
- tests/oid4vci/credentialEndpoint/authenticate.test.ts
- tests/oid4vci/credentialEndpoint/validateProof.test.ts
- demos/employee-vci/tests/vci.test.ts

#### 対応するerror codeの仕様
https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1
```
   invalid_request
         The request is missing a required parameter, includes an
         unsupported parameter or parameter value, repeats the same
         parameter, uses more than one method for including an access
         token, or is otherwise malformed.  The resource server SHOULD
         respond with the HTTP 400 (Bad Request) status code.

   invalid_token
         The access token provided is expired, revoked, malformed, or
         invalid for other reasons.  The resource SHOULD respond with
         the HTTP 401 (Unauthorized) status code.  The client MAY
         request a new access token and retry the protected resource
         request.
```

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-request-errors
```
8.3.1.1. Authorization Errors
If the Credential Request does not contain an Access Token that enables issuance of a requested Credential, the Credential Endpoint returns an authorization error response such as defined in Section 3 of [RFC6750].

- error: REQUIRED. The error parameter SHOULD be a single ASCII [USASCII] error code from the following:

    - invalid_credential_request: The Credential Request is missing a required parameter, includes an unsupported parameter or parameter value, repeats the same parameter, or is otherwise malformed.
    - unknown_credential_configuration: Requested Credential Configuration is unknown.
    - unknown_credential_identifier: Requested Credential identifier is unknown.
    - invalid_proof: The proofs parameter in the Credential Request is invalid: (1) if the field is missing, or (2) one of the provided key proofs is invalid, or (3) if at least one of the key proofs does not contain a c_nonce value (refer to Section 7.2).
    - invalid_nonce: The proofs parameter in the Credential Request uses an invalid nonce: at least one of the key proofs contains an invalid c_nonce value. The wallet should retrieve a new c_nonce value (refer to Section 7).
    - invalid_encryption_parameters: This error occurs when the encryption parameters in the Credential Request are either invalid or missing. In the latter case, it indicates that the Credential Issuer requires the Credential Response to be sent encrypted, but the Credential Request does not contain the necessary encryption parameters.
    - credential_request_denied: The Credential Request has not been accepted by the Credential Issuer. The Wallet SHOULD treat this error as unrecoverable, meaning if received from a Credential Issuer the Credential cannot be issued.
- error_description: OPTIONAL. The error_description parameter MUST be a human-readable ASCII [USASCII] text, providing any additional information used to assist the Client implementers in understanding the occurred error. The values for the error_description parameter MUST NOT include characters outside the set %x20-21 / %x23-5B / %x5D-7E.

The usage of these parameters takes precedence over the invalid_request parameter defined in Section 8.3.1.1, since they provide more details about the errors.
```
### /credentialエンドポイントのPoP実装のチェック
    - 実装は、src/oid4vci/credentialEndpoint/validateProof.ts
    - proofsのキーが`jwt`だった場合、デコードしたヘッダーにtypが存在して、値が`openid4vci-proof+jwt`であることをチェックしているか？
    - 未対応だった場合、チェック処理を追加して`invalid_proof`エラーを返すように修正する

### /credentialエンドポイントを修正
    - 現在、設計変更の影響でコメントアウトしているためテストコードが通らない
        - src/oid4vci/credentialEndpoint/defaults/accessToken.ts
        - src/oid4vci/credentialEndpoint/defaults/nonce.ts
    - 現在の問題点
        1. accessToken.ts (7-33行目)

        - accessTokenStateProviderが常に{ exists: false }を返している
        - 本来はアクセストークンをDBから取得し、c_nonce情報を含めて返すべき
        - コメントアウトされた実装ではdemos/common/src/authStore.jsに依存していた

        2. nonce.ts (8-15行目)

        - updateNonceがc_nonceを生成するが、DBに保存していない（13行目がコメントア
        ウト）
        - authStore.refreshNonceの呼び出しがコメントアウトされている

        3. 設計の問題

        - src/oid4vci配下のデフォルト実装がdemos/commonに直接依存していた
        - これは循環依存や設計上の問題があった

    - 解決方針
        - これらのデフォルト実装はdemos/commonに移動する
        - nonceのリフレッシュ要件はプロトコルから削除されたので関連する実装は削除

    - 未解決の問題
        > ⏺ テストはnonceの検証を期待していますが、現在proofElementsがundefinedのため
        >   、nonce検証が行われていません。
        > 
        >   問題は、c_nonceテーブルからaccess_token_idを削除したため、アクセストークン
        >   からc_nonceを取得できなくなったことです。
        > 
        >   新しい設計では：
        >   1. /nonceエンドポイントでc_nonceを取得
        >   2. /tokenエンドポイントではc_nonceを返さない
        >   3. /credentialエンドポイントでc_nonceを検証する際、どうやってc_nonceを取得
        >   するか？
        - c_nonceの検証の条件をリクエストにproofsが含まれている場合に変更
            - 該当する実装は、src/oid4vci/credentialEndpoint/CredentialIssuer.ts
            - nonceの値はproofsから取得した値で検索

### /nonceエンドポイントを追加
    - src/oid4vci/noncetokenEndpoint/TokenIssuer.tsに倣って、NonceIssuer.tsを追加
        - validateは不要
        - this.config.nonceIssuer()を呼び出す
    - demos/employee-vci/src/logic/vciConfigProvider.tsに倣ってnonceConfigProviderを実装
        - 分離したc_nonceの登録処理を呼び出す
    - demos/common/src/routes/vci/routesHandler.tsにhandleNonceを追加
    - demos/common/src/routes/vci/routes.tsに`POST /nonce`を追加
    - demos/employee-vci/tests/vci.test.tsに追加した処理のテストを追加

### /tokenエンドポイントからc_nonce生成処理を分離
    - demos/common/src/store/authStore.tsのaddAccessTokenからTBL_NM_C_NONCESへの追加処理を別関数に抽出
    - demos/employee-vci/src/store.tsの呼び出し部分を修正(抽出した関数の呼び出しは不要)
    - demos/employee-vci/tests/vci.test.tsの"should return 200 and access token details when correct pre-authorized_code is provided"の検証内容からc_nonceを削除

### テーブルの関連変更
    - demos/employee-vci/src/store.tsのauth_codes_employeesテーブルを削除
    - demos/common/src/store/authStore.tsのauth_codesテーブルに`sub VARCHAR`を追加
    - 影響を受けるdemos/employee-vci/src/store.tsのaddPreAuthCodeを修正