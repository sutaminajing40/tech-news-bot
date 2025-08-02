/**
 * Gemini API連携サービス
 */

const GeminiService = {
  
  // 詳細要約を生成
  generateDetailedSummary: function(articleData) {
    const config = getConfig();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    const prompt = `
以下の技術記事について、詳細で実用的な要約を日本語で作成してください。

要約は以下の観点を含めてください：
- 記事の核心的な内容（3-4文）
- 技術者にとって重要なポイント
- 実装や導入時の注意点
- 関連技術や前提知識

記事情報：
タイトル: ${articleData.title}
説明: ${articleData.description || ''}
URL: ${articleData.url}

詳細要約:`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    };
    
    const params = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const requestUrl = `${url}?key=${config.geminiApiKey}`;
    
    try {
      const response = UrlFetchApp.fetch(requestUrl, params);
      const data = JSON.parse(response.getContentText());
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      
      console.error('Gemini API Error:', data);
      return '詳細要約の生成に失敗しました。';
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return '詳細要約の生成でエラーが発生しました。';
    }
  },
  
  // 質問に回答
  answerQuestion: function(articleData, question) {
    const config = getConfig();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    const prompt = `
以下の技術記事に関する質問に、正確で分かりやすく日本語で回答してください。

記事情報：
タイトル: ${articleData.title}
説明: ${articleData.description || ''}
URL: ${articleData.url}

質問: ${question}

回答は以下の形式で：
- 簡潔で正確な答え
- 必要に応じて追加の解説
- 関連する技術情報があれば補足

回答:`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    };
    
    const params = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const requestUrl = `${url}?key=${config.geminiApiKey}`;
    
    try {
      const response = UrlFetchApp.fetch(requestUrl, params);
      const data = JSON.parse(response.getContentText());
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      
      console.error('Gemini API Error:', data);
      return '回答の生成に失敗しました。';
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return '回答の生成でエラーが発生しました。';
    }
  },
  
  // 記事要約（既存機能との互換性用）
  summarizeArticle: function(title, description) {
    const config = getConfig();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    const prompt = `
以下の技術記事について、簡潔で分かりやすい要約を日本語で作成してください。
要約は2-3文程度で、技術者にとって有益な情報を含めてください。

タイトル: ${title}
説明: ${description}

要約:`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };
    
    const params = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const requestUrl = `${url}?key=${config.geminiApiKey}`;
    
    try {
      const response = UrlFetchApp.fetch(requestUrl, params);
      const data = JSON.parse(response.getContentText());
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      
      console.error('Gemini API Error:', data);
      return '要約の生成に失敗しました。';
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return '要約の生成でエラーが発生しました。';
    }
  }
  
};