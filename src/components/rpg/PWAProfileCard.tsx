'use client'

import { useState, useEffect } from 'react'

// Module-level PWA install prompt event
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _installPrompt: any = null

function PWAProfileCard() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsInstalled(standalone || iosStandalone)
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))
  }, [])

  async function handleInstall() {
    if (!_installPrompt) return
    setInstalling(true)
    try {
      await _installPrompt.prompt()
      const { outcome } = await _installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        _installPrompt = null
      }
    } finally {
      setInstalling(false)
    }
  }

  if (isInstalled || installed) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <span className="text-[22px]">📱</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">App installed</p>
            <p className="text-xs text-gray-400 mt-0.5">Running in standalone mode</p>
          </div>
          <span className="ml-auto text-[#0D9488] text-lg">✓</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <span className="text-[22px]">📲</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Install app</p>
          <p className="text-xs text-gray-400 mt-0.5">Add to your home screen</p>
        </div>
        {isIOS ? (
          <button
            onClick={() => setShowIOSSteps(s => !s)}
            className="bg-[#0D9488] text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            How to
          </button>
        ) : (
          <button
            onClick={handleInstall}
            disabled={installing || !_installPrompt}
            className={`text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50 ${_installPrompt ? 'bg-[#0D9488]' : 'bg-gray-400'}`}
          >
            {installing ? 'Installing…' : _installPrompt ? 'Install' : 'Open in Chrome'}
          </button>
        )}
      </div>
      {!isIOS && !_installPrompt && (
        <p className="mt-2 text-xs text-gray-400 leading-relaxed">
          Use Chrome&apos;s menu (⋮) → &quot;Add to Home screen&quot; to install.
        </p>
      )}
      {showIOSSteps && (
        <div className="mt-3 px-3 py-2.5 bg-teal-50 rounded-xl border border-teal-100 text-xs text-teal-700 leading-relaxed">
          1. Tap the <strong>Share ↑</strong> button in Safari<br />
          2. Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong><br />
          3. Tap <strong>Add</strong> to confirm
        </div>
      )}
    </div>
  )
}


export default PWAProfileCard
