/**
 * 既存システムとの連携用スクリプト
 * GitHub ActionsからGoogle Sheetsに記事データを同期
 */

// GitHub Actions から呼び出される記事同期API
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // 記事同期リクエストの場合
    if (payload.action === 'sync_articles') {
      return handleArticleSync(payload.articles);
    }
    
    // 通常のSlackイベント処理（既存のCode.gsを呼び出し）
    return handleSlackEvent(e);
    
  } catch (error) {
    console.error('doPost Error:', error);
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

// 記事同期処理
function handleArticleSync(articles) {
  try {
    let syncCount = 0;
    
    articles.forEach(article => {
      // 既存記事チェック
      const existing = DataService.getArticleByUrl(article.url);
      
      if (!existing) {
        // 新しい記事を保存
        DataService.saveArticle(
          article.title,
          article.url,
          article.description,
          article.summary
        );
        syncCount++;
      }
    });
    
    const response = {
      success: true,
      synced: syncCount,
      total: articles.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('Article sync completed:', response);
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Article sync error:', error);
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 手動テスト用関数
function testArticleSync() {
  const testArticles = [
    {
      title: "テスト記事1",
      url: "https://example.com/test1",
      description: "テスト記事の説明",
      summary: "テスト要約"
    },
    {
      title: "テスト記事2", 
      url: "https://example.com/test2",
      description: "テスト記事2の説明",
      summary: "テスト要約2"
    }
  ];
  
  const result = handleArticleSync(testArticles);
  console.log('Test result:', result.getContent());
}

// 統計情報を取得するAPI
function getStats() {
  try {
    const stats = DataService.getStats();
    const todayArticles = DataService.getTodayArticles();
    
    const response = {
      success: true,
      stats: stats,
      todayArticles: todayArticles,
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Stats error:', error);
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}