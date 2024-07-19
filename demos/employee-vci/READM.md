# Employee VCI API

## Employee VCI API Summary

### Common API
For details on the common API, please see [README.md](../../src/README.md).

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

## Preparing the .env File
Create the `.env` file based on the `.env.template`. Please adjust the content as necessary.

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

## Configuring Credential Issuer Metadata

Please modify the JSON file that exists under the `metadata` directory to match your operating environment. 
In particular, the `REPLACE-WITH-ISSUERS-DOMAIN.EXAMPLE.COM` in the JSON file should be the actual domain that can communicate with the wallet.

## Specific API

### POST `/admin/employees/new`

This endpoint is an API for registering new employees.

#### Authorization

Use Basic authentication. Please set the Authorization header with the value encoded in Base64 in the format username:password.

#### Headers

- `Content-Type: application/json`

#### Request Payload

| Parameter  | Type   | Description     |
|------------|--------|-----------------|
| employeeNo | string | Employee Number |
| givenName  | string | Given Name      |
| familyName | string | Family Name     |
| gender     | string | Gender          |
| division   | string | Division        |

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

Example Response
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

This endpoint is an API for generating new employee VC credential offers.

#### Authorization

Use Basic authentication. Please set the `Authorization` header with the value encoded in Base64 in the format `username:password`.

#### Headers

- `Content-Type: application/json`

#### Request Payload

| Parameter  | Type   | Description     |
|------------|--------|-----------------|
| employeeNo | number | Employee Number |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3003/admin/employees/1/credential-offer \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' 
```
Example Response
```json
{
  "subject": {
    "employeeNo": "1"
  },
  "credentialOffer": "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.example.com%22%2C%22credentials%22%3A%5B%22EmployeeCredential%22%5D%2C%22grants%22%3A%7B%22urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code%22%3A%7B%22pre-authorized_code%22%3A%22tH5yamPFHZ8pVr95Fhp26GCnzwAvgCfQ%22%2C%22user_pin_required%22%3Atrue%7D%7D%7D",
  "userPin": "28092571"
}
```
