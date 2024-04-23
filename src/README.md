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

---

## Admin Endpoints

### Authorization

Endpoints under `/admin` uniformly utilize Basic authentication. Please set the `Authorization` header with the value encoded in Base64 in the format `username:password`.

### Headers

For POST endpoints under `/admin`, the following headers are specified uniformly:

`Content-Type: application/json`

### POST `/admin/keys/new`

This endpoint is an API for generating new key pairs.

#### Request Payload

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| kid       | string | Identifier used in JWK format |

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

Example Response

```json
{
  "status": "success",
  "message": "Data created successfully!"
}
```

### POST `/admin/keys/:kid/revoke`

This endpoint is an API for revoking key pairs.

#### Request Payload

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| kid       | string | Identifier used in JWK format |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3000/admin/keys/key-1/revoke \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
```

Example Response

```json
{
  "status": "success",
  "message": "Data revoked successfully!"
}
```

### POST `/admin/keys/:kid/csr`

This endpoint is an API for generating Certificate Signing Requests (CSR).

#### Request Payload

| Parameter | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| subject   | string | Format compliant with the OpenSSL `-subj` option |

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

Example Response

```json
{
  "status": "success",
  "payload": {
    "csr": "MIIBHTCBwwIBADBhMQswCQYDVQQGEwJKUDEOMAwGA1UECAwFVG9reW8xEzARBgNVBAcMCkNoaXlvZGEta3UxGDAWBgNVBAoMD0V4YW1wbGUgQ29tcGFueTETMBEGA1UEAwwKZXhhbXBsZS5qcDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHSRXMetSx+h5yz/q5/5YobOazq7xTqfHZgOviBxqZnE/EjUfBN2LUpbo9NCW+PsHW13SfORlVuPI+l1JC0mUbWgADAKBggqhkjOPQQDAgNJADBGAiEA8f9eYS1PImiBhzOf1cHaNkScoMgtz6le7H3FZQmmVIsCIQDpxv0q5rWhUzH8WrV9ifC4udxsZWGLYmAaZpFXbMMneg=="
  }
}
```

### POST `/admin/keys/:kid/signselfcert`

This endpoint is an API for generating self-signed certificates.

#### Request Payload

| Parameter | Type   | Description                       |
| --------- | ------ | --------------------------------- |
| csr       | string | Certificate Signing Request (CSR) |

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

Example Response

```json
{
  "status": "success",
  "payload": {
    "cert": "MIIBwTCCAWigAwIBAgIUIe3tRrXpmJsUrou6k0Qphk0ps38wCgYIKoZIzj0EAwIwYTELMAkGA1UEBhMCSlAxDjAMBgNVBAgMBVRva3lvMRMwEQYDVQQHDApDaGl5b2RhLWt1MRgwFgYDVQQKDA9FeGFtcGxlIENvbXBhbnkxEzARBgNVBAMMCmV4YW1wbGUuanAwHhcNMjQwMzA1MDQ0MzI1WhcNMjUwMzA1MDQ0MzI1WjBhMQswCQYDVQQGEwJKUDEOMAwGA1UECAwFVG9reW8xEzARBgNVBAcMCkNoaXlvZGEta3UxGDAWBgNVBAoMD0V4YW1wbGUgQ29tcGFueTETMBEGA1UEAwwKZXhhbXBsZS5qcDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHSRXMetSx+h5yz/q5/5YobOazq7xTqfHZgOviBxqZnE/EjUfBN2LUpbo9NCW+PsHW13SfORlVuPI+l1JC0mUbUwCgYIKoZIzj0EAwIDRwAwRAIgXQYga6xkszA1lhBlOxCiSnn8YlLnAdsmflcnMpCt60ECIGyr+ye3U1qwUXLyyP09hQrV+VLq0gegAzgBthIaExW4"
  }
}
```

### POST `/admin/keys/:kid/registercert`

This endpoint is an API for registering server certificates for key pairs.

#### Request Payload

| Parameter    | Type   | Description         |
| ------------ | ------ | ------------------- |
| certificates | string | Server certificates |

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

Example Response

```json
{ "status": "success", "message": "certificate registration succeeded" }
```

### GET `/admin/keys/:kid`

---

## Common APIs defined by OID4VCI

### GET `/.well-known/openid-credential-issuer`

This is the URL for publishing the metadata of the Credential Issuer. For more details, please see below.

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-12.html#name-credential-issuer-metadata-

### GET `/.well-known/oauth-authorization-server`

This is the URL for publishing the metadata of the Credential Issuer's authorization server. For more details, please see below.

https://www.rfc-editor.org/rfc/rfc8414.html#section-3

### POST `/token`

This is the Token endpoint. For more details, please see below.

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-12.html#name-token-endpoint

### POST `/credentials`

This is the Credential endpoint. For more details, please see below.

https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-12.html#name-credential-request
