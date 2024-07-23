# Employee VCI API
## Employee VCI API Summary

### Common API
共通APIの詳細はこちらの[README.md](../common/README_JP.md)をご覧ください
- POST `/admin/keys/new`
- POST `/admin/keys/:kid/revoke`
- POST `/admin/keys/:kid/csr`
- POST `/admin/keys/:kid/signselfcert`
- POST `/admin/keys/:kid/registercert`
- GET `/admin/keys/:kid`
- GET `/.well-known/openid-credential-issuer`
- GET `/.well-known/oauth-authorization-server`
- POST `/token`
- POST `/credentials`

### Specific API

- POST `/admin/employees/new`
- POST `/admin/employees/:employeeNo/credential-offer`

## `.env`ファイルの用意
`.env.template`をベースに`.env`を作成します。内容は適宜変更してください

| Key                                 | Sample Value                 | 
| ----------------------------------- |------------------------------| 
| ENVIRONMENT                         | dev                          | 
| DATABASE_FILEPATH                   | ./database.sqlite            | 
| APP_PORT                            | 3001                         | 
| BASIC_AUTH_USERNAME                 | username                     | 
| BASIC_AUTH_PASSWORD                 | password                     | 
| CREDENTIAL_ISSUER_IDENTIFIER        | https://demo-vci.exemple.com | 
| CREDENTIAL_ISSUER                   | https://demo-vci.exemple.com | 
| CREDENTIAL_OFFER_ENDPOINT           | openid-credential-offer://   | 
| VCI_PRE_AUTH_CODE_EXPIRES_IN        | 86400                        | 
| VCI_ACCESS_TOKEN_EXPIRES_IN         | 86400                        | 
| VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN | 86400                        | 

## Specific API

### POST `/admin/employees/new`

このエンドポイントは、新たな社員を登録するためのAPIです。

#### Authorization

Basic認証を用います。ユーザー名とパスワードを`username:password`形式でBase64でエンコードした値を`Authorization`ヘッダーにセットしてください。

#### Headers

- `Content-Type: application/json`

#### Request Payload

| パラメータ      | 型     | 説明   |
|------------|--------|------|
| employeeNo | string | 社員番号 |
| givenName  | string | 名前   |
| familyName | string | 苗字   |
| gender     | string | 性別   |
| division   | string | 部署名  |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3003/admin/employees/new \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
"employee": {
"employeeNo": "1",
"givenName": "test1",
"familyName": "test2",
"gender": "test3",
"division": "test4"
}
}'
```

レスポンス例
```json
{
"employeeNo": 1,
"givenName": "test1",
"familyName": "test2",
"gender": "test3",
"division": "test4"
}
```

### POST `/admin/employees/:employeeNo`

このエンドポイントは、新たな社員証VCクレデンシャルオファーを生成するためのAPIです。

#### Authorization

Basic認証を用います。ユーザー名とパスワードを`username:password`形式でBase64でエンコードした値を`Authorization`ヘッダーにセットしてください。

#### Headers

- `Content-Type: application/json`

#### Request Payload

| パラメータ | 型      | 説明   |
|------------|--------|------|
| employeeNo  | number | 社員番号 |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3003/admin/employees/1/credential-offer \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' 
```
レスポンス例
```json
{
  "subject": {
    "employeeNo": "1"
  },
  "credentialOffer": "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.example.com%22%2C%22credentials%22%3A%5B%22EmployeeCredential%22%5D%2C%22grants%22%3A%7B%22urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code%22%3A%7B%22pre-authorized_code%22%3A%22tH5yamPFHZ8pVr95Fhp26GCnzwAvgCfQ%22%2C%22user_pin_required%22%3Atrue%7D%7D%7D",
  "userPin": "28092571"
}
```
