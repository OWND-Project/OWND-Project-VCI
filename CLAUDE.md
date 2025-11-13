# 環境情報
## 利用言語
node 22

## 利用ライブラリ
- https://www.npmjs.com/package/@ownd-project/ts-toolbox
- 他必要に応じて


### ts-toolboxのソースコードの場所
/Users/ryousuke/repositories/ownd/tool-box

## 提供する機能
OID4VCIのプロトコルに準拠したクレデンシャル発行サーバーを構築する際の機能をライブラリとして提供する

### ライブラリでサポートするOID4VCIの機能

- [OID4VCI](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0-04.html)
- [HAIP](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)

#### Credential Offer Endpoint

出力するURLのサンプル
```
openid-credential-offer://?
  credential_offer=%7B%22credential_issuer%22:%22https://credential-issuer.exam
  ple.com%22,%22credential_configuration_ids%22:%5B%22org.iso.18013.5.1.mDL%22%
  5D,%22grants%22:%7B%22urn:ietf:params:oauth:grant-type:pre-authorized_code%22
  :%7B%22pre-authorized_code%22:%22oaKazRN8I0IbtZ0C7JuMn5%22,%22tx_code%22:%7B%
  22input_mode%22:%22text%22,%22description%22:%22Please%20enter%20the%20serial
  %20number%20of%20your%20physical%20drivers%20license%22%7D%7D%7D%7D
```

URLに含まれるパラメータのJSON表現
```
{
  "credential_issuer": "https://credential-issuer.example.com",
  "credential_configuration_ids": [
    "XXX"
  ],
  "grants": {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "oaKazRN8I0IbtZ0C7JuMn5",
      "tx_code": {
        "length": 4,
        "input_mode": "numeric",
        "description": "Please provide the one-time code that was sent via e-mail"
      }
    }
  }
}
```