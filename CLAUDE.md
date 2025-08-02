# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Tech News Bot - 毎日午後3時JST（旧朝9時から変更）にはてなブックマークのテクノロジーカテゴリからTOP5記事を取得し、Gemini 2.5 Flash APIで要約してSlackに自動投稿するBot。GitHub Actionsで定時実行。

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
- **tech_news_bot.py**: 単一のメインスクリプト（172行）
  - `get_hatena_tech_articles()`: はてブRSS解析（RDF形式）
  - `summarize_with_gemini()`: Gemini 2.5 Flash API要約生成
  - `send_to_slack()`: Slack Webhook投稿
  - `main()`: 環境変数チェックと処理フロー制御

### データフロー
1. はてブRSS (it.rss) → 記事TOP5取得
2. Gemini API → 各記事の日本語要約生成（2-3文）
3. Slack Webhook → フォーマット済みメッセージ投稿

### 依存関係
- `google-generativeai==0.3.2` (Gemini API)
- `requests==2.31.0` (HTTP通信)
- `python-dotenv==1.0.0` (.env対応)

### GitHub Actions設定
- **スケジュール**: 毎日UTC 6:00（JST 15:00）
- **環境**: Ubuntu Latest, Python 3.11
- **Secrets**: `GEMINI_API_KEY`, `SLACK_WEBHOOK_URL`

## 重要な設定

### 実行時間変更
スケジュールを変更する場合は `.github/workflows/daily-tech-news.yml:6` のcron式を編集：
```yaml
- cron: '0 6 * * *'  # JST 15:00
```

### Geminiモデル変更
scripts/tech_news_bot.py:71 でモデル指定：
```python
model = genai.GenerativeModel('gemini-2.5-flash')
```

### 記事取得数変更
scripts/tech_news_bot.py:42 で取得数制限：
```python
if current_item and len(items) < 5:  # TOP5記事
```