#!/usr/bin/env python3
"""
技術記事要約Bot
はてブのテクノロジーカテゴリから人気記事TOP5を取得し、
Gemini APIで要約してSlackに投稿する
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

def send_to_slack(articles_summary):
    """Slackに記事要約を投稿"""
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    
    if not webhook_url:
        print("SLACK_WEBHOOK_URLが設定されていません")
        return False
    
    # Slackメッセージを構築
    today = datetime.now().strftime("%Y年%m月%d日")
    
    message = f"🔥 *{today} 技術記事要約* 🔥\n\n"
    
    for i, article in enumerate(articles_summary, 1):
        message += f"*{i}. {article['title']}*\n"
        message += f"📝 {article['summary']}\n"
        message += f"🔗 {article['link']}\n\n"
    
    message += "良い一日を！ 💪"
    
    payload = {
        "text": message,
        "username": "Tech News Bot",
        "icon_emoji": ":robot_face:"
    }
    
    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        print("Slack投稿成功")
        return True
    
    except Exception as e:
        print(f"Slack投稿エラー: {e}")
        return False

def main():
    """メイン処理"""
    print("技術記事要約Botを開始...")
    
    # 環境変数チェック
    if not os.getenv('GEMINI_API_KEY'):
        print("GEMINI_API_KEYが設定されていません")
        return
    
    if not os.getenv('SLACK_WEBHOOK_URL'):
        print("SLACK_WEBHOOK_URLが設定されていません")
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
            'link': article['link']
        })
    
    # Slack投稿
    print("Slackに投稿中...")
    success = send_to_slack(articles_summary)
    
    if success:
        print("技術記事要約Botが正常に完了しました！")
    else:
        print("Slack投稿に失敗しました")

if __name__ == "__main__":
    main()