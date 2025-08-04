const { WebClient } = require('@slack/web-api');

class SlackService {
  constructor() {
    // タイムアウトとリトライ設定を追加
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN, {
      timeout: 30000, // 30秒
      retryConfig: {
        retries: 2,
        factor: 2,
        randomize: true
      }
    });
  }

  // メッセージ情報を取得（fetch版）
  async getMessageInfo(channel, messageTs) {
    console.log('SlackService: Getting message info:', { channel, messageTs });
    
    // トークンの確認（最初の10文字のみ表示）
    const token = process.env.SLACK_BOT_TOKEN;
    console.log('SlackService: Token check:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    console.log('SlackService: Channel format:', channel, 'Type:', typeof channel);
    console.log('SlackService: Timestamp:', messageTs);
    
    try {
      console.log('SlackService: Making API call with fetch...');
      
      const url = new URL('https://slack.com/api/conversations.history');
      url.searchParams.append('channel', channel);
      url.searchParams.append('latest', messageTs);
      url.searchParams.append('limit', '1');
      url.searchParams.append('inclusive', 'true');
      
      console.log('SlackService: Full URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('SlackService: Response status:', response.status);
      console.log('SlackService: Response headers:', response.headers);
      
      const result = await response.json();
      console.log('SlackService: API response:', JSON.stringify(result, null, 2));

      if (result.ok && result.messages && result.messages.length > 0) {
        console.log('SlackService: Successfully retrieved message');
        return result.messages[0];
      }

      if (!result.ok) {
        console.error('SlackService: API Error:', result.error);
        console.error('SlackService: Error details:', {
          error: result.error,
          needed: result.needed,
          provided: result.provided,
          warning: result.warning
        });
      }

      console.error('Message not found or error occurred');
      return null;

    } catch (error) {
      console.error('Slack API Error (getMessageInfo):', error);
      console.error('Error stack:', error.stack);
      return null;
    }
  }

  // メッセージを投稿
  async postMessage(channel, text, threadTs = null) {
    try {
      const payload = {
        channel: channel,
        text: text,
        unfurl_links: false,
        unfurl_media: false
      };

      // スレッド返信の場合
      if (threadTs) {
        payload.thread_ts = threadTs;
      }

      const result = await this.client.chat.postMessage(payload);

      if (!result.ok) {
        console.error('Slack post error:', result.error);
        return false;
      }

      return result;

    } catch (error) {
      console.error('Slack post error:', error);
      return false;
    }
  }

  // リアクションを追加
  async addReaction(channel, messageTs, emoji) {
    try {
      const result = await this.client.reactions.add({
        channel: channel,
        timestamp: messageTs,
        name: emoji
      });

      if (!result.ok) {
        console.error('Slack reaction error:', result.error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Slack reaction error:', error);
      return false;
    }
  }

  // ユーザー情報を取得
  async getUserInfo(userId) {
    try {
      const result = await this.client.users.info({
        user: userId
      });

      if (result.ok) {
        return result.user;
      }

      console.error('User info error:', result);
      return null;

    } catch (error) {
      console.error('Slack user info error:', error);
      return null;
    }
  }

  // Slack Eventsの署名検証
  static verifySlackSignature(body, signature, timestamp) {
    // 実装は必要に応じて追加（現在は簡略化）
    // 本番環境では適切な署名検証を実装すること
    return true;
  }
}

module.exports = SlackService;