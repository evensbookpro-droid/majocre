import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Shield, ToggleLeft, ToggleRight, Eye, EyeOff, Check, AlertTriangle, Play, ShoppingBag, Coffee, Video, Wifi } from 'lucide-react';

interface VisaCardProps {
  userId: string;
  userName: string;
  language: 'fr' | 'es';
  isCardActivated: boolean;
  setIsCardActivated: (active: boolean) => void;
  isCardFrozen: boolean;
  setIsCardFrozen: (frozen: boolean) => void;
  cardSettings: {
    onlinePayments: boolean;
    atmWithdrawals: boolean;
    internationalPayments: boolean;
    contactless: boolean;
  };
  setCardSettings: React.Dispatch<React.SetStateAction<{
    onlinePayments: boolean;
    atmWithdrawals: boolean;
    internationalPayments: boolean;
    contactless: boolean;
  }>>;
  onLogSecurityEvent: (event: string, details: string, severity: 'info' | 'warning' | 'critical') => void;
}

export const VisaCardManager: React.FC<VisaCardProps> = ({
  userId,
  userName,
  language,
  isCardActivated,
  setIsCardActivated,
  isCardFrozen,
  setIsCardFrozen,
  cardSettings,
  setCardSettings,
  onLogSecurityEvent
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Generate a mock but realistic card number based on userId hash
  const getCardNumber = () => {
    return "4532 •••• •••• 9812";
  };
  const getFullCardNumber = () => {
    return "4532 8819 0928 9812";
  };
  const getCVV = () => "382";
  const getExpiry = () => "12/29";

  const t = (fr: string, es: string) => language === 'es' ? es : fr;

  const toggleActivation = () => {
    const newState = !isCardActivated;
    setIsCardActivated(newState);
    localStorage.setItem(`visa_card_active_${userId}`, String(newState));
    onLogSecurityEvent(
      newState ? "Carte Visa Activée" : "Carte Visa Désactivée",
      `L'utilisateur a ${newState ? 'activé' : 'désactivé'} sa carte Visa de crédit`,
      newState ? 'info' : 'warning'
    );
  };

  const toggleFreeze = () => {
    const newState = !isCardFrozen;
    setIsCardFrozen(newState);
    localStorage.setItem(`visa_card_frozen_${userId}`, String(newState));
    onLogSecurityEvent(
      newState ? "Carte Visa Gelée" : "Carte Visa Dégelée",
      `La carte Visa a été ${newState ? 'gelée' : 'débloquée'} par l'utilisateur`,
      newState ? 'warning' : 'info'
    );
  };

  const toggleSetting = (key: keyof typeof cardSettings, labelFr: string) => {
    if (!isCardActivated || isCardFrozen) return;
    setCardSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`visa_card_settings_${userId}`, JSON.stringify(updated));
      onLogSecurityEvent(
        "Paramètre de carte modifié",
        `Option '${labelFr}' mise à jour à ${updated[key] ? 'Activé' : 'Désactivé'}`,
        'info'
      );
      return updated;
    });
  };

  const mockTransactions = [
    { id: '1', merchant: 'Netflix', category: 'Loisirs', amount: -17.99, date: 'Aujourd\'hui', icon: Video, color: 'text-red-500 bg-red-500/10' },
    { id: '2', merchant: 'Starbucks Coffee', category: 'Restauration', amount: -6.80, date: 'Hier', icon: Coffee, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: '3', merchant: 'Amazon France', category: 'Shopping', amount: -54.90, date: '26 Juin 2026', icon: ShoppingBag, color: 'text-orange-500 bg-orange-500/10' },
    { id: '4', merchant: 'Remboursement Uber', category: 'Transport', amount: 15.00, date: '24 Juin 2026', icon: Play, color: 'text-purple-500 bg-purple-500/10' },
    { id: '5', merchant: 'Apple Services', category: 'Abonnements', amount: -9.99, date: '20 Juin 2026', icon: Wifi, color: 'text-zinc-300 bg-zinc-300/10' }
  ];

  return (
    <div className="space-y-8">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="text-[#794cff]" size={24} />
            <span>{t("Gestion de Carte VISA Premium", "Gestión de Tarjeta VISA Premium")}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {t("Gérez les limites de votre carte virtuelle en temps réel avec un contrôle instantané.", "Gestione los límites de su tarjeta virtual en tiempo real con control instantáneo.")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Visual Card & Quick actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Flipper container */}
          <div 
            className="relative w-full h-[240px] perspective-1000 cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-full h-full relative preserve-3d"
            >
              {/* Front side */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-[0_0_40px_rgba(121,76,255,0.15)] border border-white/10 bg-gradient-to-br from-[#12121a] via-[#1a1235] to-[#0d091a]">
                {/* Accent glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#794cff]/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#794cff]/10 rounded-full blur-2xl" />

                {/* Card header */}
                <div className="flex items-start justify-between z-10">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-brand-glow bg-brand/10 text-[#794cff] px-2.5 py-1 rounded-full border border-[#794cff]/20">
                      Virtual VISA Platinum
                    </span>
                  </div>
                  <div className="h-6 w-10 flex items-center justify-center">
                    <span className="text-sm italic font-extrabold text-white/40 tracking-wider">VISA</span>
                  </div>
                </div>

                {/* Card chip and NFC */}
                <div className="flex items-center gap-4 z-10 my-1">
                  <div className="w-10 h-8 rounded-md bg-gradient-to-r from-amber-200 to-yellow-500 opacity-80 shadow-inner" />
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-0.5 bg-white/20" />
                    <div className="w-6 h-0.5 bg-white/30" />
                    <div className="w-5 h-0.5 bg-white/20" />
                  </div>
                </div>

                {/* Card number */}
                <div className="z-10 py-1">
                  <p className="text-xl font-mono tracking-[0.25em] text-zinc-100 text-shadow-md">
                    {showDetails ? getFullCardNumber() : getCardNumber()}
                  </p>
                </div>

                {/* Card footer */}
                <div className="flex justify-between items-end z-10">
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-wider text-zinc-500">Cardholder Name</p>
                    <p className="text-xs font-medium font-mono text-zinc-200 uppercase tracking-wide truncate max-w-[180px]">
                      {userName}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-1 text-right">
                      <p className="text-[8px] uppercase tracking-wider text-zinc-500">Expiry</p>
                      <p className="text-xs font-mono font-medium text-zinc-200">{getExpiry()}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[8px] uppercase tracking-wider text-zinc-500">CVV</p>
                      <p className="text-xs font-mono font-medium text-zinc-200">{showDetails ? getCVV() : "•••"}</p>
                    </div>
                  </div>
                </div>

                {/* Overlay state overlay (Freeze / Disable) */}
                <AnimatePresence>
                  {!isCardActivated && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-2 p-4 text-center"
                    >
                      <AlertTriangle className="text-zinc-600" size={32} />
                      <p className="text-xs uppercase font-bold tracking-wider text-zinc-400">{t("Carte Désactivée", "Tarjeta Desactivada")}</p>
                      <p className="text-[10px] text-zinc-600 max-w-[180px]">{t("Activez-la ci-dessous pour l'utiliser", "Actívela abajo para usarla")}</p>
                    </motion.div>
                  )}
                  {isCardActivated && isCardFrozen && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#0c1020]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-2 p-4 text-center"
                    >
                      <Shield className="text-brand text-[#794cff] animate-pulse" size={32} />
                      <p className="text-xs uppercase font-bold tracking-wider text-[#794cff]">{t("Carte Gelée", "Tarjeta Congelada")}</p>
                      <p className="text-[10px] text-zinc-500 max-w-[180px]">{t("Débloquez-la pour autoriser les transactions", "Desbloquéela para permitir transacciones")}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Back side */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-[0_0_40px_rgba(121,76,255,0.15)] border border-white/10 bg-gradient-to-br from-[#0d091a] via-[#12121a] to-[#12121a] rotateY-180">
                <div className="w-full h-10 bg-zinc-950 -mx-6 mt-2 shrink-0" />
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-8 bg-zinc-800 rounded-lg flex items-center justify-end px-3 font-mono text-xs text-zinc-400 select-all">
                      {getFullCardNumber()}
                    </div>
                    <div className="w-14 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center font-mono text-xs text-amber-500 font-bold select-all">
                      {getCVV()}
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-600 leading-normal">
                    This electronic visa virtual card is registered under premium secure layers. Fraudulent attempts are actively tracked under fintech sandbox regulations.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-900 pt-2 shrink-0">
                  <span className="text-[8px] font-mono text-zinc-600">ISS-2026-FIBAN</span>
                  <span className="text-[9px] font-bold text-zinc-500 italic">VISA virtual</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick interaction control actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-300 transition-all active:scale-[0.98]"
            >
              {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{showDetails ? t("Masquer les codes", "Ocultar códigos") : t("Révéler les codes", "Revelar códigos")}</span>
            </button>
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-300 transition-all active:scale-[0.98]"
            >
              <span>{t("Retourner", "Voltear")}</span>
            </button>
          </div>
        </div>

        {/* Right column: Toggles & Settings & Security checks */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main states toggles card */}
          <div className="p-6 glass-card rounded-3xl border border-zinc-800/80 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              {t("Paramètres de sécurité instantanés", "Configuración de seguridad instantánea")}
            </h3>

            <div className="space-y-4">
              {/* Toggle Activation */}
              <div className="flex items-center justify-between p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/60 transition-all hover:bg-zinc-950/60">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border mt-0.5 ${isCardActivated ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{t("Activer la carte VISA", "Activar tarjeta VISA")}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{t("Autoriser ou interdire toutes les opérations", "Permitir o denegar todas las operaciones")}</p>
                  </div>
                </div>
                <button 
                  onClick={toggleActivation}
                  className={`text-[#794cff] focus:outline-none cursor-pointer transition-transform duration-200 active:scale-95`}
                >
                  {isCardActivated ? <ToggleRight size={36} className="text-[#794cff]" /> : <ToggleLeft size={36} className="text-zinc-700" />}
                </button>
              </div>

              {/* Toggle Freeze */}
              <div className="flex items-center justify-between p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/60 transition-all hover:bg-zinc-950/60">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border mt-0.5 ${isCardFrozen ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{t("Geler temporairement", "Congelar temporalmente")}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{t("Bloquer instantanément les paiements suspects", "Bloquear instantáneamente pagos sospechosos")}</p>
                  </div>
                </div>
                <button 
                  onClick={toggleFreeze}
                  disabled={!isCardActivated}
                  className={`focus:outline-none cursor-pointer transition-transform duration-200 active:scale-95 disabled:opacity-40`}
                >
                  {isCardFrozen ? <ToggleRight size={36} className="text-amber-500" /> : <ToggleLeft size={36} className="text-zinc-700" />}
                </button>
              </div>
            </div>
          </div>

          {/* Detailed limits and channels */}
          <div className="p-6 glass-card rounded-3xl border border-zinc-800/80 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              {t("Canaux de paiement autorisés", "Canales de pago permitidos")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Online payments */}
              <div 
                onClick={() => toggleSetting('onlinePayments', 'Paiements en ligne')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  !isCardActivated || isCardFrozen ? 'opacity-40 cursor-not-allowed' : ''
                } ${cardSettings.onlinePayments ? 'bg-brand/5 border-[#794cff]/30 text-white' : 'bg-zinc-950/30 border-zinc-900 text-zinc-500 hover:bg-zinc-950/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t("Internet", "Internet")}</span>
                  {cardSettings.onlinePayments && <Check size={14} className="text-[#794cff]" />}
                </div>
                <p className="text-xs font-semibold text-zinc-300">{t("Paiements en ligne & abonnements", "Pagos en línea y suscripciones")}</p>
              </div>

              {/* Contactless */}
              <div 
                onClick={() => toggleSetting('contactless', 'Sans contact')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  !isCardActivated || isCardFrozen ? 'opacity-40 cursor-not-allowed' : ''
                } ${cardSettings.contactless ? 'bg-brand/5 border-[#794cff]/30 text-white' : 'bg-zinc-950/30 border-zinc-900 text-zinc-500 hover:bg-zinc-950/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t("NFC", "NFC")}</span>
                  {cardSettings.contactless && <Check size={14} className="text-[#794cff]" />}
                </div>
                <p className="text-xs font-semibold text-zinc-300">{t("Sans contact & Apple/Google Pay", "Sin contacto y Apple/Google Pay")}</p>
              </div>

              {/* International */}
              <div 
                onClick={() => toggleSetting('internationalPayments', 'Paiements internationaux')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  !isCardActivated || isCardFrozen ? 'opacity-40 cursor-not-allowed' : ''
                } ${cardSettings.internationalPayments ? 'bg-brand/5 border-[#794cff]/30 text-white' : 'bg-zinc-950/30 border-zinc-900 text-zinc-500 hover:bg-zinc-950/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t("Monde", "Mundial")}</span>
                  {cardSettings.internationalPayments && <Check size={14} className="text-[#794cff]" />}
                </div>
                <p className="text-xs font-semibold text-zinc-300">{t("Transactions hors zone SEPA", "Transacciones fuera de zona SEPA")}</p>
              </div>

              {/* ATM withdrawals */}
              <div 
                onClick={() => toggleSetting('atmWithdrawals', 'Retraits distributeur')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  !isCardActivated || isCardFrozen ? 'opacity-40 cursor-not-allowed' : ''
                } ${cardSettings.atmWithdrawals ? 'bg-brand/5 border-[#794cff]/30 text-white' : 'bg-zinc-950/30 border-zinc-900 text-zinc-500 hover:bg-zinc-950/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t("DAB", "Cajero")}</span>
                  {cardSettings.atmWithdrawals && <Check size={14} className="text-[#794cff]" />}
                </div>
                <p className="text-xs font-semibold text-zinc-300">{t("Retraits d'espèces au guichet", "Retiro de efectivo en cajeros")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions History on Card */}
      <div className="p-6 glass-card rounded-3xl border border-zinc-800/80">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#794cff] rounded-full" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">
              {t("Historique des transactions carte", "Historial de transacciones de tarjeta")}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Live transactions tracker</span>
        </div>

        <div className="divide-y divide-zinc-900">
          {mockTransactions.map((tx) => {
            const IconComponent = tx.icon;
            return (
              <div key={tx.id} className="py-4 flex items-center justify-between group hover:bg-zinc-950/10 rounded-xl px-2 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800/80 ${tx.color}`}>
                    <IconComponent size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{tx.merchant}</p>
                    <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                      <span>{tx.category}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold font-mono ${tx.amount > 0 ? 'text-[#794cff]' : 'text-zinc-200'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                  </span>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest leading-none mt-1 font-mono">VISA Virtual</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
