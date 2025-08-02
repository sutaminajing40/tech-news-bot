/**
 * Google Sheets データ管理サービス
 */

const DataService = {
  
  // Google Sheetsインスタンスを取得
  getSheet: function(sheetName) {
    const config = getConfig();
    const spreadsheet = SpreadsheetApp.openById(config.sheetsId);
    
    // シートが存在しない場合は作成
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      this.initializeSheet(sheet, sheetName);
    }
    
    return sheet;
  },
  
  // シートの初期化
  initializeSheet: function(sheet, sheetName) {
    if (sheetName === 'articles') {
      // 記事データシート
      sheet.getRange('A1:F1').setValues([
        ['timestamp', 'title', 'url', 'description', 'summary', 'posted_date']
      ]);
    } else if (sheetName === 'interactions') {
      // インタラクション履歴シート
      sheet.getRange('A1:G1').setValues([
        ['timestamp', 'type', 'user_id', 'article_url', 'question', 'response', 'channel']
      ]);
    } else if (sheetName === 'question_modes') {
      // 質問モード状態シート
      sheet.getRange('A1:F1').setValues([
        ['channel', 'message_ts', 'article_url', 'user_id', 'created_at', 'active']
      ]);
    }
    
    // ヘッダー行をフォーマット
    sheet.getRange('1:1').setFontWeight('bold').setBackground('#f0f0f0');
  },
  
  // 記事データを保存
  saveArticle: function(title, url, description, summary) {
    const sheet = this.getSheet('articles');
    const timestamp = new Date();
    const postedDate = Utilities.formatDate(timestamp, 'Asia/Tokyo', 'yyyy-MM-dd');
    
    sheet.appendRow([
      timestamp,
      title,
      url,
      description,
      summary,
      postedDate
    ]);
    
    console.log('Article saved:', title);
  },
  
  // URLで記事データを取得
  getArticleByUrl: function(url) {
    const sheet = this.getSheet('articles');
    const data = sheet.getDataRange().getValues();
    
    // ヘッダー行をスキップして検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === url) { // URL列
        return {
          timestamp: data[i][0],
          title: data[i][1],
          url: data[i][2],
          description: data[i][3],
          summary: data[i][4],
          postedDate: data[i][5]
        };
      }
    }
    
    return null;
  },
  
  // インタラクション履歴を記録
  logInteraction: function(type, userId, articleUrl, question = '', response = '', channel = '') {
    const sheet = this.getSheet('interactions');
    const timestamp = new Date();
    
    sheet.appendRow([
      timestamp,
      type,
      userId,
      articleUrl,
      question,
      response,
      channel
    ]);
    
    console.log('Interaction logged:', type, userId);
  },
  
  // 質問モードを設定
  setQuestionMode: function(channel, messageTs, articleUrl, userId) {
    const sheet = this.getSheet('question_modes');
    const timestamp = new Date();
    
    // 既存の質問モードを無効化
    this.deactivateQuestionMode(channel, messageTs);
    
    // 新しい質問モードを追加
    sheet.appendRow([
      channel,
      messageTs,
      articleUrl,
      userId,
      timestamp,
      true
    ]);
    
    console.log('Question mode set:', channel, messageTs);
  },
  
  // 質問モードを無効化
  deactivateQuestionMode: function(channel, messageTs) {
    const sheet = this.getSheet('question_modes');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === channel && data[i][1] === messageTs && data[i][5] === true) {
        sheet.getRange(i + 1, 6).setValue(false); // active列を無効化
        break;
      }
    }
  },
  
  // アクティブな質問モードを取得
  getActiveQuestionMode: function(channel, messageTs) {
    const sheet = this.getSheet('question_modes');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === channel && data[i][1] === messageTs && data[i][5] === true) {
        return {
          channel: data[i][0],
          messageTs: data[i][1],
          articleUrl: data[i][2],
          userId: data[i][3],
          createdAt: data[i][4],
          active: data[i][5]
        };
      }
    }
    
    return null;
  },
  
  // 統計データを取得
  getStats: function() {
    const articlesSheet = this.getSheet('articles');
    const interactionsSheet = this.getSheet('interactions');
    
    const articleCount = articlesSheet.getLastRow() - 1; // ヘッダー行を除く
    const interactionCount = interactionsSheet.getLastRow() - 1;
    
    return {
      totalArticles: articleCount,
      totalInteractions: interactionCount,
      lastUpdated: new Date()
    };
  },
  
  // 今日の記事を取得
  getTodayArticles: function() {
    const sheet = this.getSheet('articles');
    const data = sheet.getDataRange().getValues();
    const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    
    const todayArticles = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][5] === today) { // posted_date列
        todayArticles.push({
          timestamp: data[i][0],
          title: data[i][1],
          url: data[i][2],
          description: data[i][3],
          summary: data[i][4],
          postedDate: data[i][5]
        });
      }
    }
    
    return todayArticles;
  }
  
};