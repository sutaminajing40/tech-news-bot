const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  // 詳細要約を生成
  async generateDetailedSummary(articleData) {
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

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      if (response && response.text) {
        return response.text().trim();
      }

      console.error('Gemini API Error: No response text');
      return '詳細要約の生成に失敗しました。';

    } catch (error) {
      console.error('Gemini API Error (generateDetailedSummary):', error);
      return '詳細要約の生成でエラーが発生しました。';
    }
  }

  // 質問に回答
  async answerQuestion(articleData, question) {
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

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      if (response && response.text) {
        return response.text().trim();
      }

      console.error('Gemini API Error: No response text');
      return '回答の生成に失敗しました。';

    } catch (error) {
      console.error('Gemini API Error (answerQuestion):', error);
      return '回答の生成でエラーが発生しました。';
    }
  }

  // 記事要約（既存機能との互換性用）
  async summarizeArticle(title, description) {
    const prompt = `
以下の技術記事について、簡潔で分かりやすい要約を日本語で作成してください。
要約は2-3文程度で、技術者にとって有益な情報を含めてください。

タイトル: ${title}
説明: ${description}

要約:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      if (response && response.text) {
        return response.text().trim();
      }

      console.error('Gemini API Error: No response text');
      return '要約の生成に失敗しました。';

    } catch (error) {
      console.error('Gemini API Error (summarizeArticle):', error);
      return '要約の生成でエラーが発生しました。';
    }
  }
}

module.exports = GeminiService;