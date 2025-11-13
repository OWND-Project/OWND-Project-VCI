# OpenID Credential Issuer Metadata 生成方式の提案

## 現在の方式（ファイル読み込み方式）

### 実装
```typescript
// src/utils/resourceUtils.ts
export const getIssuerMetadata = async (dirname, filename) => {
  if (!cachedIssuerMetadata) {
    cachedIssuerMetadata = await readLocalIssuerMetadata(dirname, filename);
  }
  return cachedIssuerMetadata;
};
```

### メリット
- ✅ シンプルで理解しやすい
- ✅ JSONエディタで編集可能
- ✅ 静的ファイルとしてCDN配信可能
- ✅ バージョン管理が容易

### デメリット
- ❌ 環境ごとにファイルが必要（dev/prod）
- ❌ URLなど環境依存値の重複管理
- ❌ 変更時にサーバー再起動が必要（キャッシュクリア）
- ❌ 動的な値（現在時刻など）が含められない

---

## 提案1: TypeScript定義オブジェクト方式（推奨）

### 概要
TypeScriptでメタデータオブジェクトを定義し、型安全に管理する方式

### 実装例

#### ファイル構成
```
src/
  metadata/
    issuerMetadata.ts          # メタデータ定義
    credentialConfigs.ts       # クレデンシャル設定
    displayInfo.ts             # 表示情報
```

#### 実装サンプル
```typescript
// src/metadata/credentialConfigs.ts
import { CredentialConfiguration } from '../oid4vci/types/protocol.types.js';

export const employeeCredentialConfig: CredentialConfiguration = {
  format: "dc+sd-jwt",
  scope: "EmployeeIdentificationCredential",
  cryptographic_binding_methods_supported: ["jwk"],
  credential_signing_alg_values_supported: ["ES256"],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: ["ES256"],
    },
  },
  vct: "EmployeeIdentificationCredential",
  claims: {
    companyName: {
      display: [
        { name: "会社名", locale: "ja-JP" },
        { name: "Company Name", locale: "en-US" },
      ],
    },
    employeeNo: {
      display: [
        { name: "社員番号", locale: "ja-JP" },
        { name: "Employee Number", locale: "en-US" },
      ],
    },
    // ... 他のクレーム
  },
};

// src/metadata/issuerMetadata.ts
import { IssuerMetadata } from '../oid4vci/types/protocol.types.js';
import { employeeCredentialConfig } from './credentialConfigs.js';

export const generateIssuerMetadata = (
  credentialIssuer: string,
): IssuerMetadata => ({
  credential_issuer: credentialIssuer,
  credential_endpoint: `${credentialIssuer}/credentials`,
  display: [
    {
      name: "株式会社Example",
      locale: "ja-JP",
      logo: {
        uri: `${credentialIssuer}/images/company-logo.png`,
        alt_text: "株式会社Exampleのロゴ",
      },
      background_color: "#003289",
      text_color: "#FFFFFF",
    },
    {
      name: "Example Inc.",
      locale: "en-US",
      logo: {
        uri: `${credentialIssuer}/images/company-logo.png`,
        alt_text: "a square logo of a Example Inc.",
      },
      background_color: "#003289",
      text_color: "#FFFFFF",
    },
  ],
  credential_configurations_supported: {
    EmployeeIdentificationCredential: employeeCredentialConfig,
  },
});

// demos/common/src/routes/vci/routesHandler.ts（修正版）
export async function handleIssueMetadata(
  ctx: Koa.Context,
  credentialIssuer: string,
  availableLocales: string[],
  defaultLocale: string,
) {
  try {
    const metadata = generateIssuerMetadata(credentialIssuer);

    const needsLocalization = process.env.RESOLVE_ACCEPT_LANGUAGE === "true";
    if (needsLocalization) {
      const acceptLanguage = ctx.request.header["accept-language"];
      if (acceptLanguage) {
        const preferred = resolveAcceptLanguage(
          acceptLanguage,
          availableLocales,
          defaultLocale,
        );
        ctx.body = localizeIssuerMetadata(metadata, preferred, defaultLocale);
        ctx.status = 200;
        return;
      }
    }

    ctx.body = metadata;
    ctx.status = 200;
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}
```

### メリット
- ✅ **型安全性**: TypeScriptの型チェックでミスを防止
- ✅ **環境依存値の動的生成**: URLなどを環境変数から注入可能
- ✅ **コード補完**: IDEの支援が受けられる
- ✅ **ファイル削減**: dev/prod用の重複ファイルが不要
- ✅ **テスト容易性**: ユニットテストで検証可能
- ✅ **リアルタイム反映**: コード変更が即座に反映（キャッシュ不要）

### デメリット
- ❌ JSONとして直接編集できない
- ❌ 非エンジニアによる編集が困難
- ❌ ビルドが必要

### 適用シーン
- 開発チームが主導でメタデータを管理
- 環境依存の設定が多い
- 型安全性を重視

---

## 提案2: 環境変数 + テンプレート方式

### 概要
JSONテンプレートと環境変数を組み合わせて動的生成

### 実装例

#### テンプレートファイル
```json
// metadata/template/credential_issuer_metadata.json
{
  "credential_issuer": "${CREDENTIAL_ISSUER}",
  "credential_endpoint": "${CREDENTIAL_ISSUER}/credentials",
  "display": [
    {
      "name": "${COMPANY_NAME_JA}",
      "locale": "ja-JP",
      "logo": {
        "uri": "${CREDENTIAL_ISSUER}/images/company-logo.png",
        "alt_text": "${COMPANY_NAME_JA}のロゴ"
      },
      "background_color": "${BRAND_COLOR}",
      "text_color": "#FFFFFF"
    }
  ],
  "credential_configurations_supported": {
    "EmployeeIdentificationCredential": {
      "format": "dc+sd-jwt",
      "scope": "EmployeeIdentificationCredential",
      "vct": "EmployeeIdentificationCredential"
    }
  }
}
```

#### 実装
```typescript
// src/utils/templateEngine.ts
export const renderTemplate = (template: string, vars: Record<string, string>): string => {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    return vars[key] || `\${${key}}`;
  });
};

export const loadMetadataFromTemplate = async (
  templatePath: string,
): Promise<IssuerMetadata> => {
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const vars = {
    CREDENTIAL_ISSUER: process.env.CREDENTIAL_ISSUER || '',
    COMPANY_NAME_JA: process.env.COMPANY_NAME_JA || '株式会社Example',
    COMPANY_NAME_EN: process.env.COMPANY_NAME_EN || 'Example Inc.',
    BRAND_COLOR: process.env.BRAND_COLOR || '#003289',
  };

  const rendered = renderTemplate(templateContent, vars);
  const metadata = JSON.parse(rendered);

  return issuerMetadataValidator(metadata);
};

// demos/common/src/routes/vci/routesHandler.ts（修正版）
let cachedMetadata: IssuerMetadata | undefined;

export async function handleIssueMetadata(ctx: Koa.Context, dirname: string) {
  if (!cachedMetadata) {
    const templatePath = path.join(dirname, "metadata/template/credential_issuer_metadata.json");
    cachedMetadata = await loadMetadataFromTemplate(templatePath);
  }

  ctx.body = cachedMetadata;
  ctx.status = 200;
}
```

### メリット
- ✅ JSONファイルの可読性を維持
- ✅ 環境変数で柔軟に設定変更
- ✅ 12-Factor Appの原則に準拠
- ✅ Docker/Kubernetesとの親和性が高い

### デメリット
- ❌ テンプレート構文の学習コスト
- ❌ 複雑な条件分岐は困難
- ❌ 型チェックが効かない

### 適用シーン
- 複数環境（dev/staging/prod）でのデプロイ
- コンテナ環境での運用
- 設定の外部化が必要

---

## 提案3: データベース駆動方式

### 概要
メタデータをデータベースに保存し、管理UIから動的に編集

### 実装例

#### テーブル設計
```sql
-- issuer_metadata テーブル
CREATE TABLE issuer_metadata (
  id INTEGER PRIMARY KEY,
  credential_issuer TEXT NOT NULL,
  credential_endpoint TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- credential_configurations テーブル
CREATE TABLE credential_configurations (
  id INTEGER PRIMARY KEY,
  config_id TEXT NOT NULL UNIQUE,  -- "EmployeeIdentificationCredential"
  format TEXT NOT NULL,             -- "dc+sd-jwt"
  vct TEXT NOT NULL,
  scope TEXT,
  metadata JSONB NOT NULL,          -- 詳細設定をJSON形式で保存
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- display_info テーブル
CREATE TABLE display_info (
  id INTEGER PRIMARY KEY,
  target_type TEXT NOT NULL,        -- "issuer" or "credential"
  target_id TEXT,                   -- credential_configurations.config_id
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_uri TEXT,
  background_color TEXT,
  display_data JSONB,               -- その他の表示情報
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 実装
```typescript
// src/metadata/metadataRepository.ts
export class MetadataRepository {
  async getIssuerMetadata(): Promise<IssuerMetadata> {
    const db = await openDb();

    // 基本情報取得
    const issuerInfo = await db.get('SELECT * FROM issuer_metadata LIMIT 1');

    // クレデンシャル設定取得
    const configs = await db.all('SELECT * FROM credential_configurations');

    // 表示情報取得
    const displays = await db.all(
      'SELECT * FROM display_info WHERE target_type = ?',
      'issuer'
    );

    // メタデータ構築
    const metadata: IssuerMetadata = {
      credential_issuer: issuerInfo.credential_issuer,
      credential_endpoint: issuerInfo.credential_endpoint,
      display: displays.map(d => ({
        name: d.name,
        locale: d.locale,
        logo: d.logo_uri ? { uri: d.logo_uri } : undefined,
        background_color: d.background_color,
        ...JSON.parse(d.display_data || '{}'),
      })),
      credential_configurations_supported: {},
    };

    // クレデンシャル設定を追加
    for (const config of configs) {
      metadata.credential_configurations_supported[config.config_id] = {
        format: config.format,
        vct: config.vct,
        scope: config.scope,
        ...JSON.parse(config.metadata),
      };
    }

    return metadata;
  }

  async updateCredentialConfig(
    configId: string,
    updates: Partial<CredentialConfiguration>
  ): Promise<void> {
    const db = await openDb();
    await db.run(
      'UPDATE credential_configurations SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE config_id = ?',
      [JSON.stringify(updates), configId]
    );
  }
}

// demos/common/src/routes/vci/routesHandler.ts（修正版）
import { MetadataRepository } from 'ownd-vci/dist/metadata/metadataRepository.js';

const metadataRepo = new MetadataRepository();

export async function handleIssueMetadata(ctx: Koa.Context) {
  try {
    const metadata = await metadataRepo.getIssuerMetadata();
    ctx.body = metadata;
    ctx.status = 200;
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}
```

#### 管理UI例
```typescript
// 管理画面のエンドポイント
router.post('/admin/metadata/credentials/:configId', async (ctx) => {
  const { configId } = ctx.params;
  const updates = ctx.request.body;

  await metadataRepo.updateCredentialConfig(configId, updates);

  ctx.body = { message: 'Updated successfully' };
  ctx.status = 200;
});
```

### メリット
- ✅ **リアルタイム更新**: 再デプロイ不要で設定変更
- ✅ **管理UIから編集**: 非エンジニアでも編集可能
- ✅ **変更履歴**: データベースで履歴管理可能
- ✅ **マルチテナント対応**: issuer_idで複数発行者を管理可能
- ✅ **バージョニング**: 設定の履歴を保持可能

### デメリット
- ❌ 実装コストが高い
- ❌ データベースの運用が必要
- ❌ パフォーマンス考慮が必要（キャッシュ必須）
- ❌ 初期データのマイグレーション管理

### 適用シーン
- SaaS型サービス（マルチテナント）
- 頻繁な設定変更が必要
- 非エンジニアによる運用

---

## 提案4: ハイブリッド方式（推奨度：中）

### 概要
基本設定はコードで定義し、環境依存値のみ外部化

### 実装例

```typescript
// src/metadata/baseMetadata.ts
import { IssuerMetadata } from '../oid4vci/types/protocol.types.js';

interface MetadataConfig {
  credentialIssuer: string;
  companyNameJa: string;
  companyNameEn: string;
  brandColor: string;
}

export const buildIssuerMetadata = (config: MetadataConfig): IssuerMetadata => ({
  credential_issuer: config.credentialIssuer,
  credential_endpoint: `${config.credentialIssuer}/credentials`,
  display: [
    {
      name: config.companyNameJa,
      locale: "ja-JP",
      logo: {
        uri: `${config.credentialIssuer}/images/company-logo.png`,
        alt_text: `${config.companyNameJa}のロゴ`,
      },
      background_color: config.brandColor,
      text_color: "#FFFFFF",
    },
    {
      name: config.companyNameEn,
      locale: "en-US",
      logo: {
        uri: `${config.credentialIssuer}/images/company-logo.png`,
        alt_text: `a square logo of a ${config.companyNameEn}`,
      },
      background_color: config.brandColor,
      text_color: "#FFFFFF",
    },
  ],
  credential_configurations_supported: {
    EmployeeIdentificationCredential: {
      format: "dc+sd-jwt",
      scope: "EmployeeIdentificationCredential",
      cryptographic_binding_methods_supported: ["jwk"],
      credential_signing_alg_values_supported: ["ES256"],
      proof_types_supported: {
        jwt: { proof_signing_alg_values_supported: ["ES256"] },
      },
      vct: "EmployeeIdentificationCredential",
      claims: {
        companyName: {
          display: [
            { name: "会社名", locale: "ja-JP" },
            { name: "Company Name", locale: "en-US" },
          ],
        },
        // ... 他のクレーム定義
      },
    },
  },
});

// demos/employee-vci/src/config/metadata.ts
import { buildIssuerMetadata } from 'ownd-vci/dist/metadata/baseMetadata.js';

export const getMetadataConfig = () => ({
  credentialIssuer: process.env.CREDENTIAL_ISSUER || '',
  companyNameJa: process.env.COMPANY_NAME_JA || '株式会社Example',
  companyNameEn: process.env.COMPANY_NAME_EN || 'Example Inc.',
  brandColor: process.env.BRAND_COLOR || '#003289',
});

export const generateMetadata = () => {
  return buildIssuerMetadata(getMetadataConfig());
};

// demos/common/src/routes/vci/routesHandler.ts（修正版）
import { generateMetadata } from '../../../../employee-vci/src/config/metadata.js';

let cachedMetadata: IssuerMetadata | undefined;

export async function handleIssueMetadata(ctx: Koa.Context) {
  if (!cachedMetadata) {
    cachedMetadata = generateMetadata();
  }

  ctx.body = cachedMetadata;
  ctx.status = 200;
}
```

### メリット
- ✅ コードの型安全性と環境設定の柔軟性を両立
- ✅ 実装コストが比較的低い
- ✅ JSONファイル不要

### デメリット
- ❌ 設定項目が増えると環境変数管理が煩雑

---

## 提案5: ビルド時生成方式

### 概要
ビルド時にメタデータを静的ファイルとして生成

### 実装例

```typescript
// scripts/generateMetadata.ts
import fs from 'fs/promises';
import path from 'path';
import { buildIssuerMetadata } from '../src/metadata/baseMetadata.js';

const environments = ['dev', 'prod'];

for (const env of environments) {
  const config = {
    credentialIssuer: env === 'prod'
      ? 'https://credential-issuer.example.com'
      : 'http://localhost:3000',
    companyNameJa: '株式会社Example',
    companyNameEn: 'Example Inc.',
    brandColor: '#003289',
  };

  const metadata = buildIssuerMetadata(config);

  const outputPath = path.join(
    __dirname,
    `../demos/employee-vci/metadata/${env}/credential_issuer_metadata.json`
  );

  await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
  console.log(`Generated: ${outputPath}`);
}
```

```json
// package.json
{
  "scripts": {
    "generate:metadata": "tsx scripts/generateMetadata.ts",
    "prebuild": "npm run generate:metadata"
  }
}
```

### メリット
- ✅ 静的ファイルとして配信可能（CDN対応）
- ✅ 型安全な定義から生成
- ✅ ランタイムオーバーヘッドなし

### デメリット
- ❌ 変更にビルドが必要
- ❌ 動的な値が含められない

---

## 比較表

| 方式 | 実装難易度 | 型安全性 | 動的更新 | 運用コスト | 推奨度 |
|------|------------|----------|----------|------------|--------|
| 現在（JSONファイル） | ⭐ | ❌ | ❌ | ⭐ | - |
| **TypeScript定義** | ⭐⭐ | ✅ | ✅ | ⭐ | ⭐⭐⭐⭐⭐ |
| 環境変数+テンプレート | ⭐⭐ | ❌ | ⭐ | ⭐⭐ | ⭐⭐⭐ |
| データベース駆動 | ⭐⭐⭐⭐⭐ | ⭐ | ✅✅ | ⭐⭐⭐⭐ | ⭐⭐ |
| ハイブリッド | ⭐⭐⭐ | ✅ | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| ビルド時生成 | ⭐⭐ | ✅ | ❌ | ⭐ | ⭐⭐⭐ |

## 推奨方式

### 現在のプロジェクトには: **提案1（TypeScript定義オブジェクト方式）**

**理由**:
1. employee-vciは単一テナントで設定変更頻度が低い
2. 型安全性でミスを防げる
3. 環境変数でURL等を動的生成可能
4. 実装コストが低い
5. dev/prodファイルの重複が解消される

### 将来的に検討すべき: **提案4（ハイブリッド方式）**

複数環境へのデプロイや設定の柔軟性が必要になった場合に移行を検討

### SaaS化する場合: **提案3（データベース駆動方式）**

マルチテナント対応が必要になった際に採用

---

## 移行計画例（提案1への移行）

### Phase 1: 準備
```bash
# メタデータ定義ファイル作成
mkdir -p src/metadata
touch src/metadata/issuerMetadata.ts
touch src/metadata/credentialConfigs.ts
```

### Phase 2: 実装
1. 既存JSONをTypeScriptオブジェクトに変換
2. 環境変数から値を注入する関数を作成
3. routesHandler.tsを更新

### Phase 3: テスト
1. ユニットテストで型チェック確認
2. 統合テストで実際のレスポンス確認
3. 既存のJSONと生成結果を比較

### Phase 4: 切り替え
1. 古いJSONファイルをバックアップ
2. 新実装に切り替え
3. 問題なければJSONファイル削除

**想定工数**: 1-2日
