/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle, LogOut, User as UserIcon, ArrowLeft, Key, Sun, Moon } from 'lucide-react';
import { getSupabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import Register from './Register';
import Dashboard from './Dashboard';
import Loader from './components/Loader';
import { AppSettingsProvider, useAppSettings } from './contexts/AppSettingsContext';
import { LanguageProvider, useLanguage, LanguageSelector } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [user, setUser] = useState<User| null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [configError, setConfigError] = useState<string | null>(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return 'missing_config';
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'invalid_url';
    }
    return null;
  });
  const [view, setView] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');

  useEffect(() => {
    const initSession = async () => {
      if (configError) {
        setIsInitializing(false);
        return;
      }
      try {
        const supabase = getSupabase();
        
        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user ?? null);
          if (event === 'PASSWORD_RECOVERY') {
            setView('reset_password');
            setError(null);
            setIsSuccess(false);
          }
        });

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        // Standard hash-based recovery link detection fallback
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
          setView('reset_password');
        }

        return () => subscription.unsubscribe();
      } catch (err: any) {
        console.error("Session initialization failed:", err);
        setConfigError(err.message || 'La configuration de Supabase est invalide.');
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur inattendue est survenue.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const supabase = getSupabase();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue lors de l\'envoi du mail de récupération.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setIsSuccess(true);
        // Déconnecter l'utilisateur pour qu'il se reconnecte proprement avec son nouveau mot de passe
        await supabase.auth.signOut();
        setTimeout(() => {
          setView('login');
          setIsSuccess(false);
          setEmail('');
          setPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }, 3000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue lors de la réinitialisation.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppSettingsProvider>
          <AppContent 
            user={user} 
            isInitializing={isInitializing} 
            configError={configError}
            onLogout={handleLogout} 
            view={view} 
            setView={setView} 
            email={email} 
            setEmail={setEmail} 
            password={password} 
            setPassword={setPassword} 
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            handleSubmit={handleSubmit} 
            handleForgotPassword={handleForgotPassword}
            handleResetPassword={handleResetPassword}
            isLoading={isLoading} 
            error={error} 
            setError={setError}
            isSuccess={isSuccess} 
            setIsSuccess={setIsSuccess}
          />
        </AppSettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent({ 
  onLogout, 
  user, 
  view, 
  setView, 
  email, 
  setEmail, 
  password, 
  setPassword, 
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleSubmit, 
  handleForgotPassword,
  handleResetPassword,
  isLoading, 
  error, 
  setError,
  isSuccess, 
  setIsSuccess,
  isInitializing,
  configError
}: any) {
  const { settings, isLoading: isSettingsLoading } = useAppSettings();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  if (configError) {
    const errorDetails = configError === 'missing_config' 
      ? t('supabaseError', 'missing_config')
      : configError === 'invalid_url'
      ? t('supabaseError', 'invalid_url', { url: import.meta.env.VITE_SUPABASE_URL || '' })
      : configError;

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white relative overflow-hidden">
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <LanguageSelector />
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-center p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all btn-premium cursor-pointer"
            title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <motion.div
                initial={{ rotate: -90, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                key="moon-icon"
              >
                <Moon size={16} className="text-[#794cff]" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ rotate: 90, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                key="sun-icon"
              >
                <Sun size={16} className="text-amber-500" />
              </motion.div>
            )}
          </button>
        </div>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[120px] rounded-full" />
        </div>
        <div className="w-full max-w-lg glass-card rounded-3xl border border-red-500/20 p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] z-10">
          <div className="flex items-center gap-3 text-red-500 mb-6 font-semibold text-lg">
            <AlertCircle size={24} />
            <span>{t('supabaseError', 'title')}</span>
          </div>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            {t('supabaseError', 'desc')}
          </p>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 mb-6 font-mono text-xs text-red-400 break-all whitespace-pre-wrap">
            {errorDetails}
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">{t('supabaseError', 'solution_title')}</h3>
          <ul className="text-xs text-zinc-400 space-y-3 mb-6 list-none pl-0">
            <li className="flex gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>{t('supabaseError', 'step_1')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>{t('supabaseError', 'step_2')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>{t('supabaseError', 'step_3')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>{t('supabaseError', 'step_4')}</span>
            </li>
          </ul>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition-colors border border-zinc-700 active:scale-95 duration-150"
          >
            {t('common', 'refresh')}
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing || isSettingsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm glass-card rounded-3xl border border-zinc-800 p-8 shadow-[0_0_50px_rgba(var(--brand-rgb),0.1)]">
          <Loader />
        </div>
      </div>
    );
  }

  if (user && view !== 'reset_password') {
    return <Dashboard user={user} onLogout={onLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden text-white">
      {/* Absolute top right language selector & theme toggle */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <LanguageSelector />
        <button 
          onClick={toggleTheme}
          className="flex items-center justify-center p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all btn-premium cursor-pointer"
          title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <motion.div
              initial={{ rotate: -90, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              key="moon-icon"
            >
              <Moon size={16} className="text-[#794cff]" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ rotate: 90, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              key="sun-icon"
            >
              <Sun size={16} className="text-amber-500" />
            </motion.div>
          )}
        </button>
      </div>

      {/* Background radial glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full flex justify-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`w-full ${view === 'register' ? 'max-w-md sm:max-w-2xl md:max-w-3xl' : 'max-w-md'}`}
          >
            <div className="glass-card card-premium rounded-2xl p-5 sm:p-8 md:p-10 border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
              {view === 'register' ? (
                <Register onBackToLogin={() => setView('login')} />
              ) : view === 'forgot_password' ? (
                <>
                  <div className="mb-10 text-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand/20 border border-brand/30 mb-4 text-brand"
                    >
                      <Key size={24} />
                    </motion.div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('forgotPassword', 'title')}</h1>
                    <p className="text-zinc-400 text-sm">
                      {t('forgotPassword', 'subtitle')}
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">
                        {t('common', 'email')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e: any) => setEmail(e.target.value)}
                          placeholder={t('forgotPassword', 'placeholder_email')}
                          className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all input-premium"
                          required
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
                        >
                          <AlertCircle size={18} className="shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      {isSuccess && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
                        >
                          <CheckCircle2 size={18} className="shrink-0" />
                          <span>{t('forgotPassword', 'success_msg')}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className="w-full group relative flex items-center justify-center py-3.5 px-4 rounded-xl bg-brand text-black font-bold text-sm tracking-wide hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-premium"
                    >
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span className="animate-pulse">{t('forgotPassword', 'loading_msg')}</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            {t('forgotPassword', 'btn_send')}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </form>

                  <p className="mt-8 text-center text-zinc-500 text-sm">
                    <button
                      onClick={() => {
                        setView('login');
                        setError(null);
                        setIsSuccess(false);
                      }}
                      type="button"
                      className="inline-flex items-center gap-2 text-white hover:text-brand font-semibold transition-colors btn-premium"
                    >
                      <ArrowLeft size={16} />
                      {t('forgotPassword', 'back_to_login')}
                    </button>
                  </p>
                </>
              ) : view === 'reset_password' ? (
                <>
                  <div className="mb-10 text-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand/20 border border-brand/30 mb-4 text-brand"
                    >
                      <Lock size={24} />
                    </motion.div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('resetPassword', 'title')}</h1>
                    <p className="text-zinc-400 text-sm">
                      {t('resetPassword', 'subtitle')}
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">
                        {t('resetPassword', 'new_password')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e: any) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all input-premium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">
                        {t('resetPassword', 'confirm_password')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e: any) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all input-premium"
                          required
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
                        >
                          <AlertCircle size={18} className="shrink-0" />
                          <span>{error === 'Les mots de passe ne correspondent pas.' ? t('resetPassword', 'error_mismatch') : error === 'Le mot de passe doit contenir au moins 6 caractères.' ? t('resetPassword', 'error_length') : error}</span>
                        </motion.div>
                      )}

                      {isSuccess && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
                        >
                          <CheckCircle2 size={18} className="shrink-0" />
                          <span>{t('resetPassword', 'success_msg')}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className="w-full group relative flex items-center justify-center py-3.5 px-4 rounded-xl bg-brand text-black font-bold text-sm tracking-wide hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-premium"
                    >
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span className="animate-pulse">{t('resetPassword', 'loading_msg')}</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            {t('resetPassword', 'btn_save')}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-10 text-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center justify-center w-48 h-16 mb-4 overflow-hidden"
                    >
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-5 h-5 bg-brand rounded-sm rotate-45" />
                      )}
                    </motion.div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('login', 'title')}</h1>
                    <p className="text-zinc-400 text-sm">
                      {t('login', 'subtitle', { siteName: settings.site_name })}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">
                        {t('common', 'email')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nom@exemple.com"
                          className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all input-premium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          {t('common', 'password')}
                        </label>
                        <button 
                          type="button" 
                          onClick={() => {
                            setView('forgot_password');
                            setError(null);
                            setIsSuccess(false);
                          }}
                          className="text-xs font-medium text-brand hover:text-brand transition-colors btn-premium"
                        >
                          {t('login', 'forgot_password')}
                        </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all input-premium"
                          required
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
                        >
                          <AlertCircle size={18} className="shrink-0" />
                          <span>{error === 'Une erreur inattendue est survenue.' ? t('login', 'error_general') : error}</span>
                        </motion.div>
                      )}

                      {isSuccess && !user && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
                        >
                          <CheckCircle2 size={18} className="shrink-0" />
                          <span>{t('login', 'success_msg')}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className="w-full group relative flex items-center justify-center py-3.5 px-4 rounded-xl bg-brand text-black font-bold text-sm tracking-wide hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-premium"
                    >
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span className="animate-pulse">{t('login', 'loading_msg')}</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            {t('login', 'btn_login')}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </form>

                  <p className="mt-8 text-center text-zinc-500 text-sm">
                    {t('login', 'no_account')}{' '}
                    <button 
                      onClick={() => setView('register')}
                      type="button" 
                      className="text-white hover:text-brand font-semibold underline underline-offset-4 transition-colors btn-premium"
                    >
                      {t('login', 'register_link')}
                    </button>
                  </p>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 opacity-40 grayscale grayscale-100">
              <span className="text-[10px] uppercase tracking-widest font-bold">{t('common', 'powered_by')}</span>
            </div>
          </motion.div>
      </div>
    </div>
  );
}
