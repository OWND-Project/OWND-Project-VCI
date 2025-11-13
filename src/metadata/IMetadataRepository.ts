import {
  IssuerMetadata,
  AuthorizationServerMetadata,
} from "../oid4vci/types/protocol.types.js";

/**
 * メタデータリポジトリのインターフェース
 * 各デモアプリケーションで実装する
 */
export interface IMetadataRepository {
  /**
   * Issuer Metadataを取得
   * @returns IssuerMetadata
   */
  getIssuerMetadata(): Promise<IssuerMetadata>;

  /**
   * Authorization Server Metadataを取得
   * @returns AuthorizationServerMetadata
   */
  getAuthorizationServerMetadata(): Promise<AuthorizationServerMetadata>;
}
