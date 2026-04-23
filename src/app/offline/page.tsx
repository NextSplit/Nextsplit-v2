export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Offline — NextSplit</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8f8f6;
            color: #111827;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
          }
          .icon {
            width: 80px;
            height: 80px;
            background: #CCFBF1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          h1 {
            font-size: 22px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }
          p {
            font-size: 15px;
            color: #6b7280;
            line-height: 1.5;
            max-width: 280px;
            margin: 0 auto 32px;
          }
          .btn {
            display: inline-block;
            background: var(--ns-forest);
            color: white;
            font-size: 15px;
            font-weight: 600;
            padding: 12px 28px;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            text-decoration: none;
            transition: opacity 0.15s;
          }
          .btn:active { opacity: 0.8; }
          .tip {
            margin-top: 32px;
            font-size: 13px;
            color: #9ca3af;
            max-width: 260px;
          }
        `}</style>
      </head>
      <body>
        <div className="icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ns-forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 6l5 6 4-4 4 6 4-4 5 6"/>
            <line x1="1" y1="1" y2="23" stroke="#ef4444" strokeWidth="2.5"/>
          </svg>
        </div>
        <h1>You're offline</h1>
        <p>No connection right now. Your cached sessions are still available once you navigate back.</p>
        <a href="/today" className="btn">Go to Today</a>
        <p className="tip">Tip: any sessions you've already viewed are cached and ready offline.</p>
      </body>
    </html>
  )
}
