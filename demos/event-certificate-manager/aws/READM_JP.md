# VCI CloudFormation Template

このリポジトリには、VCI (Virtual Corporate Infrastructure) をデプロイするためのAWS CloudFormationテンプレートが含まれています。

## テンプレートの概要

このテンプレートは以下のリソースをデプロイします：

- VPC、サブネット、およびネットワークリソース
- インターネットゲートウェイとそのアタッチメント
- セキュリティグループ
- EC2インスタンス
- アプリケーションロードバランサー (ALB) とそのリスナーおよびターゲットグループ
- Route53エイリアスレコード
- CodeStar Connections、S3バケット、CodePipeline、CodeDeployリソース

## パラメータ

| パラメータ名         | 説明               | 必須  | デフォルト値 |
|----------------|------------------|-----|--------|
| `Domain`       | VCIのドメイン         | はい  | なし     |
| `VCISubdomain` | VCIのサブドメイン       | はい  | なし     |
| `HostedZoneID` | Route53のホストゾーンID | はい  | なし     |
| `ACMARN`       | VCIのACM (オプション)  | いいえ | 空文字列   |

**注**: `ACMARN` 以外のパラメータは必須です。

## 使用方法

### 事前準備

1. AWS CLIをインストールし、設定します。
2. CloudFormationテンプレートファイルをダウンロードまたはリポジトリをクローンします。

### コマンドラインからのデプロイ

CloudFormationスタックを作成、更新、削除するための具体的なAWS CLIコマンドを使用してください。以下は例です：

1. スタックの作成
```shell
   aws cloudformation create-stack --stack-name <EventName> \
   --template-body file://path/to/template.yaml \
   --parameters ParameterKey=Domain,ParameterValue=<your-domain> \
   ParameterKey=VCISubdomain,ParameterValue=<your-subdomain> \
   ParameterKey=HostedZoneID,ParameterValue=<your-hostedzone-id> \
   ParameterKey=ACMARN,ParameterValue=<your-acm-arn-if-any> \
   --capabilities CAPABILITY_NAMED_IAM
```
2. スタックの更新
```shell
aws cloudformation update-stack --stack-name <EventName> \
  --template-body file://path/to/template.yaml \
  --parameters ParameterKey=Domain,ParameterValue=<your-domain> \
               ParameterKey=VCISubdomain,ParameterValue=<your-subdomain> \
               ParameterKey=HostedZoneID,ParameterValue=<your-hostedzone-id> \
               ParameterKey=ACMARN,ParameterValue=<your-acm-arn-if-any> \
  --capabilities CAPABILITY_NAMED_IAM
```
3. スタックの削除
```shell
aws cloudformation delete-stack --stack-name <EventName>
```
### AWSコンソールからのデプロイ

AWSコンソールを使用してCloudFormationテンプレートをデプロイすることもできます。

1. AWS Management Consoleにログインし、CloudFormationサービスに移動します。
2. 「スタックの作成」をクリックし、「新しいリソースを使用 (標準)」を選択します。
3. 「テンプレートの準備完了」オプションを選択し、「テンプレートファイルのアップロード」を選択します。
4. ローカルファイルからダウンロードしたCloudFormationテンプレートファイルを選択します。
5. 「次へ」をクリックし、スタック名（イベント名）を入力します。
6. パラメータセクションで、必要なパラメータを入力します。`ACMARN` はオプションです。
7. 必要に応じて、その他の設定を行い、「次へ」をクリックします。
8. スタックの作成を確認し、「作成」をクリックします。

詳細な手順は[AWS CloudFormationのドキュメント](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html)をご参照ください。

## フロントエンドおよびバックエンドのデプロイ

### フロントエンド（react-admin）の自動デプロイ

フロントエンドを自動でデプロイするには、AWS Amplifyを設定する必要があります。Amplifyの設定手順については、公式ドキュメントを参照してください。

1. AWS Amplifyコンソールに移動します。
2. 新しいアプリを作成し、リポジトリを接続します。
3. 必要なビルド設定と環境変数を設定します。
4. デプロイを開始します。

詳細な手順は[AWS Amplifyのドキュメント](https://docs.aws.amazon.com/amplify/)をご参照ください。

### バックエンド（Node.js）の自動デプロイ

バックエンドを自動でデプロイするには、AWS CodeDeployを手動で設定する必要があります。以下はその手順の概要です。

1. AWS CodeDeployコンソールに移動し、新しいアプリケーションを作成します。
2. デプロイグループを作成し、ターゲットとして作成されたEC2インスタンスを選択します。
3. デプロイ設定（デプロイのタイミング、デプロイ後の検証など）を行います。
4. CodePipelineを使用して、CodeDeployアプリケーションにデプロイするためのパイプラインを作成します。

詳細な手順は[AWS CodeDeployのドキュメント](https://docs.aws.amazon.com/codedeploy/)をご参照ください。

## 注意事項

- スタック名には必ずイベント名を使用してください。
- デプロイ前にすべての必須パラメータが正しく設定されていることを確認してください。