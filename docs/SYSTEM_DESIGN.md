# Tech News Bot v2.0 - システム設計書

## 1. アーキテクチャ概要

### 1.1 設計思想
- **シンプリシティ重視**: 最小限のコンポーネントで最大の価値を提供
- **ステートレス設計**: 複雑な状態管理を排除
- **スマホファースト**: モバイルユーザビリティを最優先
- **運用負荷最小化**: 自動化と監視の簡素化

### 1.2 全体構成（案2C: Slack簡化ボタン方式）

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  GitHub Actions │───▶│   Gemini API     │───▶│ Slack Workspace │
│   (定時実行)     │    │    (要約生成)     │    │  (記事投稿)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                              │
         │              ┌──────────────────┐            │
         └─────────────▶│ はてブRSS API    │            │
                        │   (記事取得)      │            │
                        └──────────────────┘            │
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌────────▼────────┐
│ Vercel Functions│◀───│   Gemini API     │◀───│ ユーザーボタン   │
│ (ボタン処理)     │    │(詳細要約・質問)    │    │  クリック       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Slack Thread    │
│ (回答投稿)       │
└─────────────────┘
```

## 2. システムコンポーネント

### 2.1 毎日投稿システム (GitHub Actions)

#### 2.1.1 実行タイミング
```yaml
schedule:
  - cron: '0 6 * * *'  # 毎日UTC 6:00 (JST 15:00)
```

#### 2.1.2 処理フロー
```python
# scripts/daily_post.py
1. はてブRSS取得 → get_hatena_tech_articles()
2. 各記事をGemini要約 → summarize_with_gemini()  
3. Slack投稿（ボタン付き） → post_interactive_message()
```

#### 2.1.3 投稿メッセージ構造
```json
{
  "text": "🔥 今日の技術記事TOP5 🔥",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn", 
        "text": "*1. React 19の新機能*\n📝 新しいhookとサスペンス機能が追加され..."
      },
      "accessory": {
        "type": "button",
        "text": "📚 詳細",
        "value": "detail:https://example.com/article1"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": "❓ 質問",
          "value": "question:https://example.com/article1"
        }
      ]
    }
  ]
}
```

### 2.2 インタラクションシステム (Vercel Functions)

#### 2.2.1 エンドポイント設計
```
POST /api/slack-interactions
```

#### 2.2.2 ボタン処理フロー

##### 詳細要約ボタン
```javascript
1. ボタンクリック受信
2. value から記事URL抽出: "detail:https://..."
3. 記事内容を再取得 (必要に応じて)
4. Gemini API で詳細要約生成
5. 元メッセージのスレッドに投稿
```

##### 質問ボタン  
```javascript
1. ボタンクリック受信
2. モーダル表示: 質問入力フォーム
3. ユーザー入力受信
4. 記事内容 + 質問を Gemini API へ
5. 回答をスレッドに投稿
```

## 3. データフロー詳細

### 3.1 毎日投稿データフロー
```
はてブRSS
    ↓ HTTP GET
┌─────────────┐
│ RSS解析     │ → 記事リスト(title, link, description)
│ TOP5選出    │
└─────────────┘
    ↓
┌─────────────┐
│ Gemini API  │ → 各記事の簡潔要約(2-3文)
│ 要約生成    │
└─────────────┘
    ↓
┌─────────────┐
│ Slack API   │ → Interactive Components付きメッセージ
│ 投稿        │   (詳細ボタン、質問ボタン)
└─────────────┘
```

### 3.2 インタラクションデータフロー
```
ユーザーボタンクリック
    ↓
┌─────────────┐
│ Slack Event │ → payload: {value: "detail:URL"}
│ 受信        │
└─────────────┘
    ↓
┌─────────────┐
│ URL抽出     │ → 記事URL, アクション種別
│ アクション  │
│ 判定        │
└─────────────┘
    ↓
┌─────────────┐
│ Gemini API  │ → 詳細要約 OR 質問回答
│ 呼び出し    │
└─────────────┘
    ↓  
┌─────────────┐
│ Slack API   │ → スレッド投稿
│ 応答投稿    │
└─────────────┘
```

## 4. 技術スタック

### 4.1 フロントエンド
- **Slack Interactive Components**: ボタン、モーダル
- **Slack Block Kit**: リッチなメッセージレイアウト

### 4.2 バックエンド

#### 毎日投稿
- **GitHub Actions**: Ubuntu Latest 
- **Python 3.11**: スクリプト実行環境
- **Dependencies**:
  - `google-generativeai`: Gemini API クライアント
  - `requests`: HTTP通信
  - `python-dotenv`: 環境変数管理

#### インタラクション処理  
- **Vercel Functions**: サーバーレス実行環境
- **Node.js 18**: JavaScript ランタイム
- **Dependencies**:
  - `@slack/web-api`: Slack API クライアント
  - `@google/generative-ai`: Gemini API クライアント

### 4.3 外部API
- **Slack API**: メッセージ投稿、インタラクション処理
- **Gemini 2.5 Flash API**: テキスト要約・質問応答
- **はてなブックマークRSS**: 技術記事データソース

### 4.4 インフラ・デプロイ
- **GitHub**: ソースコード管理、Actions実行
- **Vercel**: Functions ホスティング
- **環境変数管理**: GitHub Secrets, Vercel Environment Variables

## 5. セキュリティ設計

### 5.1 認証・認可
- **Slack署名検証**: リクエストの正当性確認
- **環境変数保護**: API キーの安全な管理
- **HTTPS通信**: 全ての通信の暗号化

### 5.2 API制限対応
- **Gemini API**: レート制限監視、エラーハンドリング
- **Slack API**: リトライ機構、タイムアウト設定

## 6. 可用性・運用設計

### 6.1 エラーハンドリング
```javascript
// 基本エラーハンドリングパターン
try {
  const result = await geminiAPI.generateContent(prompt);
  return result;
} catch (error) {
  console.error('Gemini API Error:', error);
  await slackAPI.postMessage(channel, '申し訳ございません。一時的なエラーが発生しました。', threadTs);
  return null;
}
```

### 6.2 監視・ログ
- **GitHub Actions ログ**: 毎日投稿の実行状況
- **Vercel Functions ログ**: インタラクション処理の状況  
- **Slack通知**: システムエラーの即座な通知

### 6.3 フェイルセーフ
- **記事取得失敗**: 前日記事のリプレイ機能（将来拡張）
- **Gemini API障害**: デフォルトメッセージの投稿
- **Slack API障害**: リトライ機構とタイムアウト

## 7. パフォーマンス設計

### 7.1 応答性能
- **詳細要約**: 10秒以内の応答目標
- **質問回答**: 15秒以内の応答目標
- **毎日投稿**: 5分以内の処理完了

### 7.2 最適化手法
- **並列処理**: 複数記事の要約生成を並列実行
- **プロンプト最適化**: Gemini APIの応答時間短縮
- **キャッシュ**: 同一記事への重複リクエスト削減（将来拡張）

## 8. 拡張性設計

### 8.1 スケーラビリティ
- **記事数増加**: TOP5からTOP10への変更容易性
- **新機能追加**: モジュール設計による機能追加の容易性
- **多チャンネル対応**: 複数Slackチャンネルへの配信（将来拡張）

### 8.2 メンテナンス性
- **コード分離**: 機能別のファイル分割
- **設定外部化**: 環境変数による設定管理
- **テスト容易性**: 単体テスト、統合テストの実装容易性