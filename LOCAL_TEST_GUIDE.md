# ローカルテスト手順

## 1. 環境変数の設定

`.env`ファイルを作成（まだ作成していない場合）:
```bash
cp .env.example .env
```

以下の環境変数を設定:
```
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxxx
GEMINI_API_KEY=AIxxxxxxxxxxxxxxxxxx
```

## 2. ローカルサーバーの起動

```bash
# dataディレクトリを作成（SQLite用）
mkdir -p data

# ローカルサーバーを起動
node local-test.js
```

## 3. ngrokでトンネル作成

別のターミナルで:
```bash
ngrok http 3000
```

ngrokが表示するURLをコピー（例: https://abc123.ngrok.io）

## 4. Slack App設定

1. Slack App管理画面: https://api.slack.com/apps
2. Event Subscriptions → Request URL に設定:
   ```
   https://abc123.ngrok.io/api/slack-events
   ```
3. 緑のチェックマークが表示されたら成功

## 5. 動作テスト

1. Slackで任意のURLを含むメッセージを投稿
2. そのメッセージに👍（+1）リアクションを追加
3. ローカルサーバーのログを確認
4. スレッドに詳細要約が投稿されるか確認

## 6. トラブルシューティング

### SQLiteエラーが出る場合
```bash
# データベースファイルを削除して再作成
rm -f data/bot.db*
```

### 環境変数エラーが出る場合
```bash
# 環境変数が正しく読み込まれているか確認
node -e "require('dotenv').config(); console.log(process.env)"
```

### ログの確認方法
- ターミナルに出力されるログを確認
- エラーメッセージの詳細を確認
- SQLiteのテーブル作成ログを確認

## 7. デバッグ用コマンド

```bash
# SQLiteデータベースの中身を確認
sqlite3 data/bot.db "SELECT name FROM sqlite_master WHERE type='table';"

# ヘルスチェック
curl http://localhost:3000/health

# チャレンジテスト
curl -X POST http://localhost:3000/api/slack-events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```