#!/usr/bin/env python3
"""
技術記事要約Bot v2.0
はてブのテクノロジーカテゴリから人気記事TOP5を取得し、
Gemini APIで要約してSlackに投稿する（Interactive Components対応）
"""

import os
import json
import requests
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# .envファイル読み込み
load_dotenv()

def get_hatena_tech_articles():
    """はてなブックマークのテクノロジーカテゴリから人気記事を取得"""
    url = "https://b.hatena.ne.jp/hotentry/it.rss"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        import html
        
        # RDF形式のRSS解析
        items = []
        lines = response.text.split('\n')
        
        current_item = {}
        in_item = False
        
        for line in lines:
            line = line.strip()
            
            if '<item ' in line and 'rdf:about=' in line:
                in_item = True
                current_item = {}
            elif '</item>' in line:
                if current_item and len(items) < 5:
                    items.append(current_item)
                in_item = False
                current_item = {}
            elif in_item:
                if '<title>' in line:
                    title = line.replace('<title>', '').replace('</title>', '').strip()
                    # HTMLエンティティをデコード
                    title = html.unescape(title)
                    current_item['title'] = title
                elif '<link>' in line:
                    link = line.replace('<link>', '').replace('</link>', '').strip()
                    current_item['link'] = link
                elif '<description>' in line:
                    desc = line.replace('<description>', '').replace('</description>', '').strip()
                    # HTMLエンティティをデコード
                    desc = html.unescape(desc)
                    current_item['description'] = desc
        
        return items[:5]
    
    except Exception as e:
        print(f"はてブ記事取得エラー: {e}")
        return []

def summarize_with_gemini(title, description):
    """Gemini APIを使って記事を要約"""
    try:
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
以下の技術記事について、簡潔で分かりやすい要約を日本語で作成してください。
要約は2-3文程度で、技術者にとって有益な情報を含めてください。

タイトル: {title}
説明: {description}

要約:
"""
        
        response = model.generate_content(prompt)
        return response.text.strip()
    
    except Exception as e:
        print(f"Gemini要約エラー: {e}")
        return "要約の生成に失敗しました。"

def post_interactive_message(articles_summary):
    """Slack Bot APIを使ってInteractive Componentsつきメッセージを投稿"""
    bot_token = os.getenv('SLACK_BOT_TOKEN')
    
    if not bot_token:
        print("SLACK_BOT_TOKENが設定されていません")
        return False
    
    # チャンネル指定（環境変数から取得、デフォルトは#general）
    channel = os.getenv('SLACK_CHANNEL', '#general')
    
    # 今日の日付
    today = datetime.now().strftime("%Y年%m月%d日")
    
    # Block Kit形式のメッセージ構築
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🔥 {today} 技術記事TOP5 🔥"
            }
        }
    ]
    
    # 各記事のブロックを追加
    for i, article in enumerate(articles_summary, 1):
        # 記事情報セクション
        article_block = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*{i}. {article['title']}*\n📝 {article['summary']}\n🔗 <{article['link']}|記事を読む>"
            },
            "accessory": {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "📚 詳細要約"
                },
                "style": "primary",
                "action_id": "detail_summary",
                "value": f"detail:{article['link']}"
            }
        }
        
        # 質問ボタン
        question_actions = {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "❓ 質問する"
                    },
                    "style": "secondary", 
                    "action_id": "ask_question",
                    "value": f"question:{article['link']}"
                }
            ]
        }
        
        blocks.extend([article_block, question_actions])
        
        # 記事間の区切り線（最後以外）
        if i < len(articles_summary):
            blocks.append({"type": "divider"})
    
    # フッター
    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": "💪 良い一日を！ | Tech News Bot v2.0"
            }
        ]
    })
    
    # Slack Bot APIに投稿
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "channel": channel,
        "blocks": blocks,
        "text": f"{today} 技術記事TOP5"  # fallback text
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        if result.get('ok'):
            print("Slack投稿成功")
            return True
        else:
            print(f"Slack API エラー: {result.get('error')}")
            return False
    
    except Exception as e:
        print(f"Slack投稿エラー: {e}")
        return False

def main():
    """メイン処理"""
    print("技術記事要約Bot v2.0を開始...")
    
    # 環境変数チェック
    if not os.getenv('GEMINI_API_KEY'):
        print("GEMINI_API_KEYが設定されていません")
        return
    
    if not os.getenv('SLACK_BOT_TOKEN'):
        print("SLACK_BOT_TOKENが設定されていません")
        return
    
    # 記事取得
    print("はてブから記事を取得中...")
    articles = get_hatena_tech_articles()
    
    if not articles:
        print("記事の取得に失敗しました")
        return
    
    print(f"{len(articles)}件の記事を取得しました")
    
    # 要約生成
    articles_summary = []
    for i, article in enumerate(articles, 1):
        print(f"記事{i}を要約中: {article['title']}")
        summary = summarize_with_gemini(article['title'], article.get('description', ''))
        
        articles_summary.append({
            'title': article['title'],
            'summary': summary,
            'link': article['link'],
            'description': article.get('description', '')
        })
    
    # Slack投稿（Interactive Components付き）
    print("Slackに投稿中...")
    success = post_interactive_message(articles_summary)
    
    if success:
        print("技術記事要約Bot v2.0が正常に完了しました！")
    else:
        print("Slack投稿に失敗しました")

if __name__ == "__main__":
    main()