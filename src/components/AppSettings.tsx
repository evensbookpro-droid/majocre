import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, Loader2, Upload, Palette, Type, ShieldCheck, AlertCircle, Check, Mail, 
  Phone, CreditCard, FileText, Plus, Trash2, Eye, EyeOff, Settings2, Sparkles, 
  Calendar, CheckSquare, List, Compass, Database, KeySquare
} from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  DEFAULT_REGISTRATION_FIELDS, 
  parseRegistrationFields, 
  RegistrationField, 
  FieldType 
} from '../lib/registrationConfig';

interface AppSettingsProps {
  role?: string;
}

export default function AppSettings({ role }: AppSettingsProps) {
  const { settings, refreshSettings } = useAppSettings();
  const { t } = useLanguage();
  
  // Tab states
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'registration'>('general');
  
  // General branding states
  const [siteName, setSiteName] = useState(settings.site_name);
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondary_color);
  const [accentColor, setAccentColor] = useState(settings.accent_color);
  const [contactEmail, setContactEmail] = useState(settings.contact_email || '');
  const [contactPhone, setContactPhone] = useState(settings.contact_phone || '');
  const [bankInfo, setBankInfo] = useState(settings.bank_info || '');
  const [footerText, setFooterText] = useState(settings.footer_text || '');
  const [blockingThresholds, setBlockingThresholds] = useState(settings.blocking_thresholds || '89,99');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(settings.logo_url);
  
  // Registration form configuration states
  const [formFields, setFormFields] = useState<RegistrationField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  
  // New custom field form states
  const [newFieldId, setNewFieldId] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldLabelEs, setNewFieldLabelEs] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldPlaceholderEs, setNewFieldPlaceholderEs] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [formMigrationMissing, setFormMigrationMissing] = useState(false);

  const isAuthorized = role === 'superadmin';

  useEffect(() => {
    setSiteName(settings.site_name);
    setPrimaryColor(settings.primary_color);
    setSecondaryColor(settings.secondary_color);
    setAccentColor(settings.accent_color);
    setContactEmail(settings.contact_email || '');
    setContactPhone(settings.contact_phone || '');
    setBankInfo(settings.bank_info || '');
    setFooterText(settings.footer_text || '');
    setBlockingThresholds(settings.blocking_thresholds || '89,99');
    setLogoPreview(settings.logo_url);
    
    // Parse the registration fields
    const fields = parseRegistrationFields(settings.registration_form_config);
    setFormFields(fields);
  }, [settings]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
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
        blocking_thresholds: blockingThresholds,
      };

      // Set fallback cache values first to be safe
      localStorage.setItem('fallback_contact_email', contactEmail);
      localStorage.setItem('fallback_contact_phone', contactPhone);
      localStorage.setItem('fallback_bank_info', bankInfo);
      localStorage.setItem('fallback_footer_text', footerText);
      localStorage.setItem('fallback_blocking_thresholds', blockingThresholds);

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

  const handleSaveFormConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);
    try {
      const supabase = getSupabase();
      
      // Filter out invalid items and sort by order
      const cleanedFields = [...formFields].sort((a, b) => (a.order || 0) - (b.order || 0));
      const serialized = JSON.stringify(cleanedFields);

      // Save to localStorage as a fallback
      localStorage.setItem('fallback_registration_form_config', serialized);

      // Check if row exists in app_settings
      const { data: existingData } = await supabase
        .from('app_settings')
        .select('id')
        .single();

      let saveError = null;
      if (existingData) {
        const { error: updateError } = await supabase
          .from('app_settings')
          .update({ registration_form_config: serialized })
          .eq('id', existingData.id);
        if (updateError) saveError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert({ registration_form_config: serialized });
        if (insertError) saveError = insertError;
      }

      if (saveError) {
        console.warn("Database column 'registration_form_config' might be missing, using local fallback:", saveError);
        setFormMigrationMissing(true);
      } else {
        setFormMigrationMissing(false);
      }

      await refreshSettings();
      setStatus({ 
        type: 'success', 
        message: t('common', 'language') === 'es' 
          ? 'Formulario de registro guardado con éxito' 
          : 'Configuration du formulaire d\'inscription enregistrée avec succès' 
      });
    } catch (err: any) {
      console.error("Error saving form config:", err);
      setStatus({ type: 'error', message: err.message || "Erreur d'enregistrement" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewField = () => {
    if (!newFieldId.trim() || !newFieldLabel.trim()) {
      setStatus({ type: 'error', message: "Le nom interne et le libellé sont requis." });
      return;
    }

    const idSanitized = newFieldId.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (formFields.some(f => f.id === idSanitized)) {
      setStatus({ type: 'error', message: "Ce nom interne existe déjà." });
      return;
    }

    const newField: RegistrationField = {
      id: idSanitized,
      name: idSanitized,
      label: newFieldLabel.trim(),
      label_es: newFieldLabelEs.trim() || undefined,
      type: newFieldType,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder.trim() || undefined,
      placeholder_es: newFieldPlaceholderEs.trim() || undefined,
      visible: true,
      order: formFields.length + 1,
      options: ['select', 'radio', 'checkbox'].includes(newFieldType) ? newFieldOptions.trim() : undefined,
      is_custom: true
    };

    setFormFields([...formFields, newField]);
    
    // Reset states
    setNewFieldId('');
    setNewFieldLabel('');
    setNewFieldLabelEs('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldPlaceholder('');
    setNewFieldPlaceholderEs('');
    setNewFieldOptions('');
    setShowAddField(false);
    setStatus({ type: 'success', message: "Nouveau champ personnalisé ajouté à la liste temporaire. N'oubliez pas de sauvegarder pour appliquer les changements." });
  };

  const handleDeleteField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<RegistrationField>) => {
    setFormFields(formFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20 shadow-[0_0_20px_rgba(var(--brand-rgb),0.1)]">
            <ShieldCheck className="text-brand w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{t('appSettings', 'title')}</h1>
            <p className="text-zinc-500 text-sm">{t('appSettings', 'subtitle')}</p>
          </div>
        </div>

        {/* Status notification */}
        <AnimatePresence mode="wait">
          {status && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border ${
                status.type === 'success' 
                  ? 'bg-brand/10 border-brand/20 text-brand' 
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
            >
              {status.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-zinc-800 pb-px gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveSettingsTab('general');
            setStatus(null);
          }}
          className={`pb-4 px-2 text-sm font-bold tracking-wide transition-colors relative cursor-pointer flex items-center gap-2 ${
            activeSettingsTab === 'general' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Palette size={16} />
          <span>{t('common', 'language') === 'es' ? 'Configuración General' : 'Configuration Générale'}</span>
          {activeSettingsTab === 'general' && (
            <motion.div layoutId="activeSettingsTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSettingsTab('registration');
            setStatus(null);
          }}
          className={`pb-4 px-2 text-sm font-bold tracking-wide transition-colors relative cursor-pointer flex items-center gap-2 ${
            activeSettingsTab === 'registration' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings2 size={16} />
          <span>{t('common', 'language') === 'es' ? 'Formulario de Registro' : "Formulaire d'Inscription"}</span>
          {activeSettingsTab === 'registration' && (
            <motion.div layoutId="activeSettingsTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>
      </div>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {activeSettingsTab === 'general' ? (
          <motion.div
            key="general-branding-form"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSaveGeneral} className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <ShieldCheck size={12} className="text-brand" />
                        {t('common', 'language') === 'es' ? 'Límites de bloqueo de transferencias (%)' : 'Seuils de blocage des transferts (%)'}
                      </label>
                      <input 
                        type="text"
                        value={blockingThresholds}
                        onChange={(e) => setBlockingThresholds(e.target.value)}
                        placeholder="89,99"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium font-mono text-xs"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1 italic leading-relaxed">
                        {t('common', 'language') === 'es' 
                          ? 'Lista de porcentajes de progreso separados por comas donde los transferts se bloquean automáticamente (ej: 89,99).'
                          : 'Liste de pourcentages de progression séparés par des virgules où les transferts sont automatiquement bloqués (ex: 89,99).'}
                      </p>
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

              {/* General Save Button */}
              <div className="md:col-span-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand hover:opacity-90 disabled:opacity-50 text-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(var(--brand-rgb),0.5)] btn-premium cursor-pointer"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  <span>{t('appSettings', 'btn_save')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="registration-form-customizer"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Database Migration Check */}
            {formMigrationMissing && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-xs text-amber-200 flex flex-col gap-2">
                <p className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <span>⚠️</span> {t('common', 'language') === 'es' ? 'Migración de base de datos requerida' : 'Migration de base de données requise'}
                </p>
                <p>
                  {t('common', 'language') === 'es' 
                    ? 'La columna \'registration_form_config\' no existe aún en la tabla \'app_settings\'. La configuración se guardará temporalmente en el caché local hasta que se aplique la migración SQL.'
                    : 'La colonne \'registration_form_config\' n\'existe pas encore dans la table \'app_settings\'. Les changements seront stockés localement dans ce navigateur jusqu\'à ce que la migration SQL soit exécutée.'
                  }
                </p>
                <div className="mt-1 font-mono text-[10px] text-amber-400 bg-black/30 p-3 rounded-lg border border-amber-500/5 select-all overflow-x-auto whitespace-pre">
                  {`ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS registration_form_config TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.loan_requests ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;`}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Customizer Editor */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-brand" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {t('common', 'language') === 'es' ? 'Campos del Formulario' : 'Champs du Formulaire'}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowAddField(!showAddField)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-brand text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{t('common', 'language') === 'es' ? 'Crear Campo' : 'Créer un champ'}</span>
                  </button>
                </div>

                {/* Create Custom Field Inline Panel */}
                <AnimatePresence>
                  {showAddField && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="glass-card bg-brand/5 border border-brand/10 rounded-2xl p-6 space-y-4 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase mb-2">
                        <Sparkles size={14} />
                        <span>{t('common', 'language') === 'es' ? 'Nuevo Campo Personalizado' : 'Nouveau Champ Personnalisé'}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Nom interne (id unique)
                          </label>
                          <input
                            type="text"
                            value={newFieldId}
                            onChange={(e) => setNewFieldId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="ex: adresse_secours, civilite"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Type de champ
                          </label>
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          >
                            <option value="text">Texte libre (input)</option>
                            <option value="textarea">Zone de texte (textarea)</option>
                            <option value="number">Nombre (numeric)</option>
                            <option value="email">Adresse E-mail</option>
                            <option value="tel">Numéro de téléphone</option>
                            <option value="date">Date</option>
                            <option value="select">Liste déroulante (select)</option>
                            <option value="radio">Boutons Radio</option>
                            <option value="checkbox">Case à cocher (checkbox)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Libellé affiché (Français)
                          </label>
                          <input
                            type="text"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            placeholder="ex: Adresse de secours"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Libellé affiché (Espagnol)
                          </label>
                          <input
                            type="text"
                            value={newFieldLabelEs}
                            onChange={(e) => setNewFieldLabelEs(e.target.value)}
                            placeholder="ex: Dirección alternativa"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Placeholder (Français)
                          </label>
                          <input
                            type="text"
                            value={newFieldPlaceholder}
                            onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                            placeholder="Texte d'aide ou d'explication..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Placeholder (Espagnol)
                          </label>
                          <input
                            type="text"
                            value={newFieldPlaceholderEs}
                            onChange={(e) => setNewFieldPlaceholderEs(e.target.value)}
                            placeholder="Texto de ayuda..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>
                      </div>

                      {['select', 'radio', 'checkbox'].includes(newFieldType) && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            Options (séparées par des virgules)
                          </label>
                          <input
                            type="text"
                            value={newFieldOptions}
                            onChange={(e) => setNewFieldOptions(e.target.value)}
                            placeholder="ex: m:Monsieur,mme:Madame,autre:Autre"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-colors"
                          />
                          <p className="text-[9px] text-zinc-500">
                            Format : code:Libellé (ex: 12:12 Mois, 24:24 Mois) ou simplement des valeurs (ex: Paris, Lyon, Marseille).
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300">
                          <input
                            type="checkbox"
                            checked={newFieldRequired}
                            onChange={(e) => setNewFieldRequired(e.target.checked)}
                            className="rounded bg-zinc-900 border-zinc-800 text-brand focus:ring-brand"
                          />
                          <span>Rendre ce champ obligatoire</span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddField(false)}
                          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-400 cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleAddNewField}
                          className="px-4 py-2 rounded-xl bg-brand text-black font-bold text-xs cursor-pointer btn-premium"
                        >
                          Ajouter le champ
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fields List */}
                <div className="space-y-3">
                  {formFields.map((field, index) => (
                    <div 
                      key={field.id}
                      className={`p-5 glass-card rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        !field.visible ? 'opacity-40 bg-zinc-950/20' : ''
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {t('common', 'language') === 'es' ? (field.label_es || field.label) : field.label}
                          </span>
                          <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50">
                            {field.name}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            [{field.type}]
                          </span>
                          {field.is_custom && (
                            <span className="text-[8px] font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded">
                              Perso
                            </span>
                          )}
                        </div>

                        {/* Inline edits */}
                        <div className="space-y-3 mt-2 flex-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">Libellé (Français)</span>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-brand"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">Libellé (Espagnol)</span>
                              <input
                                type="text"
                                value={field.label_es || ''}
                                onChange={(e) => handleUpdateField(field.id, { label_es: e.target.value || undefined })}
                                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-brand"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">Placeholder (Français)</span>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value || undefined })}
                                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-brand"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">Placeholder (Espagnol)</span>
                              <input
                                type="text"
                                value={field.placeholder_es || ''}
                                onChange={(e) => handleUpdateField(field.id, { placeholder_es: e.target.value || undefined })}
                                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-brand"
                              />
                            </div>
                          </div>

                          {['select', 'radio', 'checkbox'].includes(field.type) && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">
                                Options de la liste (séparées par des virgules)
                              </span>
                              <input
                                type="text"
                                value={field.options || ''}
                                onChange={(e) => handleUpdateField(field.id, { options: e.target.value || undefined })}
                                placeholder="ex: 12:12 Mois, 24:24 Mois"
                                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-brand font-mono"
                              />
                              <p className="text-[8px] text-zinc-500 leading-normal">
                                Format : code:Libellé (ex: 6:6 Mois / 6 Meses, 12:12 Mois / 12 Meses) ou simplement des valeurs (ex: 0,1,2,3).
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Order Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Ordre</span>
                          <input
                            type="number"
                            value={field.order || 0}
                            onChange={(e) => handleUpdateField(field.id, { order: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-zinc-900 border border-zinc-800 text-center font-mono text-xs text-white rounded py-1"
                          />
                        </div>

                        {/* Visibility and requirement controls */}
                        <div className="flex items-center gap-3">
                          {/* Visibility button */}
                          <button
                            type="button"
                            title={field.visible ? "Masquer" : "Afficher"}
                            onClick={() => handleUpdateField(field.id, { visible: !field.visible })}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              field.visible ? 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800' : 'text-zinc-600 bg-zinc-950 border border-zinc-900/50'
                            }`}
                          >
                            {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>

                          {/* Requirement Toggle */}
                          <button
                            type="button"
                            title={field.required ? "Obligatoire" : "Facultatif"}
                            onClick={() => handleUpdateField(field.id, { required: !field.required })}
                            className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded border transition-all cursor-pointer ${
                              field.required 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {field.required ? 'Requis' : 'Optionnel'}
                          </button>

                          {/* Delete Custom field */}
                          {field.is_custom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteField(field.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Form Customization save button */}
                <button
                  type="button"
                  onClick={handleSaveFormConfig}
                  disabled={isLoading}
                  className="w-full bg-brand hover:opacity-90 disabled:opacity-50 text-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(var(--brand-rgb),0.5)] btn-premium cursor-pointer mt-6"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  <span>{t('common', 'language') === 'es' ? 'Guardar Formulario' : 'Enregistrer la Configuration'}</span>
                </button>
              </div>

              {/* Form Live Preview Sidebar (Right Column) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-brand" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Aperçu en Direct (Formulaire)
                  </span>
                </div>

                <div className="glass-card card-premium rounded-3xl p-6 border border-zinc-800 space-y-4 max-h-[600px] overflow-y-auto">
                  <p className="text-xs text-zinc-500 leading-relaxed italic border-b border-zinc-800 pb-2">
                    Ceci est l'ordre et le style d'affichage réel généré dynamiquement pour les futurs inscrits.
                  </p>

                  <div className="space-y-4">
                    {formFields
                      .filter(f => f.visible)
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          
                          {field.type === 'textarea' ? (
                            <textarea
                              disabled
                              placeholder={field.placeholder || "Saisissez votre réponse..."}
                              rows={2}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-400 focus:outline-none resize-none"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              disabled
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-400 focus:outline-none"
                            >
                              <option>{field.placeholder || "Sélectionnez une option..."}</option>
                              {field.options?.split(',').map((opt, oIdx) => {
                                const [val, lbl] = opt.split(':');
                                return <option key={oIdx}>{lbl || val}</option>;
                              })}
                            </select>
                          ) : field.type === 'file' ? (
                            <div className="flex items-center justify-center w-full h-16 border border-zinc-800 border-dashed rounded-xl bg-zinc-900/30">
                              <span className="text-[10px] text-zinc-500">{field.placeholder || "Glisser un fichier..."}</span>
                            </div>
                          ) : (
                            <input
                              type={field.type === 'password' ? 'password' : 'text'}
                              disabled
                              placeholder={field.placeholder || "Saisissez votre réponse..."}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-400 focus:outline-none"
                            />
                          )}
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
