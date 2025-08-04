# GAS → Vercel Functions 移行計画

## 概要
Google Apps Script (GAS) で動作している Slack インタラクティブ機能を Vercel Functions (Node.js) + SQLite に移行する。

## 現在のGASシステム機能
- **リアクション処理**: 👍で詳細要約（拡張可能設計）
- **詳細要約生成**: Gemini 2.5 Flash APIで技術記事の詳細要約
- **質問回答機能**: スレッド内のメッセージに自動でAI回答
- **データ管理**: Google Sheetsで記事・履歴管理
- **重複防止**: PropertiesServiceで30分間のイベント重複防止

## 新しい構成
```
Slack Events API → Vercel Functions (Node.js) → Gemini API → Slack Bot API
                        ↓
                    SQLite (ローカルファイル)
```

## 移行手順

### フェーズ1: 基盤準備
1. **プロジェクト構成とディレクトリ構造の設計**
   - Vercel Functions用ディレクトリ構造決定
   - 既存コードとの共存方法検討

2. **Vercel Functions用のpackage.jsonとapi/ディレクトリ作成**
   - Node.js依存関係設定
   - Vercel Functions API構造作成

3. **SQLiteスキーマ設計と初期化コード実装**
   - 記事テーブル (articles)
   - インタラクション履歴テーブル (interactions)  
   - 処理済みイベントテーブル (processed_events)

### フェーズ2: コア機能実装
4. **Node.js版SlackService実装（メッセージ取得・投稿・リアクション）**
   - `getMessageInfo()` - メッセージ情報取得
   - `postMessage()` - メッセージ投稿
   - `addReaction()` - リアクション追加
   - `getUserInfo()` - ユーザー情報取得

5. **Node.js版GeminiService実装（詳細要約・質問回答）**
   - `generateDetailedSummary()` - 詳細要約生成
   - `answerQuestion()` - 質問回答生成
   - `summarizeArticle()` - 基本要約生成（互換性用）

6. **Node.js版DataService実装（SQLite操作）**
   - `saveArticle()` - 記事保存
   - `getArticleByUrl()` - URL検索
   - `logInteraction()` - インタラクション履歴記録
   - `checkProcessedEvent()` / `markEventProcessed()` - 重複防止

7. **メインのSlack Events処理関数実装**
   - `doPost()` → Slack Eventsハンドラー
   - `handleReactionAdded()` - 拡張可能なリアクション処理システム
   - `handleThreadMessage()` - スレッドメッセージ自動回答
   - `handleDetailRequest()` - 詳細要約リクエスト
   - `reactionHandlers` - リアクションタイプ別ハンドラー（拡張性）

### フェーズ3: テスト・デプロイ
8. **ローカルテスト環境構築（vercel dev）**
   - 環境変数設定
   - ローカル開発サーバー起動
   - 機能テスト実行

9. **Vercelデプロイと環境変数設定**
   - `vercel --prod` デプロイ
   - 環境変数設定（SLACK_BOT_TOKEN, GEMINI_API_KEY）
   - プレビューデプロイでのテスト

10. **Slack Events URLの切り替えと動作確認**
    - Slack Events APIのEndpoint URL変更
    - 本番環境での動作確認
    - GASシステムの停止

## 技術スタック
- **Runtime**: Node.js (Vercel Functions)
- **Database**: SQLite (better-sqlite3)
- **APIs**: Slack Web API, Gemini 2.5 Flash API
- **Deployment**: Vercel CLI
- **Development**: Claude Code

## 環境変数
```
SLACK_BOT_TOKEN=xoxb-...
GEMINI_API_KEY=...
```

## プロジェクト構造（予定）
```
tech-news-bot/
├── api/
│   └── slack-events.js      # Slack Events処理メイン
├── lib/
│   ├── slack-service.js     # Slack API操作
│   ├── gemini-service.js    # Gemini API操作
│   ├── data-service.js      # SQLite操作
│   └── db.js               # DB初期化
├── package.json
├── vercel.json             # Vercel設定
└── data/
    └── bot.db             # SQLiteファイル
```

## メリット
- **開発効率**: Claude Codeから直接デプロイ・テスト可能
- **コスト**: 完全無料で運用可能（Hobby Plan）
- **パフォーマンス**: Node.jsによる高速実行
- **保守性**: バージョン管理とログの改善
- **拡張性**: npm エコシステムの活用

## 想定課題と対策
- **コールドスタート**: 初回実行の遅延 → 軽量実装で最小化
- **SQLiteファイル永続化**: Vercel Functionsはステートレス → 外部DB検討（必要時）
- **リアクション重複**: 30分間の重複防止 → SQLiteテーブルで管理
- **リアクション拡張**: 新しいボタン追加時の対応 → ハンドラーマップ設計で対応

## 現在のGASコード参照先
- `gas/Code.gs` - メイン処理、リアクション・スレッド処理
- `gas/SlackService.gs` - Slack API操作
- `gas/GeminiService.gs` - Gemini API操作
- `gas/DataService.gs` - Google Sheets操作

## Vercel CLI コマンド
```bash
# 初回セットアップ
npm i -g vercel
vercel login
vercel --yes

# 開発・デプロイ
vercel dev        # ローカル開発
vercel           # プレビューデプロイ
vercel --prod    # 本番デプロイ
vercel logs      # ログ確認
```

## 次のステップ
1. フェーズ1の基盤準備から開始
2. 段階的な機能実装とテスト
3. 本番環境での並行運用テスト
4. 完全移行とGASシステム停止