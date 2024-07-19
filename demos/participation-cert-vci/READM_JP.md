# Participation Cert VCI API
## Participation Cert  Summary

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

- POST `/admin/conferences/new`
- POST `/admin/conferences/:conferenceId/credential-offer`

## `.env`ファイルの用意
`.env.template`をベースに`.env`を作成します。内容は適宜変更してください

| Key                                 | Sample Value                 | 
| ----------------------------------- |------------------------------| 
| ENVIRONMENT                         | dev                          | 
| DATABASE_FILEPATH                   | ./database.sqlite            | 
| APP_PORT                            | 3002                         | 
| BASIC_AUTH_USERNAME                 | username                     | 
| BASIC_AUTH_PASSWORD                 | password                     | 
| CREDENTIAL_ISSUER_IDENTIFIER        | https://demo-vci.exemple.com | 
| CREDENTIAL_ISSUER                   | https://demo-vci.exemple.com | 
| CREDENTIAL_OFFER_ENDPOINT           | openid-credential-offer://   | 
| VCI_PRE_AUTH_CODE_EXPIRES_IN        | 86400                        | 
| VCI_ACCESS_TOKEN_EXPIRES_IN         | 86400                        | 
| VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN | 86400                        | 

## Specific API

### POST` /admin/conferences/new` 

このエンドポイントは、新たなイベントを登録するためのAPIです。

#### Authorization

Basic認証を用います。ユーザー名とパスワードを`username:password`形式でBase64でエンコードした値を`Authorization`ヘッダーにセットしてください。

#### Headers

- `Content-Type: application/json`

#### Request Payload

| パラメータ    | 型     | 説明         | 
| ------------- | ------ | ------------ | 
| name          | string | イベント名称 | 
| description   | string | イベント内容 | 
| location      | string | 開催場所     | 
| startDate     | string | 開始日時     | 
| endDate       | string | 終了日時     | 
| url           | string | イベントURL  | 
| organizerName | string | 開催組織名称 | 
| organizerUrl  | string | 開催組織URL  | 

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3003/admin/conferences/new \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
  "conference": {
      "name": "テックカンファレンス2024",
      "description": "最新のテクノロジーと開発手法について学ぶことができるカンファレンスです。",
      "location": "東京国際フォーラム",
      "startDate": "2024-05-21T09:00:00+09:00",
      "endDate": "2024-05-23T18:00:00+09:00",
      "url": "https://techconference2024.example.com",
      "organizerName": "テックイノベーション株式会社",
      "organizerUrl": "https://techinnovation.example.com"
  }
}'
```

レスポンス例
```json
{
  "id": 1,
  "name": "テックカンファレンス2024",
  "description": "最新のテクノロジーと開発手法について学ぶことができるカンファレンスです。",
  "location": "東京国際フォーラム",
  "startDate": "2024-05-21T09:00:00+09:00",
  "endDate": "2024-05-23T18:00:00+09:00",
  "url": "https://techconference2024.example.com",
  "organizerName": "テックイノベーション株式会社",
  "organizerUrl": "https://techinnovation.example.com"
}
```

### POST `/admin/conferences/:conferenceId/credential-offer`

このエンドポイントは、新たな社員証VCクレデンシャルオファーを生成するためのAPIです。

#### Authorization

Basic認証を用います。ユーザー名とパスワードを`username:password`形式でBase64でエンコードした値を`Authorization`ヘッダーにセットしてください。

#### Headers

- `Content-Type: application/json`

#### Request Payload

| パラメータ | 型      | 説明     |
|------------|--------|--------|
| conferenceId  | number | イベントID |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3004/admin/conferences/1/credential-offer \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' 
```
レスポンス例
```json
{
  "subject": {
    "conferenceId": "1"
  },
  "credentialOffer": "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.example.com%3A8443%22%2C%22credentials%22%3A%5B%22ParticipationCertificate%22%5D%2C%22grants%22%3A%7B%22urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code%22%3A%7B%22pre-authorized_code%22%3A%22nhzYY0nVOx6TetbsLVMlCQl8ZlRBSbZG%22%2C%22user_pin_required%22%3Afalse%7D%7D%7D"
}
```
