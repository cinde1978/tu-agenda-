import React, { useState } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed in standalone mode, or dismissed this session
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleTriggerInstall = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions fallback
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Discreet Banner */}
      <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-3 sm:px-4 py-2 border-b border-indigo-700/40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-blue-500/20 text-sky-300 shrink-0">
              <Smartphone className="w-4 h-4" />
            </span>
            <span className="truncate text-slate-200">
              <strong className="text-white font-semibold">Acceso Directo:</strong>{' '}
              Instala nuestra App en tu celular para un acceso más rápido
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerInstall}
              className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-lg text-[11px] shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar App</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              title="Cerrar sugerencia"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS & Browser Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Instalar en Pantalla de Inicio
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Tu Agenda Lista en tu celular o PC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="text-slate-700 font-medium">
                Sigue estos dos sencillos pasos para instalarla como una App nativa sin ocupar memoria:
              </p>

              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">En iPhone / iPad (Safari):</span>
                    <p className="text-[11px] text-slate-500">
                      Toca el botón <Share2 className="w-3.5 h-3.5 inline text-blue-600" /> <strong>Compartir</strong> en la barra inferior.
                    </p>
                    <span className="font-bold text-slate-900 mt-1 block">En Android / Chrome:</span>
                    <p className="text-[11px] text-slate-500">
                      Toca el menú de tres puntos (⋮) en la esquina superior.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">Selecciona:</span>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <PlusSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <strong>"Agregar a pantalla de inicio"</strong> o <strong>"Instalar App"</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 text-blue-900">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>¡Listo! Se abrirá a pantalla completa con acceso directo rápido.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
