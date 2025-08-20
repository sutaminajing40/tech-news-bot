# Tech News Bot v2.0 - 技術仕様書

## 1. プロジェクト構成

### 1.1 ファイル構成
```
tech-news-bot/
├── .github/
│   └── workflows/
│       └── daily-tech-news.yml      # GitHub Actions設定
├── scripts/  
│   └── daily_post.py                # 毎日投稿スクリプト（新規作成）
├── api/
│   └── slack-interactions.js        # Slack Interactive処理（新規作成）
├── docs/
│   ├── PRD.md                       # 製品要件定義書
│   ├── SYSTEM_DESIGN.md             # システム設計書
│   └── TECHNICAL_SPEC.md            # 技術仕様書（本ファイル）
├── requirements.txt                 # Python依存関係
├── package.json                     # Node.js依存関係（新規作成）
├── vercel.json                      # Vercel設定（新規作成）
└── CLAUDE.md                        # プロジェクト設定
```

### 1.2 実装予定ファイル
- `scripts/daily_post.py`: 現在の `tech_news_bot.py` を拡張
- `api/slack-interactions.js`: Slack Interactive Components処理
- `package.json`: Node.js依存関係管理
- `vercel.json`: Vercel Functions設定

## 2. API仕様

### 2.1 Slack Interactive Components API

#### 2.1.1 エンドポイント
```
POST /api/slack-interactions
Content-Type: application/x-www-form-urlencoded
```

#### 2.1.2 リクエスト形式
```javascript
// ボタンクリック時
{
  "type": "interactive_message",
  "actions": [
    {
      "name": "button_click",
      "value": "detail:https://example.com/article-url",
      "type": "button"
    }
  ],
  "callback_id": "tech_news_interaction",
  "team": { "id": "T123456" },
  "channel": { "id": "C123456" },
  "user": { "id": "U123456" },
  "original_message": { "ts": "1234567890.123456" }
}

// モーダル送信時
{
  "type": "view_submission",
  "view": {
    "private_metadata": "https://example.com/article-url",
    "state": {
      "values": {
        "question_block": {
          "question_input": {
            "value": "この記事のReactの新機能について詳しく教えて"
          }
        }
      }
    }
  }
}
```

#### 2.1.3 レスポンス形式
```javascript
// 成功時
{
  "response_type": "in_channel",
  "text": "処理中です..."
}

// エラー時  
{
  "response_type": "ephemeral",
  "text": "エラーが発生しました。しばらく後にもう一度お試しください。"
}
```

### 2.2 Gemini API仕様

#### 2.2.1 詳細要約プロンプト
```javascript
const detailPrompt = `
以下の技術記事について、エンジニア向けの詳細要約を日本語で作成してください。

要求事項:
- 5-8文程度の詳細な要約
- 技術的なポイントを具体的に説明
- 実務への応用可能性を含める
- 重要なキーワードを太字で強調

記事情報:
タイトル: ${title}
URL: ${url}
元の説明: ${description}

詳細要約:
`;
```

#### 2.2.2 質問回答プロンプト
```javascript
const questionPrompt = `
以下の技術記事に関する質問に、正確で分かりやすい回答を日本語で提供してください。

記事情報:
タイトル: ${title}
URL: ${url}
内容: ${description}

質問: ${question}

回答の要件:
- 記事の内容に基づいて回答
- 技術的に正確な情報を提供
- 3-5文程度で簡潔に
- 不明な点は記事を参照するよう案内

回答:
`;
```

## 3. データベース設計

### 3.1 データストレージ方針
**データベース不使用**: ステートレス設計により、永続化データベースは使用しない

### 3.2 データの保持方法
- **記事情報**: ボタンのvalue属性に埋め込み
- **セッション管理**: Slackのinteraction payloadで管理
- **一時データ**: メモリ内での処理完結

### 3.3 データ形式

#### ボタンvalue形式
```
詳細要約: "detail:https://article-url.com"
質問: "question:https://article-url.com"
```

#### 記事データ構造
```javascript
{
  title: "記事タイトル",
  url: "https://article-url.com", 
  description: "記事の説明文",
  summary: "簡潔要約"
}
```

## 4. 環境変数仕様

### 4.1 GitHub Actions環境変数
```bash
# GitHub Secrets
GEMINI_API_KEY="AIza..."           # Gemini API認証キー
SLACK_BOT_TOKEN="xoxb-..."         # Slack Bot Token（新規追加）
SLACK_WEBHOOK_URL="https://..."    # Slack Incoming Webhook（既存）
```

### 4.2 Vercel環境変数
```bash
# Vercel Environment Variables
GEMINI_API_KEY="AIza..."           # Gemini API認証キー
SLACK_BOT_TOKEN="xoxb-..."         # Slack Bot Token
SLACK_SIGNING_SECRET="abc123..."   # Slack署名検証用（新規追加）
```

## 5. 依存関係仕様

### 5.1 Python依存関係 (requirements.txt)
```txt
google-generativeai==0.3.2
requests==2.31.0
python-dotenv==1.0.0
```

### 5.2 Node.js依存関係 (package.json)
```json
{
  "name": "tech-news-bot-interactions",
  "version": "2.0.0",
  "dependencies": {
    "@slack/web-api": "^6.9.0",
    "@google/generative-ai": "^0.2.1"
  },
  "engines": {
    "node": "18.x"
  }
}
```

## 6. 設定ファイル仕様

### 6.1 Vercel設定 (vercel.json)
```json
{
  "functions": {
    "api/slack-interactions.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "GEMINI_API_KEY": "@gemini-api-key",
    "SLACK_BOT_TOKEN": "@slack-bot-token", 
    "SLACK_SIGNING_SECRET": "@slack-signing-secret"
  }
}
```

### 6.2 GitHub Actions更新 (daily-tech-news.yml)
```yaml
name: Daily Tech News Bot v2.0

on:
  schedule:
    - cron: '0 6 * * *'  # 毎日UTC 6:00 (JST 15:00)
  workflow_dispatch:

jobs:
  tech-news-post:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - run: pip install -r requirements.txt
    - name: Post daily tech news
      env:
        GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
      run: python scripts/daily_post.py
```

## 7. エラーハンドリング仕様

### 7.1 エラーコード定義
```javascript
const ErrorCodes = {
  GEMINI_API_ERROR: 'GEMINI_001',
  SLACK_API_ERROR: 'SLACK_001', 
  INVALID_PAYLOAD: 'PAYLOAD_001',
  TIMEOUT_ERROR: 'TIMEOUT_001',
  UNKNOWN_ERROR: 'UNKNOWN_001'
};
```

### 7.2 エラーレスポンス形式
```javascript
// ユーザー向けエラー応答
{
  "response_type": "ephemeral",
  "text": "申し訳ございません。一時的なエラーが発生しました。しばらく後にもう一度お試しください。",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "🚨 *エラーが発生しました*\n\n詳細な情報については、管理者にお問い合わせください。"
      }
    }
  ]
}
```

### 7.3 ログ出力仕様
```javascript
// 構造化ログ形式
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'ERROR',
  errorCode: 'GEMINI_001',
  message: 'Gemini API request failed',
  userId: payload.user.id,
  articleUrl: articleUrl,
  error: error.message
}));
```

## 8. セキュリティ仕様

### 8.1 Slack署名検証
```javascript
const crypto = require('crypto');

function verifySlackSignature(body, signature, timestamp) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
```

### 8.2 入力値検証
```javascript
function validateButtonValue(value) {
  const validActions = ['detail', 'question'];
  const [action, url] = value.split(':');
  
  if (!validActions.includes(action)) {
    throw new Error('Invalid action type');
  }
  
  if (!url || !url.startsWith('http')) {
    throw new Error('Invalid URL format');
  }
  
  return { action, url };
}
```

## 9. パフォーマンス仕様

### 9.1 応答時間目標
- **ボタンクリック応答**: 3秒以内
- **詳細要約生成**: 10秒以内
- **質問回答生成**: 15秒以内
- **毎日投稿処理**: 5分以内

### 9.2 並列処理設計
```python
# 記事要約の並列処理
import asyncio
import aiohttp

async def generate_summaries_parallel(articles):
    tasks = [
        generate_summary_async(article) 
        for article in articles
    ]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

### 9.3 タイムアウト設定
```javascript
// Vercel Functions
const TIMEOUT_MS = 25000; // 25秒

const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
);

const result = await Promise.race([
  processInteraction(payload),
  timeoutPromise
]);
```

## 10. テスト仕様

### 10.1 単体テスト
```javascript
// Slack payload validation test
test('validates button payload correctly', () => {
  const payload = {
    actions: [{ value: 'detail:https://example.com' }]
  };
  const result = validateButtonValue(payload.actions[0].value);
  expect(result.action).toBe('detail');
  expect(result.url).toBe('https://example.com');
});
```

### 10.2 統合テスト
```python
# 記事取得・要約・投稿の統合テスト
def test_daily_post_integration():
    articles = get_hatena_tech_articles()
    assert len(articles) == 5
    
    for article in articles:
        summary = summarize_with_gemini(article['title'], article['description'])
        assert len(summary) > 0
```

### 10.3 モックテスト
```javascript
// Gemini API mock for testing
const mockGeminiResponse = {
  text: "React 19では新しいhooks APIが導入され..."
};

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue(mockGeminiResponse)
    })
  }))
}));
```