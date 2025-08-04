// Slack Events API Handler for Vercel Functions
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    // URL Verification Challenge
    if (body.type === 'url_verification') {
      console.log('URL verification challenge:', body.challenge);
      return res.status(200).send(body.challenge);
    }
    
    // Event Callback処理
    if (body.type === 'event_callback') {
      console.log('Event received:', body.event);
      
      // ここで実際のイベント処理を行う
      // 今はログだけ出力してOKを返す
      
      return res.status(200).send('OK');
    }
    
    // その他のリクエスト
    return res.status(200).send('OK');
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}