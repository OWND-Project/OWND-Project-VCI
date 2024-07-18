# MyNumber Card Info VCI API
## MyNumber Card Info VCI API Summary

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

## `.env`ファイルの用意
`.env.template`をベースに`.env`を作成します。内容は適宜変更してください

| Key                                 | Value                  | 
| ----------------------------------- | ---------------------- | 
| APP_PORT                            | 3000                   | 
| BASIC_AUTH_USERNAME                 | username               | 
| BASIC_AUTH_PASSWORD                 | password               | 
| DATABASE_FILEPATH                   | ./database.sqlite      | 
| ISS_ENTITY_NAME                     | OAuth2の認可フロー開始時のUIに表示される発行者の名称 | 
| CREDENTIAL_ISSUER_IDENTIFIER        | Credential Issuer Metadataファイルの`credential_issuer`の項に記載の値と同じものを設定してください。                       | 
| CREDENTIAL_OFFER_ENDPOINT           | openid-credential-offer:// | 
| OAUTH2_AUTH_ENDPOINT                | xID社(https://xid.inc)より提供を受けてください | 
| OAUTH2_TOKEN_ENDPOINT               | xID社(https://xid.inc)より提供を受けてください | 
| OAUTH2_CLIENT_ID                    | xID社(https://xid.inc)より提供を受けてください | 
| OAUTH2_CLIENT_SECRET                | xID社(https://xid.inc)より提供を受けてください | 
| OAUTH2_REDIRECT_URI                 | xID社(https://xid.inc)への申請時に提供したコールバックURL | 
| OAUTH2_SCOPE                        | xID社(https://xid.inc)より選択できる値の提供を受けてください | 
| VCI_PRE_AUTH_CODE_EXPIRES_IN        | 86400                  | 
| VCI_ACCESS_TOKEN_EXPIRES_IN         | 86400                  | 
| VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN | 86400                  | 
| WALLET_NAME                         | OAuth2の認可フロー開始時のUIに表示されるクライアントの名称 | 
| X_ID_CLIENT_KEY_PAIR_PRIVATE        | xID社(https://xid.inc)への申請時に生成した秘密鍵 | 
| X_ID_CLIENT_KEY_PAIR_PUBLIC         | xID社(https://xid.inc)への申請時に生成した公開鍵 | 
| X_ID_API_BASE_URL                   | xID社(https://xid.inc)より提供を受けてください | 

### Specific API
このアプリケーションには固有のAPIはありません
