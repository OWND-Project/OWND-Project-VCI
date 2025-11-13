# OID4VCI仕様準拠性分析

## 概要

このドキュメントは、OWND-Project-VCIの現行実装と最新のOID4VCI仕様（v1.0 / HAIP draft-04）との差異を分析したものです。

**調査日**: 2025-11-10
**参照仕様**:
- [OpenID4VCI 1.0 WG Draft](https://openid.github.io/OpenID4VCI/openid-4-verifiable-credential-issuance-1_0-wg-draft.html)
- [HAIP draft-04](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0-04.html)

---

## 1. Issuer Metadataのトップレベルパラメータ

### 1.1 不足しているパラメータ

| パラメータ | 仕様での要件 | 現在の実装 | 影響度 |
|-----------|-------------|----------|--------|
| `nonce_endpoint` | OPTIONAL（HAIPではkey binding時にREQUIRED） | ❌ 未実装 | **高** |

#### 1.1.1 `nonce_endpoint`

**仕様**:
- OID4VCI 1.0 Section 12.2.4: OPTIONAL
- HAIP draft-04 Section 4.1: key bindingをサポートする場合はREQUIRED

**影響**:
- **重要**: employee-vciはkey binding（`cryptographic_binding_methods_supported: ['jwk']`）を使用している
- HAIPに準拠するには必須
- 現在は`POST /nonce`エンドポイントが実装されているが、メタデータに含まれていない

**推奨対応**:
```typescript
interface BaseIssuerMetadata {
  // 既存のフィールド...
  nonce_endpoint?: string; // 追加（HAIPではkey binding時に必須）
}
```

**実装での追加**:
```typescript
// demos/employee-vci/src/metadata/MetadataRepository.ts
async getIssuerMetadata(): Promise<IssuerMetadata> {
  return {
    credential_issuer: this.credentialIssuer,
    credential_endpoint: `${this.credentialIssuer}/credentials`,
    nonce_endpoint: `${this.credentialIssuer}/nonce`, // 追加
    // ...
  };
}
```

---

## 2. `credential_configurations_supported` 内のパラメータ

### 2.1 必須/オプショナルの不整合

| パラメータ | 仕様での要件 | 現在の実装 | 影響度 |
|-----------|-------------|----------|--------|
| `format` | REQUIRED | `format: string` ✓ | - |
| `scope` | OPTIONAL（HAIPではREQUIRED） | `scope?: string` | **高** |
| `cryptographic_binding_methods_supported` | REQUIRED | `?: string[]` | **高** |
| `credential_signing_alg_values_supported` | REQUIRED | `?: string[]` | **高** |
| `proof_types_supported` | OPTIONAL | `?: {...}` ✓ | - |

#### 2.1.1 `scope`

**仕様**:
- OID4VCI 1.0: OPTIONAL
- **HAIP draft-04 Section 4.1**: 各credential configurationに必須
  > "The Credential Issuer metadata MUST include a scope for every Credential Configuration it supports"

**現在の実装**: オプショナル (`scope?: string`)

**影響**:
- HAIP準拠には必須
- employee-vciでは既に設定している（`scope: "EmployeeIdentification"`）
- 型定義を修正すべき

**推奨対応**:
```typescript
// HAIP準拠の場合
export interface IssuerMetadataVcSdJwtHAIP extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      format: string;
      scope: string; // HAIPでは必須
      // ...
    };
  };
}
```

#### 2.1.2 `cryptographic_binding_methods_supported`

**仕様**: OID4VCI 1.0 Section 12.2.4 - REQUIRED

**現在の実装**: オプショナル (`cryptographic_binding_methods_supported?: string[]`)

**影響**:
- 仕様では必須だが、現在の型定義ではオプショナル
- 実際の実装（employee-vci）では設定している

**推奨対応**:
```typescript
export interface IssuerMetadataVcSdJwt extends BaseIssuerMetadata {
  credential_configurations_supported: {
    [key: string]: {
      // ...
      cryptographic_binding_methods_supported: string[]; // ?を削除
      credential_signing_alg_values_supported: string[]; // ?を削除
      // ...
    };
  };
}
```

---

## 3. Display関連のパラメータ

### 3.1 IssuerDisplayの拡張フィールド

**現在の実装**:
```typescript
export interface IssuerDisplay extends BaseDisplay {
  logo?: BaseLogo;
}
```

**仕様**: OID4VCI 1.0では以下も定義されている可能性がある（要確認）:
- `background_color`
- `text_color`

**現在の実装での対応**:
employee-vciでは`buildDisplayInfo()`で`background_color`と`text_color`を設定しているが、型定義に含まれていない。

**推奨対応**:
```typescript
export interface IssuerDisplay extends BaseDisplay {
  logo?: BaseLogo;
  background_color?: string; // 追加
  text_color?: string;       // 追加
}
```

---

## 4. その他の検討事項

### 4.1 Signed Metadata（署名付きメタデータ）

**仕様**: HAIP draft-04 Section 4.1
- エコシステムポリシーがTLS以上の認証を要求する場合、署名付きメタデータが必須
- `x5c` JOSEヘッダーを使用した鍵解決が必要

**現在の実装**:
- `signed_metadata?: string` フィールドは存在
- 実際の署名処理は未実装

**影響度**: 中〜高（HAIPの高セキュリティ要件を満たすために必要）

### 4.2 Credential Response Encryption

**現在の実装**:
```typescript
export interface CredentialResponseEncryption {
  alg_values_supported: string[];
  enc_values_supported: string[];
  encryption_required: boolean;
}
```

**仕様準拠状況**: ✓ 適切に定義されている

---

## 5. 優先度別対応推奨事項

### 優先度: 高（HAIP準拠に必須）

1. ✅ **`nonce_endpoint`の追加**
   - BaseIssuerMetadataに追加
   - MetadataRepositoryで設定

2. ✅ **`scope`をHAIP準拠時は必須に**
   - HAIP用の型定義を作成するか、既存の型定義を修正

3. ✅ **`cryptographic_binding_methods_supported`と`credential_signing_alg_values_supported`を必須に**
   - オプショナル（?）を削除

### 優先度: 中

4. ⚠️ **`token_endpoint`の追加**
   - 将来的にAuthorization Serverを分離する場合に必要

5. ⚠️ **`IssuerDisplay`への`background_color`/`text_color`追加**
   - 現在の実装で既に使用しているため、型定義に含めるべき

### 優先度: 低

6. 📝 **Signed Metadata実装**
   - 高セキュリティ要件のエコシステムで必要
   - 現時点では優先度低

---

## 6. 実装への影響

### 6.1 型定義の修正が必要なファイル

- `src/oid4vci/types/protocol.types.ts`
  - BaseIssuerMetadataの修正
  - credential_configurations_supportedの必須/オプショナルの見直し

### 6.2 実装の修正が必要なファイル

- `demos/employee-vci/src/metadata/MetadataRepository.ts`
  - `nonce_endpoint`の追加
  - （既にscopeやcryptographic_bindingは設定されているので、型が合えばOK）

### 6.3 テストへの影響

- `demos/employee-vci/tests/vci.test.ts`のメタデータテストに`nonce_endpoint`の確認を追加

---

## 7. まとめ

### 7.1 重大な差異

1. **`nonce_endpoint`が未実装** - HAIPでkey binding使用時に必須
2. **型定義と仕様の必須/オプショナルが不一致** - `cryptographic_binding_methods_supported`等

### 7.2 軽微な差異

1. `IssuerDisplay`の型定義に`background_color`/`text_color`が含まれていない（実装では使用中）

### 7.3 注意事項

1. **`token_endpoint`はCredential Issuer Metadataには含まれない**
   - OID4VCI 1.0の仕様では、`token_endpoint`はOAuth 2.0 Authorization Server Metadata (RFC 8414)の一部
   - Walletは`authorization_servers`パラメータからAuthorization Server Metadataを取得し、そこから`token_endpoint`を発見する

### 7.4 次のステップ

1. 型定義の修正（protocol.types.ts）
2. MetadataRepositoryへの`nonce_endpoint`追加
3. テストの更新
4. ドキュメントの更新
