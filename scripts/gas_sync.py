#!/usr/bin/env python3
"""
GitHub ActionsからGASに記事データを同期するスクリプト
既存のtech_news_bot.pyと組み合わせて使用
"""

import os
import json
import requests
from datetime import datetime

def sync_articles_to_gas(articles, gas_webhook_url):
    """GASに記事データを同期"""
    
    if not gas_webhook_url:
        print("GAS_WEBHOOK_URLが設定されていません")
        return False
    
    # 記事データをGAS形式に変換
    formatted_articles = []
    for article in articles:
        formatted_articles.append({
            'title': article.get('title', ''),
            'url': article.get('link', ''),
            'description': article.get('description', ''),
            'summary': article.get('summary', '')
        })
    
    # GASに送信するペイロード
    payload = {
        'action': 'sync_articles',
        'articles': formatted_articles,
        'timestamp': datetime.now().isoformat(),
        'source': 'github_actions'
    }
    
    try:
        response = requests.post(
            gas_webhook_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        if result.get('success'):
            print(f"GAS同期成功: {result.get('synced', 0)}/{result.get('total', 0)}件")
            return True
        else:
            print(f"GAS同期エラー: {result.get('error', 'Unknown error')}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"GAS同期リクエストエラー: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"GAS応答JSON解析エラー: {e}")
        return False
    except Exception as e:
        print(f"GAS同期予期しないエラー: {e}")
        return False

def main():
    """メイン処理 - 既存のtech_news_bot.pyから呼び出される"""
    
    # 環境変数チェック
    gas_webhook_url = os.getenv('GAS_WEBHOOK_URL')
    
    if not gas_webhook_url:
        print("警告: GAS_WEBHOOK_URLが設定されていません。GAS同期をスキップします。")
        return
    
    # 既存のtech_news_bot.pyから記事データを取得
    # この部分は実際の実装時に調整が必要
    print("GAS同期スクリプトが実行されました")
    print(f"GAS Webhook URL: {gas_webhook_url[:50]}...")

if __name__ == "__main__":
    main()