import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-app-ink text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl bg-app-purple-50 text-app-purple-700 border border-app-purple-200 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-app-purple-100 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Install on iOS
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0"
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-app-surface hover:bg-app-purple-50 transition-colors text-app-muted hover:text-app-purple-600"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="w-16 h-16 bg-app-purple-50 rounded-2xl flex items-center justify-center mb-6">
                  <Download className="w-8 h-8 text-app-purple-600" />
                </div>
                
                <h3 className="text-xl font-black text-app-ink mb-2">Install on iOS</h3>
                <p className="text-sm text-app-muted mb-6 leading-relaxed">
                  Install this app on your home screen for quick and easy access when you're on the go.
                </p>
                
                <div className="bg-app-surface border border-app-border rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-app-border shrink-0 font-bold text-sm">1</div>
                    <p className="text-sm">Tap the <strong className="font-bold text-app-ink inline-flex items-center gap-1"><Share className="w-4 h-4 text-blue-500" /> Share</strong> button in your Safari toolbar.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-app-border shrink-0 font-bold text-sm">2</div>
                    <p className="text-sm">Scroll down and select <strong className="font-bold text-app-ink">Add to Home Screen</strong>.</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full rounded-2xl bg-app-purple-600 py-4 text-sm font-bold text-white hover:bg-app-purple-700 transition-colors shadow-md active:scale-[0.98]"
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
