import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, UserPlus, CheckCircle2, AlertCircle, ArrowLeft, Phone, Coins, Clock, Calendar, User, Wallet, Users, FileUp } from 'lucide-react';
import { getSupabase } from './lib/supabase';
import { useAppSettings } from './contexts/AppSettingsContext';
import { useLanguage } from './contexts/LanguageContext';

interface RegisterProps {
  onBackToLogin: () => void;
}

export default function Register({ onBackToLogin }: RegisterProps) {
  const { settings } = useAppSettings();
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDuration, setLoanDuration] = useState('12');
  const [loanRepaymentMethod, setLoanRepaymentMethod] = useState('monthly');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [dependents, setDependents] = useState('0');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError(t('register', 'error_file_missing'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const supabase = getSupabase();
      const full_name = `${firstName} ${lastName}`.trim();
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name,
            phone: phone
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

      // Upload du document d'identité
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      console.log("FILE READY FOR UPLOAD:", file, "PATH:", filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      console.log("UPLOAD RESULT:", uploadData, uploadError);

      if (uploadError) {
        setError(t('register', 'error_storage') + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      const id_document_url = urlData.publicUrl;

      // Insertion de la demande de prêt
      const { error: loanError } = await supabase
        .from('loan_requests')
        .insert({
          user_id: user.id,
          amount: Number(loanAmount),
          duration_months: Number(loanDuration),
          repayment_method: loanRepaymentMethod,
          monthly_income: Number(monthlyIncome),
          dependents: Number(dependents),
          id_document_url: id_document_url,
          status: 'pending'
        });

      if (loanError) {
        console.error("Loan Request Insert Error:", loanError);
        setError(t('register', 'error_loan_request') + loanError.message);
        return;
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
              {t('register', 'first_name')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                <User size={16} />
              </div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('register', 'placeholder_first_name')}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
              {t('register', 'last_name')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                <User size={16} />
              </div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('register', 'placeholder_last_name')}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
            {t('common', 'email')}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('register', 'placeholder_email')}
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
            {t('common', 'password')}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
              <Lock size={16} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
              required
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand/50 mb-4 ml-1">{t('register', 'loan_details_title')}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                {t('register', 'phone')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('register', 'placeholder_phone')}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                {t('register', 'loan_amount')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                  <Coins size={16} />
                </div>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder={t('register', 'placeholder_amount')}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                {t('register', 'duration')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                  <Clock size={16} />
                </div>
                <select
                  value={loanDuration}
                  onChange={(e) => setLoanDuration(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium appearance-none"
                  required
                >
                  <option value="6">{t('register', 'months_6')}</option>
                  <option value="12">{t('register', 'months_12')}</option>
                  <option value="24">{t('register', 'months_24')}</option>
                  <option value="36">{t('register', 'months_36')}</option>
                  <option value="48">{t('register', 'months_48')}</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                {t('register', 'repayment_method')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                  <Calendar size={16} />
                </div>
                <select
                  value={loanRepaymentMethod}
                  onChange={(e) => setLoanRepaymentMethod(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium appearance-none"
                  required
                >
                  <option value="monthly">{t('register', 'method_monthly')}</option>
                  <option value="quarterly">{t('register', 'method_quarterly')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                {t('register', 'monthly_income')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                  <Wallet size={16} />
                </div>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder={t('register', 'placeholder_income')}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                {t('register', 'dependents')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                  <Users size={16} />
                </div>
                <select
                  value={dependents}
                  onChange={(e) => setDependents(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all text-sm input-premium appearance-none"
                  required
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
              {t('register', 'identity_doc')}
            </label>
            <div className="relative group">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-zinc-700 border-dashed rounded-xl cursor-pointer bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-brand/50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileUp className={`w-6 h-6 mb-2 ${file ? 'text-brand' : 'text-zinc-500'} group-hover:text-brand transition-colors`} />
                    <p className="text-[10px] text-zinc-500 group-hover:text-brand font-medium">
                      {file ? file.name : t('register', 'upload_placeholder')}
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
                    required
                  />
                </label>
              </div>
            </div>
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
              <span>{t('register', 'success_msg')}</span>
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
                {t('register', 'btn_register')}
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
          className="text-white hover:text-brand font-semibold underline underline-offset-4 transition-colors"
        >
          {t('register', 'login_link')}
        </button>
      </p>
    </div>
  );
}
