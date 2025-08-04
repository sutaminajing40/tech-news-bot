# Tech News Bot 🤖

毎日午後3時JST（旧朝9時から変更）に技術記事の要約をSlackに自動投稿するBot  
**NEW**: Slackインタラクティブ機能を追加（Vercel Functions + SQLite）

## 概要

- はてなブックマークのテクノロジーカテゴリから人気記事TOP5を取得  
- Gemini 2.5 Flash APIで各記事の要約を生成  
- Slackに自動投稿  
- GitHub Actionsで毎日定時実行  
- **👍リアクションで詳細要約**  
- **❓リアクションで質問・回答機能**

## セットアップ

### 1. 基本機能（GitHub Actions + Python）

リポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `GEMINI_API_KEY`: Google AI StudioのAPIキー
- `SLACK_WEBHOOK_URL`: SlackのIncoming Webhook URL

### 2. インタラクティブ機能（Vercel Functions + Node.js）

#### 環境変数設定
```bash
# .envファイルを作成（.env.exampleを参考）
cp .env.example .env

# 環境変数を設定
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
GEMINI_API_KEY=your-gemini-api-key-here
```

#### ローカル開発
```bash
# 依存関係インストール
npm install

# ローカル開発サーバー起動
npm run dev
```

#### Vercelデプロイ
```bash
# Vercel CLIインストール（未インストールの場合）
npm i -g vercel

# デプロイ
vercel --prod

# 環境変数設定（Vercel Dashboard）
# SLACK_BOT_TOKEN, GEMINI_API_KEY
```

### 3. プロジェクト構成

```
.
├── .github/workflows/
│   └── daily-tech-news.yml  # GitHub Actions（基本機能）
├── api/
│   └── slack-events.js      # Slack Events処理（Vercel Functions）
├── lib/
│   ├── slack-service.js     # Slack API操作
│   ├── gemini-service.js    # Gemini API操作
│   ├── data-service.js      # SQLite操作
│   └── db.js               # DB初期化
├── scripts/
│   └── tech_news_bot.py     # メインスクリプト（基本機能）
├── data/
│   └── bot.db              # SQLiteデータベース
├── gas/                    # 旧GASコード（参考用）
├── package.json            # Node.js依存関係
├── vercel.json            # Vercel設定
└── requirements.txt       # Python依存関係
```

### 4. 実行スケジュール

- 毎日午後3時JST（UTC 6:00）に自動実行
- GitHub Actionsの `workflow_dispatch` で手動実行も可能

## 使用技術

### 基本機能
- **GitHub Actions**: スケジュール実行
- **Python 3.11**: メインロジック
- **Gemini 2.5 Flash API**: 記事要約生成
- **Slack Webhook**: 通知配信
- **はてなブックマーク RSS**: 記事取得

### インタラクティブ機能
- **Vercel Functions**: サーバーレス実行
- **Node.js**: リアルタイム処理
- **SQLite**: データ管理
- **Slack Web API**: メッセージ・リアクション処理
- **Gemini 2.5 Flash API**: 詳細要約・質問回答

## コスト

### 基本機能
- Gemini API: 無料（月1500リクエスト枠内）
- GitHub Actions: 無料（月2000分枠内）

### インタラクティブ機能
- Vercel Functions: 無料（Hobby Plan）
- SQLite: 無料（ローカルファイル）
- Slack API: 無料

**総運用コスト: 0円**

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

## インタラクティブ機能の使い方

### 👍 詳細要約機能
1. Bot投稿に👍リアクションを追加
2. スレッドに詳細要約が自動投稿される
3. より深い技術的解説を取得

### ❓ 質問・回答機能
1. Bot投稿に❓リアクションを追加
2. 質問受付モードが開始される
3. スレッドで記事について質問を投稿
4. AIが記事内容を基に回答を生成

### データ管理
- 記事データと履歴はSQLiteで管理
- 重複イベントは30分間自動防止
- 質問モードの状態も永続化