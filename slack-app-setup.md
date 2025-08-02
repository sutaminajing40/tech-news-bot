# Slack App 設定手順

## 📋 事前準備
1. Slack Workspace の管理者権限
2. Google Apps Script プロジェクトの準備完了
3. Google Sheets の作成

## 🔧 1. Slack App作成

### 1.1 アプリ作成
1. https://api.slack.com/apps にアクセス
2. 「Create New App」をクリック
3. 「From scratch」を選択
4. App Name: `Tech News Interactive Bot`
5. Workspace: 使用するワークスペースを選択

### 1.2 Basic Information
- **App Name**: Tech News Interactive Bot
- **Description**: 技術記事の詳細要約と質問対応を行うインタラクティブBot
- **Background Color**: `#4A90E2`
- **Display Information**: 適切なアイコンを設定

## 🔑 2. Bot Token Scopes設定

### 2.1 OAuth & Permissions
「OAuth & Permissions」→ 「Scopes」→ 「Bot Token Scopes」に以下を追加:

#### 必須スコープ:
- `channels:history` - チャンネルメッセージ履歴の読み取り
- `chat:write` - メッセージ投稿
- `reactions:read` - リアクション情報の読み取り
- `users:read` - ユーザー情報の読み取り

#### 追加推奨スコープ:
- `channels:read` - チャンネル情報の読み取り
- `groups:history` - プライベートチャンネル履歴の読み取り（必要に応じて）

### 2.2 Bot Token取得
1. 「Install to Workspace」をクリック
2. 権限を確認して「Allow」
3. **Bot User OAuth Token**をコピー（`xoxb-`で始まる）

## 📡 3. Event Subscriptions設定

### 3.1 Events API有効化
1. 「Event Subscriptions」に移動
2. 「Enable Events」をONに切り替え

### 3.2 Request URL設定
**⚠️ ユーザーアクション必要**

GASでWebアプリをデプロイ後、以下の形式のURLを入力:
```
https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

### 3.3 Subscribe to bot events
以下のイベントを追加:
- `reaction_added` - リアクション追加時のイベント

### 3.4 Subscribe to events on behalf of users
- 通常は不要（Botイベントで十分）

## 🎯 4. Workspace Installation

### 4.1 Install App
1. 「Install App」タブに移動
2. 「Reinstall to Workspace」をクリック
3. 権限を確認して「Allow」

### 4.2 Bot招待
作成したBotを使用するチャンネルに招待:
```
/invite @Tech News Interactive Bot
```

## 🔐 5. 環境変数設定

**⚠️ ユーザーアクション必要**

GASのスクリプトプロパティに以下を設定:

### 5.1 PropertiesService設定
```javascript
// GASエディタで実行
function setProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'SLACK_BOT_TOKEN': 'xoxb-your-bot-token-here',
    'GEMINI_API_KEY': 'your-gemini-api-key-here',
    'GOOGLE_SHEETS_ID': 'your-google-sheets-id-here'
  });
}
```

## 📊 6. Google Sheets作成

**⚠️ ユーザーアクション必要**

1. 新しいGoogle Sheetsを作成
2. シート名: `Tech News Bot Data`
3. Sheets IDをコピー（URLの`/d/`と`/edit`の間の文字列）
4. GASプロジェクトと同じGoogleアカウントで作成すること

## 🚀 7. デプロイメント

**⚠️ ユーザーアクション必要**

### 7.1 GAS Web App デプロイ
1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類: ウェブアプリ
3. 実行者: 自分
4. アクセス: 全員（匿名ユーザーを含む）
5. 「デプロイ」をクリック
6. **Web アプリのURL**をコピー

### 7.2 Slack Event URL設定
1. Slack App設定の「Event Subscriptions」に戻る
2. Request URLに上記のWeb アプリURLを入力
3. 「Save Changes」

## ✅ 8. テスト

### 8.1 基本動作確認
1. Botが招待されたチャンネルで技術記事を投稿
2. メッセージに👍リアクションを追加
3. 詳細要約が返信されることを確認

### 8.2 質問機能確認
1. 技術記事メッセージに❓リアクションを追加
2. 質問受付モードが開始されることを確認

## 🔍 9. トラブルシューティング

### よくある問題:
- **Event URLの検証エラー**: GASのデプロイ権限を確認
- **Bot Token エラー**: スコープとトークンを再確認
- **リアクション無反応**: Event Subscriptionsの設定を確認

### デバッグ方法:
- GASの「実行」→「実行ログを表示」でログ確認
- Slack App設定の「Event Subscriptions」で配信状況確認

## 📝 次のステップ

1. 既存のGitHub Actions（定時投稿）との連携
2. 記事データの自動同期
3. 統計機能の追加
4. エラーハンドリングの強化