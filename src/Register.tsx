import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock, Loader2, UserPlus, CheckCircle2, AlertCircle, ArrowLeft, 
  Phone, Coins, Clock, Calendar, User, Wallet, Users, FileUp, FileText, Sparkles 
} from 'lucide-react';
import { getSupabase } from './lib/supabase';
import { useAppSettings } from './contexts/AppSettingsContext';
import { useLanguage } from './contexts/LanguageContext';
import { parseRegistrationFields, RegistrationField } from './lib/registrationConfig';

interface RegisterProps {
  onBackToLogin: () => void;
}

export default function Register({ onBackToLogin }: RegisterProps) {
  const { settings } = useAppSettings();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formFields, setFormFields] = useState<RegistrationField[]>([]);

  // Parse and set dynamic fields and their initial state on mount/update
  useEffect(() => {
    const fields = parseRegistrationFields(settings.registration_form_config);
    setFormFields(fields);

    const initialData: Record<string, string> = {};
    fields.forEach(field => {
      if (field.type === 'select') {
        const firstOpt = field.options?.split(',')[0]?.split(':')[0] || '';
        initialData[field.id] = firstOpt;
      } else {
        initialData[field.id] = '';
      }
    });

    // Handle traditional defaults
    if (initialData['loanDuration'] === '') initialData['loanDuration'] = '12';
    if (initialData['loanRepaymentMethod'] === '') initialData['loanRepaymentMethod'] = 'monthly';
    if (initialData['dependents'] === '') initialData['dependents'] = '0';

    setFormData(prev => ({ ...initialData, ...prev }));
  }, [settings.registration_form_config]);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const getFieldIcon = (fieldId: string) => {
    switch (fieldId) {
      case 'firstName':
      case 'lastName':
        return <User size={16} />;
      case 'email':
        return <Mail size={16} />;
      case 'password':
        return <Lock size={16} />;
      case 'phone':
        return <Phone size={16} />;
      case 'loanAmount':
        return <Coins size={16} />;
      case 'loanDuration':
        return <Clock size={16} />;
      case 'loanRepaymentMethod':
        return <Calendar size={16} />;
      case 'monthlyIncome':
        return <Wallet size={16} />;
      case 'dependents':
        return <Users size={16} />;
      default:
        return <Sparkles size={16} className="text-brand/70" />;
    }
  };

  const getFieldOptions = (field: RegistrationField) => {
    if (!field.options) return [];
    return field.options.split(',').map(opt => {
      const parts = opt.split(':');
      const value = parts[0]?.trim();
      const label = parts[1]?.trim() || value;
      return { value, label };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const visibleFields = formFields.filter(f => f.visible);
    for (const field of visibleFields) {
      if (field.required) {
        if (field.type === 'file') {
          if (!file) {
            setError(t('register', 'error_file_missing') || "La pièce d'identité est obligatoire.");
            return;
          }
        } else {
          const val = formData[field.id];
          if (!val || val.trim() === '') {
            const labelStr = t('common', 'language') === 'es' ? (field.label_es || field.label) : field.label;
            setError(
              t('common', 'language') === 'es'
                ? `El campo "${labelStr}" es obligatorio.`
                : `Le champ "${labelStr}" est obligatoire.`
            );
            return;
          }
        }
      }
    }

    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const supabase = getSupabase();
      
      const email = formData['email'] || '';
      const password = formData['password'] || '';
      const firstName = formData['firstName'] || '';
      const lastName = formData['lastName'] || '';
      const phone = formData['phone'] || '';
      const full_name = `${firstName} ${lastName}`.trim();

      // Bundle custom fields to store as metadata
      const customFieldsValues: Record<string, any> = {};
      visibleFields.forEach(field => {
        if (field.is_custom) {
          customFieldsValues[field.id] = formData[field.id] || null;
        }
      });

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name,
            phone: phone,
            custom_fields: customFieldsValues
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = data.user;
      if (!user) {
        setError(t('register', 'error_user_info'));
        return;
      }

      let id_document_url = null;

      // Only upload the file if file field is visible and present
      const fileField = visibleFields.find(f => f.type === 'file');
      if (fileField && file) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          setError(t('register', 'error_storage') + uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        id_document_url = urlData.publicUrl;
      }

      // Insertion de la demande de prêt (support dual options if custom_fields fails)
      const loanPayload: Record<string, any> = {
        user_id: user.id,
        amount: Number(formData['loanAmount'] || 0),
        duration_months: Number(formData['loanDuration'] || 12),
        repayment_method: formData['loanRepaymentMethod'] || 'monthly',
        monthly_income: formData['monthlyIncome'] ? Number(formData['monthlyIncome']) : null,
        dependents: formData['dependents'] ? Number(formData['dependents']) : null,
        id_document_url: id_document_url,
        status: 'pending'
      };

      let loanError = null;

      try {
        const { error: insertError } = await supabase
          .from('loan_requests')
          .insert({
            ...loanPayload,
            custom_fields: customFieldsValues
          });
        if (insertError) {
          loanError = insertError;
        }
      } catch (err) {
        loanError = err;
      }

      // Retry without custom_fields column in case database has not been migrated yet
      if (loanError) {
        console.warn("Retrying loan_requests insertion without custom_fields column:", loanError);
        const { error: fallbackError } = await supabase
          .from('loan_requests')
          .insert(loanPayload);

        if (fallbackError) {
          setError(t('register', 'error_loan_request') + fallbackError.message);
          return;
        }
      }

      setIsSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group fields to keep standard layout elements nicely aligned (e.g. side-by-side)
  // Standard grouped rows:
  // - Row 1: firstName, lastName
  // - Row 2: email
  // - Row 3: password
  // - Row 4: phone, loanAmount
  // - Row 5: loanDuration, loanRepaymentMethod
  // - Row 6: monthlyIncome, dependents
  // - All other/custom fields: full-width stack

  const getResponsiveGridClass = (fieldId: string) => {
    const isTwin = ['firstName', 'lastName', 'phone', 'loanAmount', 'loanDuration', 'loanRepaymentMethod', 'monthlyIncome', 'dependents'].includes(fieldId);
    return isTwin ? 'col-span-1' : 'col-span-1 sm:col-span-2';
  };

  const visibleFields = formFields
    .filter(f => f.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      <div className="mb-8 text-center relative">
        <button 
          onClick={onBackToLogin}
          className="absolute left-0 top-0 text-zinc-500 hover:text-white transition-colors"
          title={t('register', 'back_tooltip')}
        >
          <ArrowLeft size={20} />
        </button>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-48 h-16 mb-4 overflow-hidden"
        >
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <UserPlus className="w-6 h-6 text-brand" />
          )}
        </motion.div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('register', 'title')}</h1>
        <p className="text-zinc-400 text-sm">
          {t('register', 'subtitle', { siteName: settings.site_name })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleFields.map((field) => {
            const hasSectionDivider = field.id === 'phone';
            
            return (
              <div key={field.id} className={`${getResponsiveGridClass(field.id)} space-y-1.5`}>
                {hasSectionDivider && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-zinc-800/80 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand/50">
                      {t('register', 'loan_details_title')}
                    </p>
                  </div>
                )}

                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                  {t('common', 'language') === 'es' ? (field.label_es || field.label) : field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'file' ? (
                  <div className="relative group">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-zinc-700 border-dashed rounded-xl cursor-pointer bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-brand/50 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FileUp className={`w-6 h-6 mb-2 ${file ? 'text-brand' : 'text-zinc-500'} group-hover:text-brand transition-colors`} />
                          <p className="text-[10px] text-zinc-500 group-hover:text-brand font-medium">
                            {file ? file.name : (t('common', 'language') === 'es' ? (field.placeholder_es || field.placeholder) : field.placeholder)}
                          </p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFile(e.target.files[0]);
                            }
                          }}
                          required={field.required && !file}
                        />
                      </label>
                    </div>
                  </div>
                ) : field.type === 'select' ? (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                      {getFieldIcon(field.id)}
                    </div>
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 text-white rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium appearance-none"
                      required={field.required}
                    >
                      {getFieldOptions(field).map((opt, oIdx) => (
                        <option key={oIdx} value={opt.value} className="bg-zinc-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : field.type === 'textarea' ? (
                  <div className="relative group">
                    <textarea
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={t('common', 'language') === 'es' ? (field.placeholder_es || field.placeholder) : field.placeholder}
                      rows={3}
                      className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium resize-none"
                      required={field.required}
                    />
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      id={`chk-${field.id}`}
                      checked={formData[field.id] === 'true'}
                      onChange={(e) => handleInputChange(field.id, e.target.checked ? 'true' : 'false')}
                      className="rounded bg-zinc-800 border-zinc-700 text-brand focus:ring-brand"
                      required={field.required}
                    />
                    <label htmlFor={`chk-${field.id}`} className="text-xs text-zinc-300 cursor-pointer">
                      {t('common', 'language') === 'es' ? (field.placeholder_es || field.placeholder) : field.placeholder}
                    </label>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                      {getFieldIcon(field.id)}
                    </div>
                    <input
                      type={field.id === 'password' ? 'password' : field.type}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={t('common', 'language') === 'es' ? (field.placeholder_es || field.placeholder) : field.placeholder}
                      className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
                      required={field.required}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
              <span>{t('register', 'success_msg')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isLoading || isSuccess}
          className="w-full group relative flex items-center justify-center py-3.5 px-4 rounded-xl bg-brand text-black font-bold text-sm tracking-wide hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-premium cursor-pointer"
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading-register"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span className="animate-pulse tracking-wide">{t('register', 'loading_msg')}</span>
              </motion.div>
            ) : (
              <motion.div
                key="default-register"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <span>{t('register', 'btn_register')}</span>
                <UserPlus size={18} className="group-hover:translate-x-1 transition-transform" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </form>

      <p className="text-center text-zinc-500 text-sm mt-6">
        {t('register', 'has_account')}{' '}
        <button 
          onClick={onBackToLogin}
          type="button" 
          className="text-white hover:text-brand font-semibold underline underline-offset-4 transition-colors cursor-pointer"
        >
          {t('register', 'login_link')}
        </button>
      </p>
    </div>
  );
}
