const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const dbPath = path.join(process.cwd(), 'data', 'bot.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        return reject(err);
      }
      
      console.log('Connected to SQLite database');
      
      // Create tables
      createTables()
        .then(() => resolve(db))
        .catch(reject);
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    // Articles table - 記事データ管理
    db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        description TEXT,
        summary TEXT,
        posted_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating articles table:', err);
        return reject(err);
      }

      // Interactions table - インタラクション履歴
      db.run(`
        CREATE TABLE IF NOT EXISTS interactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          user_id TEXT NOT NULL,
          article_url TEXT,
          question TEXT,
          response TEXT,
          channel TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating interactions table:', err);
          return reject(err);
        }

        // Processed events table - 重複防止用
        db.run(`
          CREATE TABLE IF NOT EXISTS processed_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_key TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating processed_events table:', err);
            return reject(err);
          }

          // Question modes table - 質問モード状態管理
          db.run(`
            CREATE TABLE IF NOT EXISTS question_modes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              channel TEXT NOT NULL,
              message_ts TEXT NOT NULL,
              article_url TEXT NOT NULL,
              user_id TEXT NOT NULL,
              active BOOLEAN DEFAULT TRUE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(channel, message_ts)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating question_modes table:', err);
              return reject(err);
            }

            // Create indexes
            createIndexes()
              .then(() => {
                console.log('Database tables initialized');
                resolve();
              })
              .catch(reject);
          });
        });
      });
    });
  });
}

function createIndexes() {
  return new Promise((resolve, reject) => {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)',
      'CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_interactions_article_url ON interactions(article_url)',
      'CREATE INDEX IF NOT EXISTS idx_processed_events_key ON processed_events(event_key)',
      'CREATE INDEX IF NOT EXISTS idx_question_modes_channel_ts ON question_modes(channel, message_ts)'
    ];

    let completed = 0;
    indexes.forEach(indexSql => {
      db.run(indexSql, (err) => {
        if (err) {
          console.error('Error creating index:', err);
          return reject(err);
        }
        completed++;
        if (completed === indexes.length) {
          resolve();
        }
      });
    });
  });
}

async function getDatabase() {
  if (!db) {
    return await initializeDatabase();
  }
  return db;
}

// Cleanup old processed events (older than 30 minutes)
function cleanupOldProcessedEvents() {
  return new Promise((resolve, reject) => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    db.run(`
      DELETE FROM processed_events 
      WHERE created_at < ?
    `, [thirtyMinutesAgo], function(err) {
      if (err) {
        console.error('Error cleaning up old events:', err);
        return reject(err);
      }
      
      console.log(`Cleaned up ${this.changes} old processed events`);
      resolve(this.changes);
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  cleanupOldProcessedEvents
};