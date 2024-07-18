# Participation Cert VCI API
## Participation Cert  Summary

### Common API
For details on the common API, please see [README.md](../common/README.md).

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

## Preparing the .env File
Create the `.env` file based on the `.env.template`. Please adjust the content as necessary.

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

This endpoint is an API for registering new event.

#### Authorization

Use Basic authentication. Please set the Authorization header with the value encoded in Base64 in the format username:password.

#### Headers

- `Content-Type: application/json`

#### Request Payload

| Parameter     | Type   | Description        |
|---------------|--------|--------------------|
| name          | string | Event name         |
| description   | string | Event description  |
| location      | string | Venue location     |
| startDate     | string | Start date and time|
| endDate       | string | End date and time  |
| url           | string | Event URL          |
| organizerName | string | Organizer name     |
| organizerUrl  | string | Organizer URL      |

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3003/admin/conferences/new \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' \
-d '{
  "conference": {
      "name": "Tech Conference 2024",
      "description": "A conference where you can learn about the latest technologies and development methodologies.",
      "location": "Tokyo International Forum",
      "startDate": "2024-05-21T09:00:00+09:00",
      "endDate": "2024-05-23T18:00:00+09:00",
      "url": "https://techconference2024.example.com",
      "organizerName": "Tech Innovation Inc.",
      "organizerUrl": "https://techinnovation.example.com"
  }
}'
```

Example Response
```json
{
  "id": 1,
  "name": "Tech Conference 2024",
  "description": "A conference where you can learn about the latest technologies and development methodologies.",
  "location": "Tokyo International Forum",
  "startDate": "2024-05-21T09:00:00+09:00",
  "endDate": "2024-05-23T18:00:00+09:00",
  "url": "https://techconference2024.example.com",
  "organizerName": "Tech Innovation Inc.",
  "organizerUrl": "https://techinnovation.example.com"
}
```

### POST `/admin/conferences/:conferenceId/credential-offer`

This endpoint is an API for generating new event VC credential offers.

#### Authorization

Use Basic authentication. Please set the Authorization header with the value encoded in Base64 in the format username:password.

#### Headers

- `Content-Type: application/json`

#### Request Payload

```markdown
| Parameter    | Type   | Description |
|--------------|--------|-------------|
| conferenceId | number | Event ID    |
```

#### Example Request

##### Curl

```bash
curl -X POST \
http://localhost:3004/admin/conferences/1/credential-offer \
-H 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=' \
-H 'Content-Type: application/json' 
```
Example Response
```json
{
  "subject": {
    "conferenceId": "1"
  },
  "credentialOffer": "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.example.com%3A8443%22%2C%22credentials%22%3A%5B%22ParticipationCertificate%22%5D%2C%22grants%22%3A%7B%22urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code%22%3A%7B%22pre-authorized_code%22%3A%22nhzYY0nVOx6TetbsLVMlCQl8ZlRBSbZG%22%2C%22user_pin_required%22%3Afalse%7D%7D%7D"
}
```
