const { WebClient } = require('@slack/web-api');

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  // メッセージ情報を取得
  async getMessageInfo(channel, messageTs) {
    try {
      const result = await this.client.conversations.history({
        channel: channel,
        latest: messageTs,
        limit: 1,
        inclusive: true
      });

      if (result.ok && result.messages && result.messages.length > 0) {
        return result.messages[0];
      }

      console.error('Message not found:', result);
      return null;

    } catch (error) {
      console.error('Slack API Error (getMessageInfo):', error);
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