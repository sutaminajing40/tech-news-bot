const { WebClient } = require('@slack/web-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

// 環境変数の確認
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET || !GEMINI_API_KEY) {
  console.error('必要な環境変数が設定されていません');
}

// Slack WebClientの初期化
const slack = new WebClient(SLACK_BOT_TOKEN);

// Gemini AIの初期化
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Slack署名の検証
 */
function verifySlackSignature(body, signature, timestamp) {
  if (!SLACK_SIGNING_SECRET) {
    console.error('SLACK_SIGNING_SECRET is not set');
    return false;
  }
  
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(sigBasestring, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}

/**
 * ボタンvalueからアクションとURLを抽出
 */
function parseButtonValue(value) {
  const [action, url] = value.split(':');
  return { action, url };
}

/**
 * 記事のタイトルと説明を取得（URLから推定または記録から）
 */
async function getArticleInfo(url) {
  // 実際の実装では、記事のメタデータを取得するか
  // 元の投稿メッセージから情報を抽出する必要がある
  // ここでは簡略化してURLから推定
  return {
    title: "技術記事",
    description: "記事の内容"
  };
}

/**
 * 詳細要約の生成
 */
async function generateDetailSummary(title, description, url) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
以下の技術記事について、エンジニア向けの詳細要約を日本語で作成してください。

要求事項:
- 5-8文程度の詳細な要約
- 技術的なポイントを具体的に説明
- 実務への応用可能性を含める
- 重要なキーワードを*太字*で強調

記事情報:
タイトル: ${title}
URL: ${url}
元の説明: ${description}

詳細要約:
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('詳細要約生成エラー:', error);
    return '申し訳ございません。詳細要約の生成中にエラーが発生しました。';
  }
}

/**
 * 質問への回答生成
 */
async function generateAnswer(title, description, url, question) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
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
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('質問回答生成エラー:', error);
    return '申し訳ございません。回答の生成中にエラーが発生しました。';
  }
}

/**
 * 質問モーダルの表示
 */
async function showQuestionModal(trigger_id, url) {
  try {
    await slack.views.open({
      trigger_id: trigger_id,
      view: {
        type: 'modal',
        callback_id: 'question_modal',
        private_metadata: url,
        title: {
          type: 'plain_text',
          text: '記事への質問'
        },
        submit: {
          type: 'plain_text',
          text: '送信'
        },
        close: {
          type: 'plain_text',
          text: 'キャンセル'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '記事について質問をどうぞ：'
            }
          },
          {
            type: 'input',
            block_id: 'question_block',
            element: {
              type: 'plain_text_input',
              action_id: 'question_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'この記事の内容について質問を入力してください...'
              }
            },
            label: {
              type: 'plain_text',
              text: '質問'
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error('モーダル表示エラー:', error);
  }
}

/**
 * Slackへのスレッド返信
 */
async function postThreadReply(channel, thread_ts, text) {
  try {
    await slack.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts,
      text: text,
      unfurl_links: false,
      unfurl_media: false
    });
  } catch (error) {
    console.error('スレッド返信エラー:', error);
  }
}

/**
 * メインハンドラー
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    
    // 署名検証
    if (!verifySlackSignature(body, signature, timestamp)) {
      console.error('署名検証失敗');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const payload = req.body;
    
    // URLチャレンジ（初回設定時）
    if (payload.challenge) {
      return res.status(200).json({ challenge: payload.challenge });
    }
    
    // インタラクティブペイロード処理
    if (payload.type === 'interactive_message' || payload.type === 'block_actions') {
      const actions = payload.actions || [];
      if (actions.length === 0) {
        return res.status(400).json({ error: 'No actions found' });
      }
      
      const action = actions[0];
      const { action: buttonAction, url } = parseButtonValue(action.value);
      
      // 詳細要約ボタンの処理
      if (action.action_id === 'detail_summary' && buttonAction === 'detail') {
        // 即座に「処理中」応答
        res.status(200).json({
          response_type: 'ephemeral',
          text: '詳細要約を生成中です...'
        });
        
        // バックグラウンドで詳細要約を生成・投稿
        const articleInfo = await getArticleInfo(url);
        const detailSummary = await generateDetailSummary(
          articleInfo.title,
          articleInfo.description,
          url
        );
        
        await postThreadReply(
          payload.channel.id,
          payload.message.ts,
          `📚 *詳細要約*\n\n${detailSummary}\n\n🔗 <${url}|元記事を読む>`
        );
        
        return;
      }
      
      // 質問ボタンの処理
      if (action.action_id === 'ask_question' && buttonAction === 'question') {
        await showQuestionModal(payload.trigger_id, url);
        
        return res.status(200).json({
          response_type: 'ephemeral',
          text: '質問モーダルを開きました'
        });
      }
    }
    
    // モーダル送信処理
    if (payload.type === 'view_submission' && payload.view.callback_id === 'question_modal') {
      const url = payload.view.private_metadata;
      const question = payload.view.state.values.question_block.question_input.value;
      
      // モーダルを閉じる
      res.status(200).json({});
      
      // バックグラウンドで回答生成・投稿
      const articleInfo = await getArticleInfo(url);
      const answer = await generateAnswer(
        articleInfo.title,
        articleInfo.description,
        url,
        question
      );
      
      // 元のメッセージチャンネルに投稿（user情報から推定）
      const channelId = payload.user.id; // DMまたは元チャンネルの特定が必要
      
      // 実際の実装では、適切なチャンネルとthread_tsを特定する仕組みが必要
      console.log(`質問: ${question}`);
      console.log(`回答: ${answer}`);
      
      return;
    }
    
    return res.status(200).json({ message: 'OK' });
    
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};