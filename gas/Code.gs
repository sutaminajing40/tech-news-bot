/**
 * Tech News Bot - インタラクティブ機能
 * Slackリアクションイベント処理メイン
 */

// 実行回数カウンター
let doPostCounter = 0;
let handleDetailRequestCounter = 0;
let geminiCallCounter = 0;
let slackPostCounter = 0;

// Slack Event受信エンドポイント
function doPost(e) {
  doPostCounter++;
  console.log(`【調査】doPost実行回数: ${doPostCounter}`);
  
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // URL Verification (初回設定時)
    if (payload.type === 'url_verification') {
      return ContentService.createTextOutput(payload.challenge);
    }
    
    // Event処理
    if (payload.type === 'event_callback') {
      console.log(`【調査】Event callback received: ${payload.event.type}, doPost回数: ${doPostCounter}`);
      
      // 即座に処理実行（setTimeout削除）
      handleSlackEvent(payload.event);
      
      console.log('Event processing completed');
    }
    
    // Slackに即座にOKを返す
    return ContentService.createTextOutput('OK');
    
  } catch (error) {
    console.error('doPost Error:', error);
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

// Slackイベント処理
function handleSlackEvent(event) {
  console.log('Event received:', event);
  
  if (event.type === 'reaction_added') {
    handleReactionAdded(event);
  } else if (event.type === 'message') {
    // スレッド内のメッセージ（質問）を処理
    handleThreadMessage(event);
  }
}

// リアクション追加処理
function handleReactionAdded(event) {
  const reaction = event.reaction;
  const channel = event.item.channel;
  const messageTs = event.item.ts;
  const user = event.user;
  
  // 重複イベントチェック（PropertiesServiceを使用）
  const eventKey = `${reaction}_${channel}_${messageTs}_${user}`;
  const properties = PropertiesService.getScriptProperties();
  const processedKey = `processed_${eventKey}`;
  
  if (properties.getProperty(processedKey)) {
    console.log('重複イベントをスキップしました:', eventKey);
    return;
  }
  
  // 処理済みマークを追加（30分間有効）
  properties.setProperty(processedKey, Date.now().toString());
  
  // 古い処理済みマークを削除（30分以上前）
  cleanupOldProcessedEvents();
  console.log(`Reaction: ${reaction}, Channel: ${channel}, Message: ${messageTs}`);
  
  // 👍 リアクション → 詳細要約
  if (reaction === '+1' || reaction === 'thumbsup') {
    handleDetailRequest(channel, messageTs, user);
  }
  
  // ❓ リアクション → 質問受付
  if (reaction === 'question' || reaction === 'grey_question') {
    handleQuestionMode(channel, messageTs, user);
  }
}

// 詳細要約リクエスト処理
function handleDetailRequest(channel, messageTs, user) {
  handleDetailRequestCounter++;
  console.log(`【調査】handleDetailRequest実行回数: ${handleDetailRequestCounter}`);
  console.log('handleDetailRequest開始:', channel, messageTs, user);
  
  try {
    // メッセージ内容を取得
    console.log('Slackメッセージ情報を取得中...');
    const messageInfo = SlackService.getMessageInfo(channel, messageTs);
    if (!messageInfo) {
      console.error('メッセージ情報取得失敗');
      return;
    }
    console.log('メッセージ情報取得成功:', messageInfo.text);
    
    // 記事URLを抽出
    const articleUrl = extractArticleUrl(messageInfo.text);
    if (!articleUrl) {
      SlackService.postMessage(channel, '記事URLが見つかりませんでした', messageTs);
      return;
    }
    
    // 記事データを取得
    let articleData = DataService.getArticleByUrl(articleUrl);
    
    // 記事データが見つからない場合、メッセージから作成
    if (!articleData) {
      console.log('記事データが見つからないため、メッセージから作成します');
      
      // メッセージのテキストから記事情報を抽出
      const articleTitle = extractArticleTitle(messageInfo.text);
      const articleDesc = extractArticleDescription(messageInfo.text);
      
      // 仮の記事データを作成
      articleData = {
        title: articleTitle || 'タイトル不明',
        url: articleUrl,
        description: articleDesc || '',
        summary: ''
      };
      
      // 記事データを保存（今後の参照用）
      DataService.saveArticle(
        articleData.title,
        articleData.url,
        articleData.description,
        '基本要約未生成'
      );
    }
    
    // Geminiで詳細要約生成
    geminiCallCounter++;
    console.log(`【調査】Gemini API呼び出し回数: ${geminiCallCounter}`);
    console.log('Gemini詳細要約生成開始...');
    const detailedSummary = GeminiService.generateDetailedSummary(articleData);
    console.log('Gemini詳細要約生成完了:', detailedSummary.substring(0, 100) + '...');
    
    // Slackに投稿
    slackPostCounter++;
    console.log(`【調査】Slack投稿実行回数: ${slackPostCounter}`);
    const responseText = `📋 *詳細要約*\n\n${detailedSummary}\n\n🔗 ${articleUrl}`;
    console.log('Slack投稿開始...');
    const result = SlackService.postMessage(channel, responseText, messageTs);
    console.log('Slack投稿結果:', result ? '成功' : '失敗');
    
    // 使用履歴を記録
    DataService.logInteraction('detail_request', user, articleUrl, '', detailedSummary, channel);
    
  } catch (error) {
    console.error('Detail request error:', error);
    SlackService.postMessage(channel, '詳細要約の生成に失敗しました', messageTs);
  }
}

// 質問モード処理
function handleQuestionMode(channel, messageTs, user) {
  try {
    // メッセージ内容を取得
    const messageInfo = SlackService.getMessageInfo(channel, messageTs);
    if (!messageInfo) {
      console.error('メッセージ情報取得失敗');
      return;
    }
    
    // 記事URLを抽出
    const articleUrl = extractArticleUrl(messageInfo.text);
    if (!articleUrl) {
      SlackService.postMessage(channel, '記事URLが見つかりませんでした', messageTs);
      return;
    }
    
    // 質問受付メッセージを投稿
    const responseText = `❓ *質問受付モード*\n\nこの記事について質問をスレッドで投稿してください！\nAIが回答します。\n\n🔗 ${articleUrl}`;
    SlackService.postMessage(channel, responseText, messageTs);
    
    // 質問モード状態を記録
    DataService.setQuestionMode(channel, messageTs, articleUrl, user);
    
  } catch (error) {
    console.error('Question mode error:', error);
    SlackService.postMessage(channel, '質問モードの開始に失敗しました', messageTs);
  }
}

// メッセージから記事URLを抽出
function extractArticleUrl(text) {
  const urlRegex = /https?:\/\/[^\s\|<>]+/g;
  const urls = text.match(urlRegex);
  
  if (urls && urls.length > 0) {
    // 最初のURLを返す（Slack形式の<>と|title部分を除去）
    let url = urls[0].replace(/[<>]/g, '');
    // |以降を除去（Slackのリンク形式対応）
    if (url.includes('|')) {
      url = url.split('|')[0];
    }
    return url;
  }
  
  return null;
}

// メッセージから記事タイトルを抽出
function extractArticleTitle(text) {
  // "1. タイトル" 形式を探す
  const titleMatch = text.match(/\*?\d+\.\s*([^*\n]+)\*?/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Slackリンク形式から抽出 <url|title>
  const linkMatch = text.match(/<[^|]+\|([^>]+)>/);
  if (linkMatch) {
    return linkMatch[1].trim();
  }
  
  return null;
}

// メッセージから記事説明を抽出
function extractArticleDescription(text) {
  // 📝マークの後の説明文を探す
  const descMatch = text.match(/📝\s*([^\n🔗]+)/);
  if (descMatch) {
    return descMatch[1].trim();
  }
  
  return null;
}

// スレッドメッセージ処理（質問への回答）
function handleThreadMessage(event) {
  // Botからのメッセージは無視
  if (event.bot_id) {
    return;
  }
  
  // スレッドメッセージでない場合は無視
  if (!event.thread_ts) {
    return;
  }
  
  try {
    const channel = event.channel;
    const threadTs = event.thread_ts;
    const question = event.text;
    const user = event.user;
    
    console.log(`Thread message: ${question} in ${channel}/${threadTs}`);
    
    // 質問モードが有効かチェック
    const questionMode = DataService.getActiveQuestionMode(channel, threadTs);
    if (!questionMode) {
      console.log('質問モードが無効またはタイムアウト');
      return;
    }
    
    // 記事データを取得
    const articleData = DataService.getArticleByUrl(questionMode.articleUrl);
    if (!articleData) {
      SlackService.postMessage(channel, '記事データが見つかりません', threadTs);
      return;
    }
    
    // Geminiで質問に回答
    const answer = GeminiService.answerQuestion(articleData, question);
    
    // スレッドに回答を投稿
    const responseText = `💡 **回答**\n\n${answer}`;
    SlackService.postMessage(channel, responseText, threadTs);
    
    // インタラクション履歴を記録
    DataService.logInteraction('question_answer', user, questionMode.articleUrl, question, answer, channel);
    
  } catch (error) {
    console.error('Thread message error:', error);
  }
}

// 設定情報取得
function getConfig() {
  return {
    slackBotToken: PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN'),
    geminiApiKey: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
    sheetsId: PropertiesService.getScriptProperties().getProperty('GOOGLE_SHEETS_ID')
  };
}

// テスト用関数
function testConfig() {
  const config = getConfig();
  console.log('Slack Token:', config.slackBotToken ? 'Set' : 'Not set');
  console.log('Gemini Key:', config.geminiApiKey ? 'Set' : 'Not set');
  console.log('Sheets ID:', config.sheetsId ? 'Set' : 'Not set');
}

// テスト用: リアクション処理をシミュレート
function testReactionHandler() {
  console.log('テスト開始');
  
  const testEvent = {
    reaction: '+1',
    item: {
      channel: 'C1234567890',
      ts: '1234567890.123456'
    },
    user: 'U1234567890'
  };
  
  console.log('テストイベント:', testEvent);
  handleReactionAdded(testEvent);
  console.log('テスト完了');
}

// 古い処理済みイベントをクリーンアップ
function cleanupOldProcessedEvents() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const allProperties = properties.getProperties();
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('processed_')) {
        const timestamp = parseInt(allProperties[key]);
        if (timestamp < thirtyMinutesAgo) {
          properties.deleteProperty(key);
        }
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// カウンターリセット用テスト関数
function resetCounters() {
  doPostCounter = 0;
  handleDetailRequestCounter = 0;
  geminiCallCounter = 0;
  slackPostCounter = 0;
  console.log('カウンターをリセットしました');
}