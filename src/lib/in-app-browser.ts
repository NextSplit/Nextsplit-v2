// BL-D3 — In-app browser detection.
//
// Instagram, Snapchat, Facebook, Gmail, TikTok all open links in their own
// embedded WebView (WKWebView on iOS, WebView on Android). These webviews
// have inconsistent navigator.share + navigator.canShare behaviour:
//   · Instagram iOS: navigator.share returns AbortError silently
//   · Instagram Android: works inconsistently; sometimes silent-no-op
//   · Gmail webview: navigator.share absent or unreliable
//   · TikTok webview: navigator.share works only for text, not files
//
// When we detect an in-app browser, we fall back to:
//   1. Show a "tap and hold the image to save" hint
//   2. Provide a long-press-friendly img tag
//   3. Offer a "Open in browser" link to escape the webview
//
// UA-sniffing is not perfect — the heuristics here cover the top-5
// problematic apps as of 2025. New apps that surface issues should be
// added to IN_APP_PATTERNS.

const IN_APP_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'instagram', re: /Instagram/i },
  { name: 'fbav',      re: /FBAV|FBAN/i },                  // Facebook
  { name: 'snapchat',  re: /Snapchat/i },
  { name: 'tiktok',    re: /(?:Bytedance|musical_ly|TikTok)/i },
  { name: 'gmail',     re: /GoogleApp\/|GSA\//i },          // Gmail / Google Search App
  { name: 'twitter',   re: /Twitter/i },
  { name: 'linkedin',  re: /LinkedInApp/i },
  // WKWebView (iOS) without Safari token usually means in-app — used as
  // a last-resort heuristic. Order matters: matches the named apps first.
  { name: 'wkwebview', re: /AppleWebKit(?!.*Safari)/i },
]

export interface InAppBrowserResult {
  isInApp:  boolean
  app:      string | null
}

export function detectInAppBrowser(ua?: string): InAppBrowserResult {
  if (typeof navigator === 'undefined' && !ua) return { isInApp: false, app: null }
  const userAgent = ua ?? navigator.userAgent ?? ''
  for (const pat of IN_APP_PATTERNS) {
    if (pat.re.test(userAgent)) return { isInApp: true, app: pat.name }
  }
  return { isInApp: false, app: null }
}

// Short helper used by share-card consumers — true when we should show the
// long-press fallback path instead of attempting navigator.share.
export function shouldUseLongPressFallback(): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return true
  return detectInAppBrowser().isInApp
}
