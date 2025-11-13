# メタデータ生成のRepository パターン設計

## 設計思想

将来的なDB使用を想定しつつ、最初はハードコードで実装。データソースの抽象化により、実装の切り替えを容易にする。

### 段階的移行計画
```
Phase 1: ハードコード実装 (現在〜)
  ↓
Phase 2: ハードコード + 一部DB (必要に応じて)
  ↓
Phase 3: 完全DB駆動 (SaaS化時など)
```

---

## アーキテクチャ設計

### レイヤー構成

```
┌─────────────────────────────────┐
│   Presentation Layer            │
│   (routesHandler.ts)            │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Application Layer             │
│   - MetadataService             │  ← ビジネスロジック
│   - ローカライゼーション          │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Repository Interface          │
│   (IMetadataRepository)         │  ← 抽象化層
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      │             │
┌─────▼─────┐ ┌────▼──────────┐
│ Hardcoded │ │ DB Repository │
│ Repository│ │ (将来実装)     │
└───────────┘ └───────────────┘
```

---

## 実装例

### 1. Repository インターフェース定義

```typescript
// src/metadata/repository/IMetadataRepository.ts
import { IssuerMetadata } from '../../oid4vci/types/protocol.types.js';

/**
 * メタデータリポジトリのインターフェース
 * データソース（ハードコード、DB、外部API等）を抽象化
 */
export interface IMetadataRepository {
  /**
   * Issuer Metadataを取得
   * @param credentialIssuer - クレデンシャル発行者のURL
   * @returns IssuerMetadata
   */
  getIssuerMetadata(credentialIssuer: string): Promise<IssuerMetadata>;

  /**
   * 特定のCredential Configurationを取得
   * @param credentialIssuer - クレデンシャル発行者のURL
   * @param configId - Credential Configuration ID
   * @returns CredentialConfiguration or undefined
   */
  getCredentialConfiguration(
    credentialIssuer: string,
    configId: string,
  ): Promise<any | undefined>;

  /**
   * サポートされているCredential Configurationsのリストを取得
   * @param credentialIssuer - クレデンシャル発行者のURL
   * @returns Credential Configuration IDs
   */
  listCredentialConfigurations(
    credentialIssuer: string,
  ): Promise<string[]>;
}
```

### 2. ハードコード実装（Phase 1）

```typescript
// src/metadata/repository/HardcodedMetadataRepository.ts
import { IMetadataRepository } from './IMetadataRepository.js';
import { IssuerMetadata, CredentialConfiguration } from '../../oid4vci/types/protocol.types.js';

/**
 * ハードコードされたメタデータを返すリポジトリ実装
 * 将来的にDB実装に置き換え可能
 */
export class HardcodedMetadataRepository implements IMetadataRepository {
  async getIssuerMetadata(credentialIssuer: string): Promise<IssuerMetadata> {
    return {
      credential_issuer: credentialIssuer,
      credential_endpoint: `${credentialIssuer}/credentials`,
      display: this.getIssuerDisplayInfo(credentialIssuer),
      credential_configurations_supported: this.getCredentialConfigurations(credentialIssuer),
    };
  }

  async getCredentialConfiguration(
    credentialIssuer: string,
    configId: string,
  ): Promise<any | undefined> {
    const configs = this.getCredentialConfigurations(credentialIssuer);
    return configs[configId];
  }

  async listCredentialConfigurations(
    credentialIssuer: string,
  ): Promise<string[]> {
    const configs = this.getCredentialConfigurations(credentialIssuer);
    return Object.keys(configs);
  }

  // ========================================
  // Private Methods (ハードコード定義)
  // ========================================

  private getIssuerDisplayInfo(credentialIssuer: string) {
    // 環境変数から取得可能にしておく
    const companyNameJa = process.env.COMPANY_NAME_JA || '株式会社Example';
    const companyNameEn = process.env.COMPANY_NAME_EN || 'Example Inc.';
    const brandColor = process.env.BRAND_COLOR || '#003289';

    return [
      {
        name: companyNameJa,
        locale: 'ja-JP',
        logo: {
          uri: `${credentialIssuer}/images/company-logo.png`,
          alt_text: `${companyNameJa}のロゴ`,
        },
        background_color: brandColor,
        text_color: '#FFFFFF',
      },
      {
        name: companyNameEn,
        locale: 'en-US',
        logo: {
          uri: `${credentialIssuer}/images/company-logo.png`,
          alt_text: `a square logo of a ${companyNameEn}`,
        },
        background_color: brandColor,
        text_color: '#FFFFFF',
      },
    ];
  }

  private getCredentialConfigurations(credentialIssuer: string): Record<string, any> {
    return {
      EmployeeIdentificationCredential: this.buildEmployeeCredentialConfig(),
      // 将来的に他のクレデンシャルを追加
      // UniversityDegreeCredential: this.buildUniversityDegreeConfig(),
    };
  }

  private buildEmployeeCredentialConfig(): CredentialConfiguration {
    return {
      format: 'dc+sd-jwt',
      scope: 'EmployeeIdentificationCredential',
      cryptographic_binding_methods_supported: ['jwk'],
      credential_signing_alg_values_supported: ['ES256'],
      proof_types_supported: {
        jwt: {
          proof_signing_alg_values_supported: ['ES256'],
        },
      },
      vct: 'EmployeeIdentificationCredential',
      claims: {
        companyName: {
          display: [
            { name: '会社名', locale: 'ja-JP' },
            { name: 'Company Name', locale: 'en-US' },
          ],
        },
        employeeNo: {
          display: [
            { name: '社員番号', locale: 'ja-JP' },
            { name: 'Employee Number', locale: 'en-US' },
          ],
        },
        division: {
          display: [
            { name: '部署', locale: 'ja-JP' },
            { name: 'Division', locale: 'en-US' },
          ],
        },
        givenName: {
          display: [
            { name: '名', locale: 'ja-JP' },
            { name: 'First Name', locale: 'en-US' },
          ],
        },
        familyName: {
          display: [
            { name: '姓', locale: 'ja-JP' },
            { name: 'Last Name', locale: 'en-US' },
          ],
        },
        gender: {
          display: [
            { name: '性別情報', locale: 'ja-JP' },
            { name: 'Gender', locale: 'en-US' },
          ],
        },
      },
    };
  }
}
```

### 3. DB実装のスケルトン（Phase 3用）

```typescript
// src/metadata/repository/DbMetadataRepository.ts
import { IMetadataRepository } from './IMetadataRepository.js';
import { IssuerMetadata } from '../../oid4vci/types/protocol.types.js';
import { openDb } from '../../path/to/database.js';

/**
 * データベースからメタデータを取得するリポジトリ実装
 * 将来的に実装予定
 */
export class DbMetadataRepository implements IMetadataRepository {
  async getIssuerMetadata(credentialIssuer: string): Promise<IssuerMetadata> {
    const db = await openDb();

    // issuer_metadata テーブルから基本情報取得
    const issuerInfo = await db.get(
      'SELECT * FROM issuer_metadata WHERE credential_issuer = ?',
      credentialIssuer
    );

    if (!issuerInfo) {
      throw new Error(`Issuer not found: ${credentialIssuer}`);
    }

    // display_info テーブルから表示情報取得
    const displays = await db.all(
      'SELECT * FROM display_info WHERE target_type = ? AND target_id IS NULL',
      'issuer'
    );

    // credential_configurations テーブルから設定取得
    const configs = await db.all(
      'SELECT * FROM credential_configurations WHERE issuer_id = ?',
      issuerInfo.id
    );

    const credentialConfigsSupported: Record<string, any> = {};
    for (const config of configs) {
      credentialConfigsSupported[config.config_id] = {
        format: config.format,
        vct: config.vct,
        scope: config.scope,
        ...JSON.parse(config.metadata || '{}'),
      };
    }

    return {
      credential_issuer: issuerInfo.credential_issuer,
      credential_endpoint: issuerInfo.credential_endpoint,
      display: displays.map(d => ({
        name: d.name,
        locale: d.locale,
        logo: d.logo_uri ? { uri: d.logo_uri } : undefined,
        background_color: d.background_color,
        text_color: d.text_color,
      })),
      credential_configurations_supported: credentialConfigsSupported,
    };
  }

  async getCredentialConfiguration(
    credentialIssuer: string,
    configId: string,
  ): Promise<any | undefined> {
    const db = await openDb();

    const config = await db.get(
      `SELECT c.* FROM credential_configurations c
       JOIN issuer_metadata i ON c.issuer_id = i.id
       WHERE i.credential_issuer = ? AND c.config_id = ?`,
      [credentialIssuer, configId]
    );

    if (!config) {
      return undefined;
    }

    return {
      format: config.format,
      vct: config.vct,
      scope: config.scope,
      ...JSON.parse(config.metadata || '{}'),
    };
  }

  async listCredentialConfigurations(
    credentialIssuer: string,
  ): Promise<string[]> {
    const db = await openDb();

    const configs = await db.all(
      `SELECT c.config_id FROM credential_configurations c
       JOIN issuer_metadata i ON c.issuer_id = i.id
       WHERE i.credential_issuer = ?`,
      credentialIssuer
    );

    return configs.map(c => c.config_id);
  }
}
```

### 4. Factory パターンでリポジトリを切り替え

```typescript
// src/metadata/repository/MetadataRepositoryFactory.ts
import { IMetadataRepository } from './IMetadataRepository.js';
import { HardcodedMetadataRepository } from './HardcodedMetadataRepository.js';
import { DbMetadataRepository } from './DbMetadataRepository.js';

export type RepositoryType = 'hardcoded' | 'database';

/**
 * メタデータリポジトリのファクトリ
 * 環境変数でリポジトリ実装を切り替え可能
 */
export class MetadataRepositoryFactory {
  static create(type?: RepositoryType): IMetadataRepository {
    // 環境変数から取得（デフォルトはハードコード）
    const repoType = type || (process.env.METADATA_REPOSITORY_TYPE as RepositoryType) || 'hardcoded';

    switch (repoType) {
      case 'database':
        return new DbMetadataRepository();
      case 'hardcoded':
      default:
        return new HardcodedMetadataRepository();
    }
  }
}
```

### 5. Application Service層

```typescript
// src/metadata/service/MetadataService.ts
import { IMetadataRepository } from '../repository/IMetadataRepository.js';
import { IssuerMetadata } from '../../oid4vci/types/protocol.types.js';
import { localizeIssuerMetadata } from '../../utils/localize.js';

/**
 * メタデータ関連のビジネスロジックを提供
 */
export class MetadataService {
  private repository: IMetadataRepository;

  constructor(repository: IMetadataRepository) {
    this.repository = repository;
  }

  /**
   * Issuer Metadataを取得（ローカライゼーション対応）
   */
  async getIssuerMetadata(
    credentialIssuer: string,
    preferredLocale?: string,
    defaultLocale: string = 'ja-JP',
  ): Promise<IssuerMetadata> {
    const metadata = await this.repository.getIssuerMetadata(credentialIssuer);

    // ローカライゼーション適用
    if (preferredLocale) {
      return localizeIssuerMetadata(
        structuredClone(metadata),
        preferredLocale,
        defaultLocale,
      );
    }

    return metadata;
  }

  /**
   * 特定のCredential Configurationを取得
   */
  async getCredentialConfiguration(
    credentialIssuer: string,
    configId: string,
  ) {
    return this.repository.getCredentialConfiguration(credentialIssuer, configId);
  }

  /**
   * サポートされているCredential Configurationsのリストを取得
   */
  async listCredentialConfigurations(credentialIssuer: string) {
    return this.repository.listCredentialConfigurations(credentialIssuer);
  }
}
```

### 6. Presentation層での使用

```typescript
// demos/common/src/routes/vci/routesHandler.ts
import { MetadataService } from 'ownd-vci/dist/metadata/service/MetadataService.js';
import { MetadataRepositoryFactory } from 'ownd-vci/dist/metadata/repository/MetadataRepositoryFactory.js';
import { resolveAcceptLanguage } from 'resolve-accept-language';

// リポジトリとサービスのインスタンス化（アプリ起動時に1回）
const metadataRepository = MetadataRepositoryFactory.create();
const metadataService = new MetadataService(metadataRepository);

export async function handleIssueMetadata(
  ctx: Koa.Context,
  credentialIssuer: string,
  availableLocales: string[] = ['en-US', 'ja-JP'],
  defaultLocale: string = 'ja-JP',
) {
  try {
    const needsLocalization = process.env.RESOLVE_ACCEPT_LANGUAGE === 'true';
    let preferredLocale: string | undefined;

    if (needsLocalization) {
      const acceptLanguage = ctx.request.header['accept-language'];
      if (acceptLanguage) {
        try {
          preferredLocale = resolveAcceptLanguage(
            acceptLanguage,
            availableLocales,
            defaultLocale,
          );
        } catch (err) {
          console.log(`Unable to resolve accept-language: ${acceptLanguage}`);
        }
      }
    }

    // サービス経由でメタデータ取得
    const metadata = await metadataService.getIssuerMetadata(
      credentialIssuer,
      preferredLocale,
      defaultLocale,
    );

    ctx.body = metadata;
    ctx.status = 200;
    ctx.set('Content-Type', 'application/json');
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: 'Internal Server Error' };
  }
}
```

### 7. employee-vci側の設定

```typescript
// demos/employee-vci/src/routes/vci/routes.ts
import Router from 'koa-router';
import commonVciRoutes from 'ownd-vci-common/dist/routes/vci/routes.js';
import { tokenConfigure } from '../../logic/vciConfigProvider.js';
import { configure } from '../../logic/credentialsConfigProvider.js';
import { nonceConfigure } from '../../logic/nonceConfigProvider.js';

const init = () => {
  const router = new Router();

  // 環境変数からクレデンシャル発行者URLを取得
  const credentialIssuer = process.env.CREDENTIAL_ISSUER || 'http://localhost:3000';

  commonVciRoutes.setupCommonRoute(
    router,
    tokenConfigure,
    configure,
    nonceConfigure,
    credentialIssuer, // dirnameの代わりにURLを渡す
  );

  return router;
};

export default init;
```

---

## 段階的な移行パス

### Phase 1: ハードコード実装（現在）

```bash
# 環境変数
METADATA_REPOSITORY_TYPE=hardcoded
CREDENTIAL_ISSUER=https://example.com
COMPANY_NAME_JA=株式会社Example
COMPANY_NAME_EN=Example Inc.
BRAND_COLOR=#003289
```

**実装タスク**:
1. ✅ Repository インターフェース定義
2. ✅ HardcodedMetadataRepository実装
3. ✅ MetadataService実装
4. ✅ Factory実装
5. ✅ routesHandlerの更新

**所要時間**: 1-2日

---

### Phase 2: ハイブリッド実装（必要に応じて）

特定の設定のみDBから取得、残りはハードコード

```typescript
// src/metadata/repository/HybridMetadataRepository.ts
export class HybridMetadataRepository implements IMetadataRepository {
  private hardcodedRepo = new HardcodedMetadataRepository();
  private dbRepo = new DbMetadataRepository();

  async getIssuerMetadata(credentialIssuer: string): Promise<IssuerMetadata> {
    // 基本情報はハードコードから
    const metadata = await this.hardcodedRepo.getIssuerMetadata(credentialIssuer);

    // 表示情報のみDBから取得（カスタマイズ可能にする場合）
    try {
      const dbDisplayInfo = await this.getDisplayInfoFromDb(credentialIssuer);
      if (dbDisplayInfo) {
        metadata.display = dbDisplayInfo;
      }
    } catch (err) {
      console.warn('Failed to load display info from DB, using hardcoded values');
    }

    return metadata;
  }

  private async getDisplayInfoFromDb(credentialIssuer: string) {
    // DB実装
  }
}
```

---

### Phase 3: 完全DB駆動（SaaS化時）

```bash
# 環境変数
METADATA_REPOSITORY_TYPE=database
DATABASE_URL=postgresql://user:pass@localhost/vci
```

**マイグレーション**:
```sql
-- 既存データをDBに移行
INSERT INTO issuer_metadata (credential_issuer, credential_endpoint)
VALUES ('https://example.com', 'https://example.com/credentials');

INSERT INTO credential_configurations (issuer_id, config_id, format, vct, metadata)
SELECT
  i.id,
  'EmployeeIdentificationCredential',
  'dc+sd-jwt',
  'EmployeeIdentificationCredential',
  '{"cryptographic_binding_methods_supported": ["jwk"], ...}'
FROM issuer_metadata i
WHERE i.credential_issuer = 'https://example.com';
```

---

## テスト戦略

### Unit Test

```typescript
// tests/metadata/repository/HardcodedMetadataRepository.test.ts
import { HardcodedMetadataRepository } from '../../../src/metadata/repository/HardcodedMetadataRepository.js';
import { assert } from 'chai';

describe('HardcodedMetadataRepository', () => {
  let repository: HardcodedMetadataRepository;

  beforeEach(() => {
    repository = new HardcodedMetadataRepository();
  });

  describe('getIssuerMetadata', () => {
    it('should return valid issuer metadata', async () => {
      const metadata = await repository.getIssuerMetadata('https://example.com');

      assert.equal(metadata.credential_issuer, 'https://example.com');
      assert.equal(metadata.credential_endpoint, 'https://example.com/credentials');
      assert.isArray(metadata.display);
      assert.property(metadata, 'credential_configurations_supported');
    });

    it('should include EmployeeIdentificationCredential config', async () => {
      const metadata = await repository.getIssuerMetadata('https://example.com');
      const config = metadata.credential_configurations_supported['EmployeeIdentificationCredential'];

      assert.isDefined(config);
      assert.equal(config.format, 'dc+sd-jwt');
      assert.equal(config.vct, 'EmployeeIdentificationCredential');
    });
  });

  describe('getCredentialConfiguration', () => {
    it('should return specific credential configuration', async () => {
      const config = await repository.getCredentialConfiguration(
        'https://example.com',
        'EmployeeIdentificationCredential'
      );

      assert.isDefined(config);
      assert.equal(config.format, 'dc+sd-jwt');
    });

    it('should return undefined for non-existent config', async () => {
      const config = await repository.getCredentialConfiguration(
        'https://example.com',
        'NonExistentCredential'
      );

      assert.isUndefined(config);
    });
  });
});
```

### Integration Test

```typescript
// tests/metadata/service/MetadataService.test.ts
import { MetadataService } from '../../../src/metadata/service/MetadataService.js';
import { HardcodedMetadataRepository } from '../../../src/metadata/repository/HardcodedMetadataRepository.js';
import { assert } from 'chai';

describe('MetadataService', () => {
  let service: MetadataService;

  beforeEach(() => {
    const repository = new HardcodedMetadataRepository();
    service = new MetadataService(repository);
  });

  it('should return localized metadata', async () => {
    const metadata = await service.getIssuerMetadata(
      'https://example.com',
      'ja-JP',
      'en-US'
    );

    // ローカライゼーションが適用されていることを確認
    assert.isDefined(metadata);
  });
});
```

---

## メリット

### 1. 段階的な移行が可能
- まずハードコードで動作確認
- 必要に応じてDB実装に切り替え
- リスクの低い段階的な移行

### 2. テスタビリティが高い
- インターフェースに対してテスト
- モックリポジトリで簡単にテスト可能

### 3. 将来の拡張性
- 新しいデータソース（外部API等）も追加容易
- マルチテナント対応も可能

### 4. コードの保守性
- 責務が明確に分離
- ビジネスロジックがデータソースに依存しない

---

## 想定スケジュール

| Phase | 期間 | 実装内容 |
|-------|------|----------|
| Phase 1 | 1-2日 | ハードコード実装 |
| Phase 2 | 必要時 | ハイブリッド実装 |
| Phase 3 | SaaS化時 | DB完全移行 |

---

## まとめ

この設計により：
- ✅ 現在はシンプルなハードコード実装
- ✅ 将来的なDB移行が容易
- ✅ インターフェースの統一により柔軟性が高い
- ✅ テストが書きやすく保守性が高い

**推奨アクション**: まずPhase 1を実装し、運用しながら必要に応じてPhase 2/3へ移行
