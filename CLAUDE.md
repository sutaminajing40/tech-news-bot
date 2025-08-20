# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Tech News Bot v2.0 - 毎日午後3時JST（旧朝9時から変更）にはてなブックマークのテクノロジーカテゴリからTOP5記事を取得し、Gemini 2.5 Flash APIで要約してSlackに自動投稿するBot。GitHub Actionsで定時実行。v2.0では詳細要約・質問機能を追加し、Slack内でインタラクティブに操作可能。

## 開発・実行コマンド

### 依存関係のインストール
```bash
pip install -r requirements.txt
```

### ローカル実行
```bash
# 環境変数を設定してから実行
export GEMINI_API_KEY="your_api_key"
export SLACK_WEBHOOK_URL="your_webhook_url"
python scripts/tech_news_bot.py
```

### 手動ワークフロー実行
```bash
# GitHub CLI使用
gh workflow run "Daily Tech News Bot"
```

## アーキテクチャ

### コア構成
- **scripts/daily_post.py**: 毎日投稿スクリプト（Interactive Components対応）
  - `get_hatena_tech_articles()`: はてブRSS解析（RDF形式）
  - `summarize_with_gemini()`: Gemini 2.5 Flash API要約生成
  - `post_interactive_message()`: Slack Bot API投稿（ボタン付き）
  - `main()`: 環境変数チェックと処理フロー制御
- **api/slack-interactions.js**: Vercel Function（Slackインタラクション処理）
  - 詳細要約ボタン処理
  - 質問モーダル表示・処理
  - Gemini API連携

### データフロー
1. はてブRSS (it.rss) → 記事TOP5取得
2. Gemini API → 各記事の日本語要約生成（2-3文）
3. Slack Webhook → フォーマット済みメッセージ投稿

### 依存関係
**Python** (requirements.txt):
- `google-generativeai==0.3.2` (Gemini API)
- `requests==2.31.0` (HTTP通信)
- `python-dotenv==1.0.0` (.env対応)

**Node.js** (package.json):
- `@slack/web-api` (Slack API)
- `@google/generative-ai` (Gemini API)

### GitHub Actions設定
- **スケジュール**: 毎日UTC 6:00（JST 15:00）
- **環境**: Ubuntu Latest, Python 3.11
- **Secrets**: `GEMINI_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL`

### Vercel設定
- **Functions**: api/slack-interactions.js
- **環境変数**: `GEMINI_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`

## 重要な設定

### 実行時間変更
スケジュールを変更する場合は `.github/workflows/daily-tech-news.yml:6` のcron式を編集：
```yaml
- cron: '0 6 * * *'  # JST 15:00
```

### Geminiモデル変更
scripts/daily_post.py:71 およびapi/slack-interactions.js でモデル指定：
```python
model = genai.GenerativeModel('gemini-2.5-flash')
```
```javascript
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

### 記事取得数変更
scripts/daily_post.py:42 で取得数制限：
```python
if current_item and len(items) < 5:  # TOP5記事
```

## 新機能（v2.0）

### 詳細要約機能
各記事投稿に「📚 詳細要約」ボタンを追加。クリックするとGemini APIで5-8文程度の詳細要約を生成し、スレッドに投稿。

### 質問機能  
各記事投稿に「❓ 質問する」ボタンを追加。クリックするとモーダルが表示され、記事に関する質問を入力可能。Gemini APIが記事内容に基づいて回答を生成。

### セットアップ手順

1. **Slack App作成**: 
   - Bot Token Scopes: `chat:write`, `commands`
   - Interactive Components: Vercel Function URLを設定

2. **Vercel デプロイ**:
   ```bash
   vercel --prod
   ```

3. **GitHub Secrets設定**:
   - `SLACK_BOT_TOKEN`
   - `SLACK_CHANNEL` 
   - `SLACK_SIGNING_SECRET`（Vercel用）