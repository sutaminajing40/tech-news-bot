# Tech News Bot 🤖

毎日朝9時に技術記事の要約をSlackに自動投稿するBot

## 概要

- はてなブックマークのテクノロジーカテゴリから人気記事TOP5を取得
- Gemini APIで各記事の要約を生成
- Slackに自動投稿
- GitHub Actionsで毎日定時実行

## セットアップ

### 1. GitHub Secretsの設定

リポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `GEMINI_API_KEY`: Google AI StudioのAPIキー
- `SLACK_WEBHOOK_URL`: SlackのIncoming Webhook URL

### 2. ファイル構成

```
.
├── .github/workflows/
│   └── daily-tech-news.yml  # GitHub Actionsワークフロー
├── scripts/
│   └── tech_news_bot.py     # メインスクリプト
├── requirements.txt         # Python依存関係
└── README.md               # このファイル
```

### 3. 実行スケジュール

- 毎日朝9時JST（UTC 0:00）に自動実行
- GitHub Actionsの `workflow_dispatch` で手動実行も可能

## 使用技術

- **GitHub Actions**: スケジュール実行
- **Python 3.11**: メインロジック
- **Gemini API**: 記事要約生成
- **Slack Webhook**: 通知配信
- **はてなブックマーク RSS**: 記事取得

## コスト

- Gemini API: 無料（月1500リクエスト枠内）
- GitHub Actions: 無料（月2000分枠内）
- **運用コスト: 0円**

## 手動テスト実行

```bash
# 依存関係インストール
pip install -r requirements.txt

# 環境変数設定
export GEMINI_API_KEY="your_api_key"
export SLACK_WEBHOOK_URL="your_webhook_url"

# スクリプト実行
python scripts/tech_news_bot.py
```

## 投稿例

```
🔥 2024年XX月XX日 技術記事要約 🔥

1. 新しいReact Hooks API が登場
📝 React 19で導入される新しいHooks APIについて、使用例と既存のHooksとの違いを詳しく解説...
🔗 https://example.com/article1

2. TypeScript 5.3の新機能
📝 型安全性の向上と開発者体験の改善に焦点を当てた最新バージョンの特徴を紹介...
🔗 https://example.com/article2

良い一日を！ 💪
```