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

def test_incremental_blocks(articles_summary, bot_token, channel, today):
    """段階的ブロック追加テスト - 1つずつブロックを追加して問題箇所を特定"""
    
    print("=== 段階的ブロック追加テスト開始 ===")
    
    # Slack Bot API設定
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json"
    }
    
    # Step 1: 最小限のheaderブロックのみでテスト
    print("Step 1: headerブロックのみテスト")
    basic_blocks = [
        {
            "type": "header", 
            "text": {
                "type": "plain_text",
                "text": f"🔥 {today} 技術記事TOP5 🔥"
            }
        }
    ]
    
    success = test_single_block_set(basic_blocks, url, headers, channel, today, "header only")
    if not success:
        return False
    
    # Step 2: header + 1記事のsectionブロック
    print("Step 2: header + 1記事sectionブロック")  
    if len(articles_summary) > 0:
        article = articles_summary[0]
        article_text = f"*1. {article['title']}*\n📝 {article['summary']}\n🔗 <{article['link']}|記事を読む>"
        
        print(f"記事テキスト長: {len(article_text)} 文字")
        print(f"記事タイトル: {article['title'][:50]}...")
        
        test_blocks = basic_blocks + [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn", 
                    "text": article_text
                }
            }
        ]
        
        success = test_single_block_set(test_blocks, url, headers, channel, today, "header + section")
        if not success:
            return False
    
    # Step 3: header + section + ボタン付きsection
    print("Step 3: header + section + ボタン付きsection")
    if len(articles_summary) > 0:
        article = articles_summary[0]
        
        # URLの長さチェック
        print(f"記事URL: {article['link']}")
        print(f"URL長: {len(article['link'])}")
        
        test_blocks = basic_blocks + [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*1. {article['title']}*\n📝 {article['summary']}\n🔗 <{article['link']}|記事を読む>"
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
        ]
        
        success = test_single_block_set(test_blocks, url, headers, channel, today, "section + button")
        if not success:
            return False
    
    # Step 4: actionsブロック追加テスト
    print("Step 4: actionsブロック追加テスト")
    if len(articles_summary) > 0:
        article = articles_summary[0]
        
        test_blocks = basic_blocks + [
            {
                "type": "section", 
                "text": {
                    "type": "mrkdwn",
                    "text": f"*1. {article['title']}*\n📝 {article['summary']}\n🔗 <{article['link']}|記事を読む>"
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
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "❓ 質問する"
                        },
                        "action_id": "ask_question", 
                        "value": f"question:{article['link']}"
                    }
                ]
            }
        ]
        
        success = test_single_block_set(test_blocks, url, headers, channel, today, "section + button + actions")
        if not success:
            return False
    
    print("=== 全ての段階的テスト成功 ===")
    return True

def test_single_block_set(blocks, url, headers, channel, today, test_name):
    """単一ブロックセットのテスト"""
    
    print(f"テスト実行: {test_name}")
    print(f"ブロック数: {len(blocks)}")
    
    # JSONサイズチェック
    import json
    blocks_json = json.dumps(blocks, ensure_ascii=False)
    print(f"ブロックJSON サイズ: {len(blocks_json)} 文字")
    
    payload = {
        "channel": channel,
        "blocks": blocks,
        "text": f"テスト: {test_name}"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print(f"レスポンス: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if result.get('ok'):
            print(f"✅ {test_name}: 成功")
            return True
        else:
            print(f"❌ {test_name}: 失敗 - {result.get('error')}")
            if 'error' in result and result['error'] == 'invalid_blocks':
                print("📝 invalid_blocks詳細:")
                print(f"   - リクエストペイロード: {json.dumps(payload, ensure_ascii=False, indent=2)}")
            return False
    
    except Exception as e:
        print(f"❌ {test_name}: 例外発生 - {e}")
        return False

def post_interactive_message(articles_summary):
    """Slack Bot APIを使ってInteractive Componentsつきメッセージを投稿（デバッグ強化版）"""
    bot_token = os.getenv('SLACK_BOT_TOKEN')
    
    if not bot_token:
        print("SLACK_BOT_TOKENが設定されていません")
        return False
    
    # チャンネル指定（環境変数から取得、デフォルトは#general）
    channel = os.getenv('SLACK_CHANNEL', '#general')
    
    # 今日の日付
    today = datetime.now().strftime("%Y年%m月%d日")
    
    print(f"デバッグ情報:")
    print(f"  チャンネル: {channel}")
    print(f"  記事数: {len(articles_summary)}")
    
    # デバッグモード環境変数チェック
    debug_mode = os.getenv('DEBUG_BLOCKS', 'false').lower() == 'true'
    
    if debug_mode:
        print("🔍 デバッグモード: 段階的ブロック追加テスト実行")
        return test_incremental_blocks(articles_summary, bot_token, channel, today)
    else:
        print("⚠️  通常モード: 全ブロック一括投稿（エラー詳細出力強化）")
        return post_full_message_with_debug(articles_summary, bot_token, channel, today)

def post_full_message_with_debug(articles_summary, bot_token, channel, today):
    """全ブロック一括投稿（エラー詳細出力強化版）"""
    
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
        print(f"記事{i}処理中:")
        print(f"  タイトル: {article['title'][:50]}...")
        print(f"  要約長: {len(article['summary'])} 文字")
        print(f"  URL: {article['link']}")
        
        # 記事情報セクション
        article_text = f"*{i}. {article['title']}*\n📝 {article['summary']}\n🔗 <{article['link']}|記事を読む>"
        
        # 文字数チェック
        if len(article_text) > 2950:  # 安全マージン
            print(f"  ⚠️  記事{i}: テキスト長すぎ ({len(article_text)} > 2950)")
            article_text = article_text[:2900] + "..."
        
        article_block = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": article_text
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
    
    print(f"構築完了: 総ブロック数 {len(blocks)}")
    
    # ブロック数チェック
    if len(blocks) > 20:
        print(f"⚠️  ブロック数超過: {len(blocks)} > 20")
    
    # JSON化してサイズチェック
    import json
    blocks_json = json.dumps(blocks, ensure_ascii=False)
    print(f"総JSON サイズ: {len(blocks_json)} 文字")
    
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
        print(f"Slack APIレスポンス: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if result.get('ok'):
            print("✅ Slack投稿成功")
            return True
        else:
            print(f"❌ Slack API エラー: {result.get('error')}")
            
            # 詳細エラー情報
            if 'response_metadata' in result:
                print(f"レスポンスメタデータ: {result['response_metadata']}")
            
            return False
    
    except Exception as e:
        print(f"❌ Slack投稿エラー: {e}")
        import traceback
        traceback.print_exc()
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