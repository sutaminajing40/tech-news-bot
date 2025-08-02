# Google Apps Script - インタラクティブ機能

## 概要
Slackのリアクション（👍、❓）に応答して詳細要約や質問処理を行うGASプロジェクト

## ファイル構成
```
gas/
├── README.md                 # このファイル
├── Code.gs                   # メインロジック
├── SlackService.gs           # Slack API処理
├── GeminiService.gs          # Gemini API処理
├── DataService.gs            # Google Sheets連携
└── appsscript.json          # GAS設定ファイル
```

## 機能
- 👍 リアクション → 記事の詳細要約生成
- ❓ リアクション → 質問受付モード開始
- Google Sheets での記事・質問履歴管理
- Gemini 2.5 Flash での AI処理

## セットアップ手順
1. Google Apps Script新規プロジェクト作成
2. 各ファイルをコピー&ペースト
3. 環境変数設定（PropertiesService）
4. Web Appとしてデプロイ
5. Slack Appの設定