# Common Endpoints

## Common Endpoints Summary

### Admin Endpoints

- POST `/admin/keys/new`
- POST `/admin/keys/:kid/revoke`
- POST `/admin/keys/:kid/csr`
- POST `/admin/keys/:kid/signselfcert`
- POST `/admin/keys/:kid/registercert`
- GET `/admin/keys/:kid`

### Endpoints defined by OID4VCI

- GET `/.well-known/openid-credential-issuer`
- GET `/.well-known/oauth-authorization-server`
- POST `/token`
- POST `/credentials`

--------------------------------------------------------------------------------

## Admin Endpoints
### Authorization

`/admin`以下のエンドポイントでは共通してBasic認証を用います。
ユーザー名とパスワードを`username:password`形式でBase64でエンコードした値を`Authorization`ヘッダーにセットしてください。

### Headers

`/admin`以下のPOSTエンドポイントでは共通して以下のヘッダーを指定します。

`Content-Type: application/json`

### POST `/admin/keys/new`

このエンドポイントは、新たなキーペアを生成するためのAPIです。

#### Request Payload

| Parameter | Type   | Description   |
|-----------|--------|---------------|
| kid       | string | JWK形式で使用する識別子 |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3000/admin/keys/new \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
  "kid": "key-1"
}'
```

レスポンス例
```json
{
  "status": "success",
  "message": "Data created successfully!"
}
```

### POST `/admin/keys/:kid/revoke`

このエンドポイントは、キーペアをRevokeするためのAPIです。

#### Request Payload

| Parameter | Type   | Description   |
|-----------|--------|---------------|
| kid       | string | JWK形式で使用する識別子 |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3000/admin/keys/key-1/revoke \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
```

レスポンス例
```json
{
  "status": "success",
  "message": "Data revoked successfully!"
}
```

### POST `/admin/keys/:kid/csr`

このエンドポイントは、証明書署名リクエスト(CSR)を生成するためのAPIです。

#### Request Payload

| Parameter | Type   | Description                 |
|-----------|--------|-----------------------------|
| subject   | string | OpenSSLの`-subj`オプションの形式に準ずる |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3000/admin/keys/key-1/csr \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
  "subject": "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=Example Company/CN=example.jp"
}'
```

レスポンス例
```json
{
  "status":"success",
  "payload":{
    "csr":"MIIBHTCBwwIBADBhMQswCQYDVQQGEwJKUDEOMAwGA1UECAwFVG9reW8xEzARBgNVBAcMCkNoaXlvZGEta3UxGDAWBgNVBAoMD0V4YW1wbGUgQ29tcGFueTETMBEGA1UEAwwKZXhhbXBsZS5qcDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHSRXMetSx+h5yz/q5/5YobOazq7xTqfHZgOviBxqZnE/EjUfBN2LUpbo9NCW+PsHW13SfORlVuPI+l1JC0mUbWgADAKBggqhkjOPQQDAgNJADBGAiEA8f9eYS1PImiBhzOf1cHaNkScoMgtz6le7H3FZQmmVIsCIQDpxv0q5rWhUzH8WrV9ifC4udxsZWGLYmAaZpFXbMMneg=="
  }
}
```

### POST `/admin/keys/:kid/signselfcert`

このエンドポイントは、自己署名証明書を生成するためのAPIです。

#### Request Payload

| Parameter | Type   | Description                 |
|-----------|--------|-----------------------------|
| csr       | string | 証明書署名リクエスト(CSR) |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3000/admin/keys/key-1/signselfcert \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
  "csr": "MIIBHTCBwwIBADBhMQswCQYDVQQGEwJKUDEOMAwGA1UECAwFVG9reW8xEzARBgNVBAcMCkNoaXlvZGEta3UxGDAWBgNVBAoMD0V4YW1wbGUgQ29tcGFueTETMBEGA1UEAwwKZXhhbXBsZS5qcDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHSRXMetSx+h5yz/q5/5YobOazq7xTqfHZgOviBxqZnE/EjUfBN2LUpbo9NCW+PsHW13SfORlVuPI+l1JC0mUbWgADAKBggqhkjOPQQDAgNJADBGAiEA8f9eYS1PImiBhzOf1cHaNkScoMgtz6le7H3FZQmmVIsCIQDpxv0q5rWhUzH8WrV9ifC4udxsZWGLYmAaZpFXbMMneg=="
}'
```

レスポンス例
```json
{
  "status":"success",
  "payload":{
    "cert":"MIIBwTCCAWigAwIBAgIUIe3tRrXpmJsUrou6k0Qphk0ps38wCgYIKoZIzj0EAwIwYTELMAkGA1UEBhMCSlAxDjAMBgNVBAgMBVRva3lvMRMwEQYDVQQHDApDaGl5b2RhLWt1MRgwFgYDVQQKDA9FeGFtcGxlIENvbXBhbnkxEzARBgNVBAMMCmV4YW1wbGUuanAwHhcNMjQwMzA1MDQ0MzI1WhcNMjUwMzA1MDQ0MzI1WjBhMQswCQYDVQQGEwJKUDEOMAwGA1UECAwFVG9reW8xEzARBgNVBAcMCkNoaXlvZGEta3UxGDAWBgNVBAoMD0V4YW1wbGUgQ29tcGFueTETMBEGA1UEAwwKZXhhbXBsZS5qcDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHSRXMetSx+h5yz/q5/5YobOazq7xTqfHZgOviBxqZnE/EjUfBN2LUpbo9NCW+PsHW13SfORlVuPI+l1JC0mUbUwCgYIKoZIzj0EAwIDRwAwRAIgXQYga6xkszA1lhBlOxCiSnn8YlLnAdsmflcnMpCt60ECIGyr+ye3U1qwUXLyyP09hQrV+VLq0gegAzgBthIaExW4"
  }
}
```

### POST `/admin/keys/:kid/registercert`

このエンドポイントは、キーペアに対するサーバー証明書を登録するためのAPIです。

#### Request Payload

| Parameter | Type   | Description |
|-----------|--------|-------------|
| certificates       | string | サーバー証明書     |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3000/admin/keys/key-3/registercert \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
  "certificates": ["MIIBwTCCAWigAwIBAgIUIe3tRrXpmJsUrou6k0Qphk0ps38wCgYIKoZIzj0EAwIwYTELMAkGA1UEBhMCSlAxDjAMBgNVBAgMBVRva3lvMRMwEQYDVQQHDApDaGl5b2RhLWt1MRgwFgYDVQQKDA9FeGFtcGxlIENvbXBhbnkxEzARBgNVBAMMCmV4YW1wbGUuanAwHhcNMjQwMzA1MDQ0MzI1WhcNMjUwMzA1MDQ0MzI1WjBhMQswCQYDVQQGEwJKUDEOMAwGA1UECAwFVG9reW8xEzARBgNVBAcMCkNoaXlvZGEta3UxGDAWBgNVBAoMD0V4YW1wbGUgQ29tcGFueTETMBEGA1UEAwwKZXhhbXBsZS5qcDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHSRXMetSx+h5yz/q5/5YobOazq7xTqfHZgOviBxqZnE/EjUfBN2LUpbo9NCW+PsHW13SfORlVuPI+l1JC0mUbUwCgYIKoZIzj0EAwIDRwAwRAIgXQYga6xkszA1lhBlOxCiSnn8YlLnAdsmflcnMpCt60ECIGyr+ye3U1qwUXLyyP09hQrV+VLq0gegAzgBthIaExW4"]
}'
```

レスポンス例
```json
  {"status":"success","message":"certificate registration succeeded"}
```

### GET `/admin/keys/:kid`

--------------------------------------------------------------------------------

## Common APIs defined by OID4VCI
### GET `/.well-known/openid-credential-issuer`

Credential Issuerのメタデータを公開するURLです。詳細は以下をご覧ください。

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-12.html#name-credential-issuer-metadata-

### GET `/.well-known/oauth-authorization-server`

Credential Issuerの認可サーバーのメタデータを公開するURLです。詳細は以下をご覧ください。

https://www.rfc-editor.org/rfc/rfc8414.html#section-3

### POST `/token`

Tokenエンドポイントです。詳細は以下をご覧ください。

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-12.html#name-token-endpoint

### POST `/credentials`

Credentialエンドポイントです。詳細は以下をご覧ください。

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-12.html#name-credential-request

