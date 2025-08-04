// Slack Events API Handler for Vercel Functions
const SlackService = require('../lib/slack-service');
const GeminiService = require('../lib/gemini-service');
const DataService = require('../lib/data-service');

// 環境変数チェック
if (!process.env.SLACK_BOT_TOKEN || !process.env.GEMINI_API_KEY) {
  console.error('Missing required environment variables');
}

// サービスインスタンス（リクエストごとに作成）
let slackService;
let geminiService;
let dataService;

// 処理済みイベントを一時的に保存（メモリ内）
const processedEvents = new Map();

function initializeServices() {
  if (!slackService) {
    console.log('Initializing services...');
    slackService = new SlackService();
    geminiService = new GeminiService();
    dataService = new DataService();
    console.log('Services initialized');
  }
}

// URLからArticleデータを取得する共通関数
async function fetchArticleData(url) {
  // まずDBから検索
  const existingArticle = await dataService.getArticleByUrl(url);
  if (existingArticle) {
    return existingArticle;
  }

  // DBになければ基本情報だけ返す
  return {
    title: 'タイトル取得中...',
    url: url,
    description: '',
    summary: ''
  };
}

// リアクション処理
async function handleReaction(event) {
  const { reaction, user, item } = event;
  
  if (reaction === '+1' && item.type === 'message') {
    console.log(`User ${user} reacted with :+1: to message ${item.ts}`);
    
    try {
      // イベントキーで重複チェック（一時的にスキップ）
      // Vercelのメモリデータベースはリクエストごとにリセットされるため
      // 重複チェックは機能しません
      const eventKey = `reaction_${item.channel}_${item.ts}_${user}_${reaction}`;
      console.log('Event key:', eventKey);
      // TODO: 外部データベースに移行する必要があります
      
      // メッセージ情報を取得
      console.log('Getting message info for:', item.channel, item.ts);
      const message = await slackService.getMessageInfo(item.channel, item.ts);
      console.log('Message info result:', message ? 'Found' : 'Not found');
      if (!message || !message.text) {
        console.error('Failed to get message info:', message);
        return;
      }
      
      // URLを抽出
      const urlMatch = message.text.match(/<(https?:\/\/[^>]+)>/); 
      if (!urlMatch) {
        console.log('No URL found in message');
        return;
      }
      
      const articleUrl = urlMatch[1];
      console.log('Found URL:', articleUrl);
      
      // 記事データを取得
      const articleData = await fetchArticleData(articleUrl);
      
      // 詳細要約を生成
      const detailedSummary = await geminiService.generateDetailedSummary(articleData);
      
      // スレッドに投稿
      const postResult = await slackService.postMessage(
        item.channel,
        `📚 *詳細要約*\n\n${detailedSummary}\n\n💡 _このスレッドで質問すると、AIが記事の内容について回答します。_`,
        item.ts
      );
      
      if (postResult) {
        // データベース操作（一時的にスキップ）
        // TODO: 外部データベースに移行する必要があります
        console.log('Skipping database operations due to Vercel memory DB limitations');
        
        console.log('Detailed summary posted successfully');
      }
      
    } catch (error) {
      console.error('Error handling reaction:', error);
      console.error('Error stack:', error.stack);
      // エラー時もリアクションを追加
      try {
        await slackService.addReaction(item.channel, item.ts, 'x');
      } catch (reactionError) {
        console.error('Failed to add error reaction:', reactionError);
      }
    }
  }
}

// メッセージ処理（スレッド内の質問への回答）
async function handleMessage(event) {
  // ボット自身のメッセージは無視
  if (event.bot_id || event.subtype === 'bot_message') {
    return;
  }
  
  // スレッド内のメッセージのみ処理
  if (!event.thread_ts) {
    return;
  }
  
  try {
    // 質問モードをチェック
    const questionMode = await dataService.getActiveQuestionMode(event.channel, event.thread_ts);
    if (!questionMode) {
      console.log('No active question mode for thread:', event.thread_ts);
      return;
    }
    
    console.log('Question received in thread:', event.text);
    
    // 記事データを取得
    const articleData = await fetchArticleData(questionMode.article_url);
    
    // Geminiで回答を生成
    const answer = await geminiService.answerQuestion(articleData, event.text);
    
    // スレッドに回答を投稿
    const postResult = await slackService.postMessage(
      event.channel,
      `🤖 *回答*\n\n${answer}`,
      event.thread_ts
    );
    
    if (postResult) {
      // インタラクションを記録
      await dataService.logInteraction('question_answer', event.user, questionMode.article_url, event.text, answer, event.channel);
      console.log('Answer posted successfully');
    }
    
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Slackのretry headerをチェック
  const retryCount = req.headers['x-slack-retry-num'];
  const retryReason = req.headers['x-slack-retry-reason'];
  
  if (retryCount) {
    console.log(`Slack retry detected: count=${retryCount}, reason=${retryReason}`);
    // リトライの場合は処理をスキップ
    return res.status(200).send('OK');
  }

  // サービスを初期化
  initializeServices();

  try {
    const body = req.body;
    
    // URL Verification Challenge
    if (body.type === 'url_verification') {
      console.log('URL verification challenge:', body.challenge);
      return res.status(200).send(body.challenge);
    }
    
    // Event Callback処理
    if (body.type === 'event_callback') {
      const event = body.event;
      console.log('Event received:', event);
      
      // イベントIDで重複チェック（event_tsとユーザーIDを組み合わせる）
      const eventId = `${event.event_ts}_${event.user}_${event.type}`;
      
      // 既に処理済みのイベントかチェック
      if (processedEvents.has(eventId)) {
        console.log('Event already processed, skipping:', eventId);
        return res.status(200).send('OK');
      }
      
      // イベントを処理済みとしてマーク（10分間保持）
      processedEvents.set(eventId, Date.now());
      
      // 古いイベントをクリーンアップ（10分以上前のもの）
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      for (const [key, timestamp] of processedEvents.entries()) {
        if (timestamp < tenMinutesAgo) {
          processedEvents.delete(key);
        }
      }
      
      // Vercel Functionsでは、レスポンスを返す前に処理を完了する必要がある
      // 非同期処理をPromiseで包んで、エラーをキャッチしつつ処理を実行
      const processEvent = async () => {
        try {
          // イベントタイプに応じて処理
          if (event.type === 'reaction_added') {
            console.log('Processing reaction_added event...');
            await handleReaction(event);
            console.log('Reaction processing completed');
          } else if (event.type === 'message') {
            console.log('Processing message event...');
            await handleMessage(event);
            console.log('Message processing completed');
          }
        } catch (error) {
          console.error('Error processing event:', error);
          // エラーが発生しても200 OKを返す（Slackの再送を防ぐため）
        }
      };
      
      // 処理を実行（タイムアウト設定付き）
      await Promise.race([
        processEvent(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 55000))
      ]).catch(error => {
        console.error('Event processing error or timeout:', error.message);
      });
      
      // 処理完了後に200 OKを返す
      return res.status(200).send('OK');
    }
    
    // その他のリクエスト
    return res.status(200).send('OK');
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}