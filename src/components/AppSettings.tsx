import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Loader2, Upload, Palette, Type, ShieldCheck, AlertCircle, Check, Mail, Phone, CreditCard, FileText } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AppSettingsProps {
  role?: string;
}

export default function AppSettings({ role }: AppSettingsProps) {
  const { settings, refreshSettings } = useAppSettings();
  const { t } = useLanguage();
  const [siteName, setSiteName] = useState(settings.site_name);
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondary_color);
  const [accentColor, setAccentColor] = useState(settings.accent_color);
  const [contactEmail, setContactEmail] = useState(settings.contact_email || '');
  const [contactPhone, setContactPhone] = useState(settings.contact_phone || '');
  const [bankInfo, setBankInfo] = useState(settings.bank_info || '');
  const [footerText, setFooterText] = useState(settings.footer_text || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(settings.logo_url);
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const isAuthorized = role === 'superadmin';

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 glass-card rounded-3xl border border-zinc-800">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="text-red-500 w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('appSettings', 'restricted_title')}</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">
            {t('appSettings', 'restricted_desc')}
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setSiteName(settings.site_name);
    setPrimaryColor(settings.primary_color);
    setSecondaryColor(settings.secondary_color);
    setAccentColor(settings.accent_color);
    setContactEmail(settings.contact_email || '');
    setContactPhone(settings.contact_phone || '');
    setBankInfo(settings.bank_info || '');
    setFooterText(settings.footer_text || '');
    setLogoPreview(settings.logo_url);
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double check role on save
    if (!isAuthorized) {
      setStatus({ type: 'error', message: t('appSettings', 'auth_error') });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const supabase = getSupabase();
      let logoUrl = settings.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('branding')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('branding')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrl;
      }

      // Check if row exists
      const { data: existingData } = await supabase
        .from('app_settings')
        .select('id')
        .single();

      const updateData = {
        site_name: siteName,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        bank_info: bankInfo,
        footer_text: footerText,
      };

      // Set fallback cache values first to be safe
      localStorage.setItem('fallback_contact_email', contactEmail);
      localStorage.setItem('fallback_contact_phone', contactPhone);
      localStorage.setItem('fallback_bank_info', bankInfo);
      localStorage.setItem('fallback_footer_text', footerText);

      let saveError = null;

      if (existingData) {
        const { error: updateError } = await supabase
          .from('app_settings')
          .update(updateData)
          .eq('id', existingData.id);
        if (updateError) {
          saveError = updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert(updateData);
        if (insertError) {
          saveError = insertError;
        }
      }

      // If we got an error, retry with only core settings
      if (saveError) {
        console.warn('Failed saving full settings, retrying with core settings only due to database schema cache limitations:', saveError);
        
        const coreUpdateData = {
          site_name: siteName,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
        };

        if (existingData) {
          const { error: fallbackUpdateError } = await supabase
            .from('app_settings')
            .update(coreUpdateData)
            .eq('id', existingData.id);
          if (fallbackUpdateError) throw fallbackUpdateError;
        } else {
          const { error: fallbackInsertError } = await supabase
            .from('app_settings')
            .insert(coreUpdateData);
          if (fallbackInsertError) throw fallbackInsertError;
        }
      }

      await refreshSettings();
      setStatus({ type: 'success', message: t('appSettings', 'save_success') });
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setStatus({ type: 'error', message: err.message || t('appSettings', 'save_error') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20 shadow-[0_0_20px_rgba(var(--brand-rgb),0.1)]">
          <ShieldCheck className="text-brand w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('appSettings', 'title')}</h1>
          <p className="text-zinc-500 text-sm">{t('appSettings', 'subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Info & Colors */}
        <div className="space-y-6">
          <div className="glass-card card-premium rounded-3xl p-8 border border-zinc-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Type className="text-brand w-5 h-5" />
              <h2 className="text-lg font-bold">{t('appSettings', 'identity_title')}</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">{t('appSettings', 'site_name_label')}</label>
              <input 
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Ex: SaaS Premium"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium"
                required
              />
            </div>
          </div>

          <div className="glass-card card-premium rounded-3xl p-8 border border-zinc-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Palette className="text-brand w-5 h-5" />
              <h2 className="text-lg font-bold">{t('appSettings', 'colors_title')}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t('appSettings', 'color_primary')}</label>
                <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <input 
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border-none p-0"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">{primaryColor}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t('appSettings', 'color_secondary')}</label>
                <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <input 
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border-none p-0"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">{secondaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t('appSettings', 'color_accent')}</label>
                <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <input 
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border-none p-0"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">{accentColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo Upload & Contact/Bank Info */}
        <div className="space-y-6">
          <div className="glass-card card-premium rounded-3xl p-8 border border-zinc-800 flex flex-col space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="text-brand w-5 h-5" />
              <h2 className="text-lg font-bold">{t('appSettings', 'logo_title')}</h2>
            </div>

            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50 hover:border-brand/30 transition-colors group relative min-h-[160px]">
              {logoPreview ? (
                <div className="relative group/logo">
                  <img src={logoPreview} alt="Site Logo" className="max-h-24 w-auto object-contain mb-4 rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <p className="text-[10px] font-bold uppercase">Changer</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="text-zinc-600 group-hover:text-brand transition-colors" />
                  </div>
                  <p className="text-sm text-zinc-500">{t('appSettings', 'logo_placeholder')}</p>
                </div>
              )}
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed text-center font-medium italic">
              {t('appSettings', 'logo_recommendation')}
            </p>
          </div>

          <div className="glass-card card-premium rounded-3xl p-8 border border-zinc-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="text-brand w-5 h-5" />
              <h2 className="text-lg font-bold">{t('appSettings', 'contact_title')}</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Mail size={12} className="text-brand" />
                  {t('appSettings', 'contact_email')}
                </label>
                <input 
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@premium-saas.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Phone size={12} className="text-brand" />
                  {t('appSettings', 'contact_phone')}
                </label>
                <input 
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <CreditCard size={12} className="text-brand" />
                  {t('appSettings', 'bank_info')}
                </label>
                <input 
                  type="text"
                  value={bankInfo}
                  onChange={(e) => setBankInfo(e.target.value)}
                  placeholder="FR76 3000..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <FileText size={12} className="text-brand" />
                  {t('appSettings', 'footer_text')}
                </label>
                <textarea 
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Copyright ©..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          {status && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl flex items-center gap-4 ${
                status.type === 'success' ? 'bg-brand/10 border border-brand/20 text-brand' : 'bg-red-500/10 border border-red-500/20 text-red-500'
              }`}
            >
              {status.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-bold">{status.message}</p>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand hover:opacity-90 disabled:opacity-50 text-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(var(--brand-rgb),0.5)] btn-premium"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {t('appSettings', 'btn_save')}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
