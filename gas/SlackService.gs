/**
 * Slack API連携サービス
 */

const SlackService = {
  
  // メッセージ情報を取得
  getMessageInfo: function(channel, messageTs) {
    const config = getConfig();
    const url = 'https://slack.com/api/conversations.history';
    
    const params = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.slackBotToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const requestUrl = `${url}?channel=${channel}&latest=${messageTs}&limit=1&inclusive=true`;
    
    try {
      const response = UrlFetchApp.fetch(requestUrl, params);
      const data = JSON.parse(response.getContentText());
      
      if (data.ok && data.messages && data.messages.length > 0) {
        return data.messages[0];
      }
      
      console.error('Message not found:', data);
      return null;
      
    } catch (error) {
      console.error('Slack API Error:', error);
      return null;
    }
  },
  
  // メッセージを投稿
  postMessage: function(channel, text, threadTs = null) {
    const config = getConfig();
    const url = 'https://slack.com/api/chat.postMessage';
    
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
    
    const params = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.slackBotToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    try {
      const response = UrlFetchApp.fetch(url, params);
      const data = JSON.parse(response.getContentText());
      
      if (!data.ok) {
        console.error('Slack post error:', data.error);
        return false;
      }
      
      return data;
      
    } catch (error) {
      console.error('Slack post error:', error);
      return false;
    }
  },
  
  // リアクションを追加
  addReaction: function(channel, messageTs, emoji) {
    const config = getConfig();
    const url = 'https://slack.com/api/reactions.add';
    
    const payload = {
      channel: channel,
      timestamp: messageTs,
      name: emoji
    };
    
    const params = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.slackBotToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    try {
      const response = UrlFetchApp.fetch(url, params);
      const data = JSON.parse(response.getContentText());
      
      if (!data.ok) {
        console.error('Slack reaction error:', data.error);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Slack reaction error:', error);
      return false;
    }
  },
  
  // ユーザー情報を取得
  getUserInfo: function(userId) {
    const config = getConfig();
    const url = 'https://slack.com/api/users.info';
    
    const params = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.slackBotToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const requestUrl = `${url}?user=${userId}`;
    
    try {
      const response = UrlFetchApp.fetch(requestUrl, params);
      const data = JSON.parse(response.getContentText());
      
      if (data.ok) {
        return data.user;
      }
      
      console.error('User info error:', data);
      return null;
      
    } catch (error) {
      console.error('Slack user info error:', error);
      return null;
    }
  }
  
};