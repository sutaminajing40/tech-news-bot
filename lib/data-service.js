const { getDatabase, cleanupOldProcessedEvents } = require('./db');

class DataService {
  constructor() {
    this.db = null;
    this.initDb();
  }

  async initDb() {
    this.db = await getDatabase();
  }

  async ensureDb() {
    if (!this.db) {
      await this.initDb();
    }
    return this.db;
  }

  // 記事データを保存
  async saveArticle(title, url, description, summary) {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      db.run(`
        INSERT OR REPLACE INTO articles (title, url, description, summary, posted_date)
        VALUES (?, ?, ?, ?, ?)
      `, [title, url, description, summary, today], function(err) {
        if (err) {
          console.error('Error saving article:', err);
          return reject(err);
        }
        console.log('Article saved:', title);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // URLで記事データを取得
  async getArticleByUrl(url) {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM articles WHERE url = ?
      `, [url], (err, row) => {
        if (err) {
          console.error('Error getting article by URL:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
  }

  // インタラクション履歴を記録
  async logInteraction(type, userId, articleUrl = '', question = '', response = '', channel = '') {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO interactions (type, user_id, article_url, question, response, channel)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [type, userId, articleUrl, question, response, channel], function(err) {
        if (err) {
          console.error('Error logging interaction:', err);
          return reject(err);
        }
        console.log('Interaction logged:', type, userId);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // 処理済みイベントをチェック
  async checkProcessedEvent(eventKey) {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM processed_events WHERE event_key = ?
      `, [eventKey], (err, row) => {
        if (err) {
          console.error('Error checking processed event:', err);
          resolve(false);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  // イベントを処理済みとしてマーク
  async markEventProcessed(eventKey) {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO processed_events (event_key)
        VALUES (?)
      `, [eventKey], function(err) {
        if (err) {
          console.error('Error marking event as processed:', err);
          return reject(err);
        }
        
        // 古いイベントをクリーンアップ（非同期）
        cleanupOldProcessedEvents().catch(console.error);
        
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // 質問モードを設定
  async setQuestionMode(channel, messageTs, articleUrl, userId) {
    const db = await this.ensureDb();
    
    // 既存の質問モードを無効化
    await this.deactivateQuestionMode(channel, messageTs);

    // 新しい質問モードを追加
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO question_modes (channel, message_ts, article_url, user_id, active)
        VALUES (?, ?, ?, ?, 1)
      `, [channel, messageTs, articleUrl, userId], function(err) {
        if (err) {
          console.error('Error setting question mode:', err);
          return reject(err);
        }
        console.log('Question mode set:', channel, messageTs);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // 質問モードを無効化
  async deactivateQuestionMode(channel, messageTs) {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE question_modes
        SET active = 0
        WHERE channel = ? AND message_ts = ? AND active = 1
      `, [channel, messageTs], function(err) {
        if (err) {
          console.error('Error deactivating question mode:', err);
          resolve(null);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // アクティブな質問モードを取得
  async getActiveQuestionMode(channel, messageTs) {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM question_modes
        WHERE channel = ? AND message_ts = ? AND active = 1
        ORDER BY created_at DESC
        LIMIT 1
      `, [channel, messageTs], (err, row) => {
        if (err) {
          console.error('Error getting active question mode:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 統計データを取得
  async getStats() {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM articles', (err, articlesRow) => {
        if (err) {
          console.error('Error getting article stats:', err);
          return resolve({
            totalArticles: 0,
            totalInteractions: 0,
            lastUpdated: new Date()
          });
        }
        
        db.get('SELECT COUNT(*) as count FROM interactions', (err, interactionsRow) => {
          if (err) {
            console.error('Error getting interaction stats:', err);
            return resolve({
              totalArticles: articlesRow.count,
              totalInteractions: 0,
              lastUpdated: new Date()
            });
          }
          
          resolve({
            totalArticles: articlesRow.count,
            totalInteractions: interactionsRow.count,
            lastUpdated: new Date()
          });
        });
      });
    });
  }

  // 今日の記事を取得
  async getTodayArticles() {
    const db = await this.ensureDb();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM articles
        WHERE posted_date = ?
        ORDER BY created_at DESC
      `, [today], (err, rows) => {
        if (err) {
          console.error('Error getting today articles:', err);
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = DataService;