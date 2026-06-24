import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  User as UserIcon, 
  LayoutDashboard, 
  Settings, 
  Bell, 
  Search, 
  Wallet, 
  Shield, 
  Mail, 
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Send,
  Loader2,
  MessageSquare,
  ChevronRight,
  Eye,
  Info,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Key,
  Play,
  BarChart,
  Users,
  CreditCard,
  Lock,
  Activity,
  Coins,
  Clock,
  Trash2,
  Phone
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { getSupabase } from './lib/supabase';
import Loader from './components/Loader';
import { useAppSettings } from './contexts/AppSettingsContext';
import AppSettings from './components/AppSettings';
import { useLanguage, LanguageSelector } from './contexts/LanguageContext';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  balance: number;
  role: string;
}

interface SupportMessage {
  id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_email?: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  recipient_name: string;
  created_at: string;
  user_email?: string;
  status?: string;
  progress?: number;
  itemType?: 'transaction' | 'transfer_session';
}

interface AdminCode {
  id: string;
  code: string;
  is_used: boolean;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  total_balance: number;
  total_transfers: number;
  total_transactions: number;
}

interface DBNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'loan_request' | 'loan_approved' | 'loan_rejected' | 'repayment_done' | 'system';
  is_read: boolean;
  created_at: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface TransferSession {
  id: string;
  amount: number;
  recipient_name: string;
  status: 'pending' | 'completed' | 'rejected';
  progress: number;
  created_at: string;
  iban?: string;
  motif?: string;
}

interface LoanRequest {
  id: string;
  user_id: string;
  amount: number;
  duration_months: number;
  repayment_method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: {
    email: string;
    full_name: string;
  };
}

interface LoanRepayment {
  id: string;
  loan_id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'confirmed';
  payment_method: string;
  external_reference?: string;
  created_at: string;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTransfers, setAllTransfers] = useState<TransferSession[]>([]);
  const [selectedTransferDetails, setSelectedTransferDetails] = useState<TransferSession | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{id: string, state: 'idle' | 'loading' | 'success' | 'error', message?: string} | null>(null);
  const [newBalances, setNewBalances] = useState<Record<string, string>>({});

  // Support Chat States
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [selectedUserForSupport, setSelectedUserForSupport] = useState<string | null>(null);

  // Transfer States
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [transferIban, setTransferIban] = useState('');
  const [transferMotif, setTransferMotif] = useState('');
  const [activeTransfer, setActiveTransfer] = useState<TransferSession | null>(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [isTransferBlocked, setIsTransferBlocked] = useState(false);
  const [isTransferStarting, setIsTransferStarting] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<TransferSession | null>(null);

  // Loan States
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDuration, setLoanDuration] = useState('12');
  const [loanRepaymentMethod, setLoanRepaymentMethod] = useState('monthly');
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);

  // OTP States
  const [otpCode, setOtpCode] = useState('');
  const [isOtpValidating, setIsOtpValidating] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Admin Force Progress States
  const [forceProgressValue, setForceProgressValue] = useState('');
  const [isForcingProgress, setIsForcingProgress] = useState(false);
  const [forceProgressError, setForceProgressError] = useState<string | null>(null);

  // Admin Loan States
  const [allLoanRequests, setAllLoanRequests] = useState<LoanRequest[]>([]);
  const [isAllLoansLoading, setIsAllLoansLoading] = useState(false);

  // Admin Code States
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isAdminCodesLoading, setIsAdminCodesLoading] = useState(false);

  // Admin Stats States
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isAdminStatsLoading, setIsAdminStatsLoading] = useState(false);
  const [allRepayments, setAllRepayments] = useState<any[]>([]);
  const [isAllRepaymentsLoading, setIsAllRepaymentsLoading] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dbNotifications, setDbNotifications] = useState<DBNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDbNotifications(data || []);
      setUnreadCount((data || []).filter((n: DBNotification) => !n.is_read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      setDbNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const createNotification = async (userId: string, title: string, message: string, type: DBNotification['type']) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type
        });
      if (error) throw error;
    } catch (err) {
      console.error("Error creating notification:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const subscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = payload.new as DBNotification;
        setDbNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
        showNotification(`${newNotif.title}: ${newNotif.message}`, 'info');
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id]);

  // User Loan State
  const [userLoan, setUserLoan] = useState<LoanRequest | null>(null);
  const [isLoanLoading, setIsLoanLoading] = useState(false);
  const [totalRepaid, setTotalRepaid] = useState(0);
  const [userRepayments, setUserRepayments] = useState<LoanRepayment[]>([]);
  
  // Repayment Form States
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState('visa');
  const [repaymentRef, setRepaymentRef] = useState('');
  const [isRepaymentLoading, setIsRepaymentLoading] = useState(false);

  const [activeView, setActiveView] = useState<'dashboard' | 'settings'>('dashboard');

  const supportChatRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 11);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Progress logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTransfer && !isTransferBlocked && transferProgress < 100) {
      interval = setInterval(async () => {
        setTransferProgress((prev) => {
          const next = prev + 5;
          
          // Check for blocking points
          if ((prev < 20 && next >= 20) || (prev < 60 && next >= 60) || (prev < 85 && next >= 85)) {
            setIsTransferBlocked(true);
            // Sync progress to DB when blocked
            supabase.from('transfer_sessions').update({ progress: next }).eq('id', activeTransfer.id).then(({error}) => {
              if (error) console.error("Sync error:", error);
            });
            return next;
          }

          if (next >= 100) {
            handleCompleteTransfer();
            return 100;
          }

          // Periodic sync (every 10%)
          if (next % 10 === 0) {
            supabase.from('transfer_sessions').update({ progress: next }).eq('id', activeTransfer.id).then(({error}) => {
              if (error) console.error("Sync error:", error);
            });
          }

          return next;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [activeTransfer, isTransferBlocked, transferProgress]);

  // Subscription / Polling when blocked to detect if admin forced progress or updated status
  useEffect(() => {
    if (!activeTransfer || !isTransferBlocked) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('transfer_sessions')
          .select('*')
          .eq('id', activeTransfer.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (data) {
          if (data.status === 'completed' || data.status === 'rejected') {
            setActiveTransfer(data);
            setTransferProgress(data.progress);
            setIsTransferBlocked(false);
            if (data.status === 'completed') {
              await fetchProfile();
            }
          } else if (data.progress > transferProgress) {
            setTransferProgress(data.progress);
            setIsTransferBlocked(false);
          }
        }
      } catch (err) {
        console.error("Error polling transfer status:", err);
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [activeTransfer, isTransferBlocked, transferProgress]);

  const handleStartTransfer = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !recipientName || !transferIban) return;

    if (profile && amount > profile.balance) {
      showNotification(language === 'es' ? "Saldo insuficiente para realizar esta transferencia." : "Solde insuffisant pour effectuer ce transfert.", "error");
      return;
    }

    if (pendingTransfer) {
      showNotification(language === 'es' ? "Tiene una transferencia en curso sin finalizar." : "Vous avez un transfert non achevé en cours de finalisation.", "error");
      return;
    }

    setIsTransferStarting(true);
    try {
      let insertData: any = {
        user_id: user.id,
        amount,
        recipient_name: recipientName,
        status: 'pending',
        progress: 0,
        iban: transferIban,
        motif: transferMotif
      };

      let { data, error: insertError } = await supabase
        .from('transfer_sessions')
        .insert(insertData)
        .select()
        .single();

      // Fallback if the Supabase table doesn't have iban/motif columns yet
      if (insertError) {
        console.warn("Retrying insert without iban/motif due to potential schema mismatch:", insertError);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('transfer_sessions')
          .insert({
            user_id: user.id,
            amount,
            recipient_name: recipientName,
            status: 'pending',
            progress: 0
          })
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        data = fallbackData;
      }

      // Store in localStorage anyway to be absolutely sure they persist and are accessible locally!
      if (data) {
        if (transferIban) localStorage.setItem(`transfer_iban_${data.id}`, transferIban);
        if (transferMotif) localStorage.setItem(`transfer_motif_${data.id}`, transferMotif);
      }

      setActiveTransfer({
        ...data,
        iban: transferIban,
        motif: transferMotif
      });
      setTransferProgress(0);
      setIsTransferBlocked(false);
      
      // Reset input fields
      setTransferIban('');
      setTransferMotif('');
    } catch (err: any) {
      console.error("Start transfer error:", err);
      showNotification(language === 'es' ? "Error al iniciar la transferencia: " + err.message : "Erreur lors de l'initialisation du transfert: " + err.message, "error");
    } finally {
      setIsTransferStarting(false);
    }
  };

  const checkPendingTransfer = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('transfer_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lt('progress', 100)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        const isDiscarded = localStorage.getItem(`discarded_transfer_${data[0].id}`) === 'true';
        if (isDiscarded) {
          setPendingTransfer(null);
        } else {
          const session = data[0];
          const localIban = localStorage.getItem(`transfer_iban_${session.id}`) || session.iban || '';
          const localMotif = localStorage.getItem(`transfer_motif_${session.id}`) || session.motif || '';
          setActiveTransfer({
            ...session,
            iban: localIban,
            motif: localMotif
          });
          setTransferProgress(session.progress);
          const isBlocked = session.progress === 20 || session.progress === 60 || session.progress === 85;
          setIsTransferBlocked(isBlocked);
          setPendingTransfer(null);
        }
      } else {
        setPendingTransfer(null);
      }
    } catch (err) {
      console.error("Error checking pending transfer:", err);
    }
  };

  const handleResumeTransfer = () => {
    if (!pendingTransfer) return;
    const localIban = localStorage.getItem(`transfer_iban_${pendingTransfer.id}`) || pendingTransfer.iban || '';
    const localMotif = localStorage.getItem(`transfer_motif_${pendingTransfer.id}`) || pendingTransfer.motif || '';
    setActiveTransfer({
      ...pendingTransfer,
      iban: localIban,
      motif: localMotif
    });
    setTransferProgress(pendingTransfer.progress);
    const isBlocked = pendingTransfer.progress === 20 || pendingTransfer.progress === 60 || pendingTransfer.progress === 85;
    setIsTransferBlocked(isBlocked);
    setPendingTransfer(null);
    showNotification(language === 'es' ? "Reanudando transferencia en curso..." : "Reprise du transfert en cours...", "success");
  };

  const handleDiscardAndNew = async () => {
    const targetTransfer = activeTransfer || pendingTransfer;
    if (!targetTransfer) return;
    const transferId = targetTransfer.id;
    try {
      // 1. Tenter de mettre à jour le statut vers 'rejected'
      const { error: updateError } = await supabase
        .from('transfer_sessions')
        .update({ status: 'rejected' })
        .eq('id', transferId);
        
      if (updateError) {
        console.warn("Failed to update status to 'rejected', trying deletion...", updateError);
        // 2. Si la mise à jour échoue (ex: contrainte de validation en base non migrée), on tente de supprimer la session
        const { error: deleteError } = await supabase
          .from('transfer_sessions')
          .delete()
          .eq('id', transferId);

        if (deleteError) {
          throw deleteError;
        }
      }
      
      resetTransfer();
      showNotification(language === 'es' ? "Transferencia abandonada." : "Transfert abandonné.", "info");
    } catch (err: any) {
      console.error("Error discarding transfer, using local storage fallback:", err);
      // 3. Si les deux échouent (ex: pas encore de politique DELETE RLS ou contrainte bloquante), on utilise le fallback localStorage
      localStorage.setItem(`discarded_transfer_${transferId}`, 'true');
      resetTransfer();
      showNotification(language === 'es' ? "Transferencia abandonada." : "Transfert abandonné.", "info");
    }
  };

  const handleCreateLoanRequest = async (e: FormEvent) => {
    e.preventDefault();
    const amountValue = Number(loanAmount);
    const durationValue = Number(loanDuration);

    if (isNaN(amountValue) || amountValue <= 0) {
      showNotification("Veuillez entrer un montant valide", "error");
      return;
    }

    setIsSubmittingLoan(true);
    try {
      const { error: insertError } = await supabase
        .from('loan_requests')
        .insert({
          user_id: user.id,
          amount: amountValue,
          duration_months: durationValue,
          repayment_method: loanRepaymentMethod,
          status: 'pending'
        });

      if (insertError) throw insertError;

      showNotification("Votre demande de prêt a été soumise avec succès", "success");
      setLoanAmount('');
    } catch (err: any) {
      console.error("Loan request error:", err);
      showNotification("Erreur lors de la soumission de la demande: " + err.message, "error");
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  const handleValidateOtp = async () => {
    if (!otpCode) return;

    setIsOtpValidating(true);
    setOtpError(null);
    try {
      const { data: isValid, error: rpcError } = await supabase.rpc('validate_admin_code', {
        input_code: otpCode
      });

      if (rpcError) throw rpcError;

      if (isValid) {
        setIsTransferBlocked(false);
        setOtpCode('');
        setOtpError(null);
        showNotification("Code de sécurité validé avec succès", "success");
      } else {
        setOtpError("Code invalide");
        showNotification("Code de sécurité invalide", "error");
      }
    } catch (err: any) {
      console.error("OTP Validation error:", err);
      setOtpError("Erreur de validation");
      showNotification("Erreur lors de la validation du code", "error");
    } finally {
      setIsOtpValidating(false);
    }
  };

  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleteTransfer = async () => {
    if (!activeTransfer || isCompleting) return;
    
    setIsCompleting(true);
    try {
      // Update status to completed and ensure progress is 100
      await supabase
        .from('transfer_sessions')
        .update({ status: 'completed', progress: 100 })
        .eq('id', activeTransfer.id);
      
      // Call RPC to process the debit and create transactions
      const { error: rpcError } = await supabase.rpc('process_completed_transfer', {
        transfer_id: activeTransfer.id
      });

      if (rpcError) throw rpcError;

      // Refresh balance after successful transfer
      await fetchProfile();
      showNotification(`Transfert de ${activeTransfer.amount}€ vers ${activeTransfer.recipient_name} terminé`, "success");
    } catch (err) {
      console.error("Complete transfer error:", err);
      showNotification("Erreur lors de la finalisation du transfert", "error");
    } finally {
      setIsCompleting(false);
    }
  };

  const resetTransfer = () => {
    setActiveTransfer(null);
    setTransferProgress(0);
    setIsTransferBlocked(false);
    setTransferAmount('');
    setRecipientName('');
    setTransferIban('');
    setTransferMotif('');
    setPendingTransfer(null);
  };

  const fetchProfile = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("REAL ERROR:", fetchError);
        setError(fetchError.message);
      } else if (!data) {
        setError("Profil introuvable.");
      } else {
        setProfile(data);
        return data;
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue est survenue.");
    }
    return null;
  };

  const fetchSupportMessages = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase.from('support_messages').select('*').order('created_at', { ascending: true });
      
      // If not admin, only see own messages
      if (profile && profile.role !== 'admin' && profile.role !== 'superadmin') {
        query = query.eq('user_id', user.id);
      } else if (selectedUserForSupport) {
        // If admin and a user is selected, filter by that user
        query = query.eq('user_id', selectedUserForSupport);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSupportMessages(data || []);
    } catch (err) {
      console.error("Error fetching support messages:", err);
    }
  };

  useEffect(() => {
    if (isSupportOpen) {
      fetchSupportMessages();
      
      const supabase = getSupabase();
      const subscription = supabase
        .channel('support-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
          fetchSupportMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isSupportOpen, selectedUserForSupport, profile?.role]);

  const handleSendSupportMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim()) return;

    setIsSendingSupport(true);
    try {
      const supabase = getSupabase();
      const targetUserId = (profile?.role === 'admin' || profile?.role === 'superadmin') && selectedUserForSupport 
        ? selectedUserForSupport 
        : user.id;

      const { error: sendError } = await supabase
        .from('support_messages')
        .insert({
          user_id: targetUserId,
          message: supportInput.trim(),
          is_admin: profile?.role === 'admin' || profile?.role === 'superadmin'
        });

      if (sendError) throw sendError;
      setSupportInput('');
      fetchSupportMessages();
    } catch (err) {
      console.error("Error sending support message:", err);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleRequestSupportForTransfer = async () => {
    if (isSendingSupport) return;
    
    const message = language === 'es'
      ? `Hola, mi transferencia está bloqueada en ${transferProgress}%. Necesito asistencia.`
      : `Bonjour, mon transfert est bloqué à ${transferProgress}%. J’ai besoin d’assistance.`;
    
    setIsSupportOpen(true);
    setIsSendingSupport(true);

    try {
      const { error: sendError } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          message: message,
          is_admin: false
        });

      if (sendError) throw sendError;
      
      // Scroll to chat
      setTimeout(() => {
        supportChatRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      
      fetchSupportMessages();
    } catch (err) {
      console.error("Error requesting support:", err);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleForceProgress = async () => {
    if (!selectedTransferDetails || !forceProgressValue) return;
    const nextVal = parseInt(forceProgressValue);
    if (isNaN(nextVal) || nextVal < 0 || nextVal > 100) {
      setForceProgressError("Entre 0 et 100");
      return;
    }

    setIsForcingProgress(true);
    setForceProgressError(null);
    try {
      const { error: rpcError } = await supabase.rpc('force_transfer_progress', {
        transfer_id: selectedTransferDetails.id,
        new_progress: nextVal
      });

      if (rpcError) throw rpcError;

      // Update local state for immediate feedback
      setSelectedTransferDetails({ ...selectedTransferDetails, progress: nextVal });
      setForceProgressValue('');
    } catch (err: any) {
      console.error("Force progress error:", err);
      setForceProgressError(err.message || "Erreur lors du forçage");
    } finally {
      setIsForcingProgress(false);
    }
  };

  const fetchUsers = async (currentRole?: string) => {
    try {
      setIsAdminLoading(true);
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('email');
      
      if (fetchError) throw fetchError;
      
      const roleToCheck = currentRole || profile?.role;
      let filteredData = data || [];
      if (roleToCheck === 'admin') {
        filteredData = filteredData.filter(u => u.role !== 'superadmin');
      }
      setAllUsers(filteredData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const fetchAllTransfers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('transfer_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setAllTransfers(data || []);
    } catch (err) {
      console.error("Error fetching all transfers:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setIsTransactionsLoading(true);
      
      let txQuery = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
        
      let tsQuery = supabase
        .from('transfer_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        txQuery = txQuery.eq('user_id', user.id);
        tsQuery = tsQuery.eq('user_id', user.id);
      }

      const [txResult, tsResult] = await Promise.all([txQuery, tsQuery]);
      
      if (txResult.error) throw txResult.error;
      if (tsResult.error) throw tsResult.error;

      const txList: Transaction[] = (txResult.data || []).map(tx => ({
        ...tx,
        itemType: 'transaction' as const
      }));

      // We include pending and rejected sessions, and completed sessions only if not already in transactions
      const tsList: Transaction[] = (tsResult.data || [])
        .filter(ts => {
          if (ts.status === 'completed') {
            const hasTx = txList.some(tx => 
              tx.type === 'debit' && 
              Math.abs(Number(tx.amount) - Number(ts.amount)) < 0.01 && 
              tx.recipient_name === ts.recipient_name
            );
            return !hasTx;
          }
          return true;
        })
        .map(ts => ({
          id: ts.id,
          user_id: ts.user_id,
          amount: ts.amount,
          type: 'transfer_session',
          recipient_name: ts.recipient_name,
          created_at: ts.created_at,
          status: ts.status,
          progress: ts.progress,
          itemType: 'transfer_session' as const
        }));

      const combined = [...txList, ...tsList].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(combined);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  const fetchAllLoanRequests = async () => {
    try {
      setIsAllLoansLoading(true);
      const { data, error: fetchError } = await supabase
        .from('loan_requests')
        .select(`
          id,
          amount,
          duration_months,
          repayment_method,
          status,
          created_at,
          user:users (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setAllLoanRequests(data as any || []);
    } catch (err) {
      console.error("Error fetching all loan requests:", err);
    } finally {
      setIsAllLoansLoading(false);
    }
  };

  const handleApproveLoan = async (loanId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('approve_loan', { p_loan_id: loanId });
      if (rpcError) throw rpcError;

      showNotification("Demande de prêt approuvée avec succès", "success");
      await fetchAllLoanRequests();
    } catch (err: any) {
      console.error("Approve loan error:", err);
      showNotification("Erreur lors de l'approbation: " + err.message, "error");
    }
  };

  const handleRejectLoan = async (loanId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('reject_loan', { loan_id: loanId });
      if (rpcError) throw rpcError;

      showNotification("Demande de prêt rejetée", "info");
      await fetchAllLoanRequests();
    } catch (err: any) {
      console.error("Reject loan error:", err);
      showNotification("Erreur lors du rejet: " + err.message, "error");
    }
  };

  const fetchAdminCodes = async () => {
    try {
      setIsAdminCodesLoading(true);
      const { data, error: fetchError } = await supabase
        .from('admin_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setAdminCodes(data || []);
    } catch (err) {
      console.error("Error fetching admin codes:", err);
    } finally {
      setIsAdminCodesLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const { data, error: rpcError } = await supabase.rpc('generate_admin_code');
      if (rpcError) throw rpcError;
      
      showNotification("Nouveau code OTP généré avec succès", "success");
      // Refresh list
      await fetchAdminCodes();
    } catch (err: any) {
      console.error("Error generating code:", err);
      showNotification("Erreur lors de la génération du code: " + err.message, "error");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      setIsAdminStatsLoading(true);
      const { data, error: fetchError } = await supabase.rpc('get_admin_stats');
      
      if (fetchError) throw fetchError;
      setAdminStats(data);
    } catch (err) {
      console.error("Error fetching admin stats:", err);
    } finally {
      setIsAdminStatsLoading(false);
    }
  };

  const fetchAllRepayments = async () => {
    try {
      setIsAllRepaymentsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('loan_repayments')
        .select(`
          *,
          user:users (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setAllRepayments(data || []);
    } catch (err) {
      console.error("Error fetching all repayments:", err);
    } finally {
      setIsAllRepaymentsLoading(false);
    }
  };

  const handleValidateRepayment = async (repayId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('validate_repayment', { 
        repayment_id: repayId 
      });

      if (rpcError) throw rpcError;

      showNotification("Remboursement validé avec succès", "success");
      await fetchAllRepayments();
      await fetchAdminStats(); // Volume update
      if (isAdmin) await fetchUsers(); // Refresh balances
    } catch (err: any) {
      console.error("Validate repayment error:", err);
      showNotification("Erreur lors de la validation: " + err.message, "error");
    }
  };

  const fetchLatestLoanRequest = async () => {
    try {
      setIsLoanLoading(true);
      const { data, error: fetchError } = await supabase
        .from('loan_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setUserLoan(data);
    } catch (err) {
      console.error("Error fetching latest loan request:", err);
    } finally {
      setIsLoanLoading(false);
    }
  };

  const fetchTotalRepaid = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('loan_repayments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setUserRepayments(data || []);
      // Only confirmed repayments count towards total?
      // Actually usually you count confirmed ones for "paid", but maybe you want to show pending too.
      // Let's count ONLY confirmed ones for the "Reste à payer" to be safe, or as per usual logic.
      // User request said: "amount - total remboursé". 
      const total = (data || [])
        .filter((r: any) => r.status === 'confirmed')
        .reduce((acc: number, curr: any) => acc + curr.amount, 0);
      setTotalRepaid(total);
    } catch (err) {
      console.error("Error fetching repayments:", err);
    }
  };

  const handleRepayLoan = async (e: FormEvent) => {
    e.preventDefault();
    if (!userLoan) return;
    const amount = parseFloat(repaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification("Veuillez entrer un montant valide", "error");
      return;
    }

    setIsRepaymentLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('repay_loan', {
        p_loan_id: userLoan.id,
        p_user_id: user.id,
        p_amount: amount,
        p_method: repaymentMethod,
        p_external_ref: repaymentRef
      });

      if (rpcError) throw rpcError;

      showNotification("Demande de remboursement envoyée", "success");
      setRepaymentAmount('');
      setRepaymentRef('');
      await fetchTotalRepaid();
    } catch (err: any) {
      console.error("Repayment error:", err);
      showNotification("Erreur lors du remboursement: " + err.message, "error");
    } finally {
      setIsRepaymentLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchTransactions();
      
      const subscription = supabase
        .channel('transactions-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          fetchTransactions();
          fetchProfile(); // Refresh balance too
        })
        .subscribe();

      const repaymentSub = supabase
        .channel('repayments-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_repayments' }, () => {
          fetchTotalRepaid();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
        supabase.removeChannel(repaymentSub);
      };
    }
  }, [profile?.role, user.id]);

  useEffect(() => {
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
    if (!isAdmin) return;

    fetchAllTransfers();
    fetchAdminCodes();
    fetchAdminStats();
    fetchAllLoanRequests();
    fetchAllRepayments();

    const transferSub = supabase
      .channel('all-transfers-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_sessions' }, () => {
        fetchAllTransfers();
      })
      .subscribe();

    const codeSub = supabase
      .channel('admin-codes-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_codes' }, () => {
        fetchAdminCodes();
      })
      .subscribe();

    const loanSub = supabase
      .channel('all-loans-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_requests' }, () => {
        fetchAllLoanRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transferSub);
      supabase.removeChannel(codeSub);
      supabase.removeChannel(loanSub);
    };
  }, [profile?.role]);

  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      setIsLoading(true);
      const p = await fetchProfile();
      await Promise.all([
        fetchLatestLoanRequest(),
        fetchTotalRepaid()
      ]);
      if (p && (p.role === 'admin' || p.role === 'superadmin')) {
        await Promise.all([fetchUsers(p.role), fetchAllTransfers(), fetchAdminCodes(), fetchAdminStats(), fetchAllLoanRequests(), fetchAllRepayments()]);
      } else {
        await checkPendingTransfer();
      }
      setIsLoading(false);
    };

    init();
  }, [user?.id]);

  const handleUpdateBalance = async (targetId: string) => {
    const amount = parseFloat(newBalances[targetId]);
    if (isNaN(amount)) return;

    setUpdateStatus({ id: targetId, state: 'loading' });
    try {
      const { error: rpcError } = await supabase.rpc('update_user_balance', {
        target_user_id: targetId,
        new_balance: amount
      });

      if (rpcError) throw rpcError;

      setUpdateStatus({ id: targetId, state: 'success' });
      showNotification("Solde mis à jour avec succès", "success");
      // Refresh user list and current profile if self
      await fetchUsers();
      if (targetId === user.id) await fetchProfile();
      
      setTimeout(() => setUpdateStatus(null), 3000);
    } catch (err: any) {
      console.error("Update error:", err);
      setUpdateStatus({ id: targetId, state: 'error', message: err.message });
      showNotification("Erreur lors de la mise à jour du solde: " + err.message, "error");
    }
  };

  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);

  const handleDeleteUser = async (targetId: string) => {
    if (targetId === user?.id) {
      showNotification("Vous ne pouvez pas supprimer votre propre compte.", "error");
      return;
    }
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible et supprimera toutes les données associées (prêts, transferts, etc.).")) {
      return;
    }

    setIsDeletingUser(targetId);
    try {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', targetId);

      if (deleteError) throw deleteError;

      showNotification("Utilisateur supprimé avec succès.", "success");
      await fetchUsers();
    } catch (err: any) {
      console.error("Delete user error:", err);
      showNotification("Erreur lors de la suppression: " + err.message, "error");
    } finally {
      setIsDeletingUser(null);
    }
  };

  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);

  const handleAcceptTransfer = async (transferId: string) => {
    if (isProcessingTransfer) return;
    setIsProcessingTransfer(true);
    try {
      // Update status to completed and progress to 100
      const { error: updateError } = await supabase
        .from('transfer_sessions')
        .update({ status: 'completed', progress: 100 })
        .eq('id', transferId);
      
      if (updateError) throw updateError;

      // Process completed transfer (RPC)
      const { error: rpcError } = await supabase.rpc('process_completed_transfer', {
        transfer_id: transferId
      });

      if (rpcError) throw rpcError;

      showNotification("Transfert accepté et complété avec succès", "success");
      setSelectedTransferDetails(null);
      await fetchAllTransfers();
      await fetchUsers(); // Refresh balances
    } catch (err: any) {
      console.error("Accept transfer error:", err);
      showNotification("Erreur lors de l'acceptation: " + err.message, "error");
    } finally {
      setIsProcessingTransfer(false);
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    if (isProcessingTransfer) return;
    setIsProcessingTransfer(true);
    try {
      const { error: updateError } = await supabase
        .from('transfer_sessions')
        .update({ status: 'rejected' })
        .eq('id', transferId);
      
      if (updateError) throw updateError;

      showNotification("Transfert rejeté avec succès", "success");
      setSelectedTransferDetails(null);
      await fetchAllTransfers();
    } catch (err: any) {
      console.error("Reject transfer error:", err);
      showNotification("Erreur lors du rejet: " + err.message, "error");
    } finally {
      setIsProcessingTransfer(false);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const { settings } = useAppSettings();

  // Helper to get formatted role title
  const getRoleTitle = () => {
    if (isLoading || !profile) return t('common', 'role_user');
    switch (profile.role?.toLowerCase()) {
      case 'admin': return t('common', 'role_admin');
      case 'superadmin': return t('common', 'role_superadmin');
      case 'user':
      default: return t('common', 'role_user');
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-brand selection:text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-12">
        <AnimatePresence>
        {isLoading && !profile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6"
          >
            <div className="w-full max-w-sm glass-card rounded-3xl border border-zinc-800 p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)]">
              <Loader />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast System */}
      <div className="fixed top-8 right-8 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 ${
                n.type === 'success' 
                  ? 'bg-brand/10 border-brand/20 text-brand' 
                  : n.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${
                n.type === 'success' ? 'bg-brand/10' : n.type === 'error' ? 'bg-red-500/10' : 'bg-blue-500/10'
              }`}>
                {n.type === 'success' && <Check size={16} />}
                {n.type === 'error' && <AlertCircle size={16} />}
                {n.type === 'info' && <Info size={16} />}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">{n.type === 'success' ? 'Succès' : n.type === 'error' ? 'Erreur' : 'Information'}</p>
                <p className="text-sm text-white/90 font-medium leading-relaxed">{n.message}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} 
                className="text-zinc-500 hover:text-white transition-colors"
                type="button"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 flex items-center justify-center overflow-hidden">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                className="h-8 max-w-[120px] object-contain filter brightness-0 invert"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                <LayoutDashboard className="text-black w-6 h-6" />
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{getRoleTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {profile?.role === 'superadmin' && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button 
                onClick={() => setActiveView('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeView === 'dashboard' ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">{t('dashboard', 'tab_dashboard')}</span>
              </button>
              <button 
                onClick={() => setActiveView('settings')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeView === 'settings' ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Settings size={16} />
                <span className="hidden sm:inline">{t('dashboard', 'tab_settings')}</span>
              </button>
            </div>
          )}
          
          {/* Système de Notifications */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative flex items-center justify-center p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all btn-premium"
            >
              <Bell size={20} className={unreadCount > 0 ? 'text-brand' : ''} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-black border-2 border-black">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 z-50 glass-card rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white">{t('dashboard', 'notifications')}</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] text-brand hover:underline font-bold uppercase"
                        >
                          {t('dashboard', 'mark_all_read')}
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {dbNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="mx-auto h-8 w-8 text-zinc-700 mb-2" />
                          <p className="text-xs text-zinc-500 italic">{t('dashboard', 'no_notifications')}</p>
                        </div>
                      ) : (
                        dbNotifications.map((notif) => (
                          <div 
                            key={notif.id}
                            className={`p-4 border-b border-zinc-800 transition-colors hover:bg-zinc-800/30 relative group ${!notif.is_read ? 'bg-brand/5' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.is_read ? 'bg-brand shadow-[0_0_8px_rgba(var(--brand-rgb),0.6)]' : 'bg-transparent'}`} />
                              <div className="flex-1 space-y-1">
                                <p className={`text-xs font-bold ${!notif.is_read ? 'text-white' : 'text-zinc-400'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-[10px] text-zinc-500 leading-relaxed">
                                  {notif.message}
                                </p>
                                <p className="text-[8px] text-zinc-600 font-mono">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notif.is_read && (
                                <button 
                                  onClick={() => markAsRead(notif.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-brand transition-all"
                                  title={language === 'es' ? "Marcar como leído" : "Marquer comme lu"}
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {dbNotifications.length > 0 && (
                      <div className="p-3 bg-zinc-900/30 text-center">
                         <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold">
                           {language === 'es' ? 'Sistema Certificado' : 'Système Certifié'}
                         </p>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <LanguageSelector />

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all text-sm font-medium btn-premium"
          >
            <LogOut size={16} />
            <span>{t('common', 'logout')}</span>
          </button>
        </div>
      </header>

      <div className="mb-8" style={{ color: 'var(--accent-color)' }}>
        {/* We can use accent_color for specific highlights if needed */}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Security Status Bar or Active Transfer Bar */}
            {activeTransfer ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20 animate-pulse">
                      <Send className="text-brand w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {language === 'es' ? 'Transferencia en curso' : 'Transfert en cours'}
                      </p>
                      <p className="text-sm font-bold text-white">
                        {activeTransfer.amount}€ {language === 'es' ? 'a' : 'vers'} {activeTransfer.recipient_name}
                      </p>
                      {activeTransfer.iban && (
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          <span className="font-bold text-zinc-500 uppercase tracking-wider mr-1">IBAN:</span>
                          {activeTransfer.iban}
                        </p>
                      )}
                      {activeTransfer.motif && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          <span className="font-bold text-zinc-500 uppercase tracking-wider mr-1">
                            {language === 'es' ? 'Concepto:' : 'Motif :'}
                          </span>
                          {activeTransfer.motif}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-400">
                      {transferProgress < 30 ? (language === 'es' ? 'Verificación' : 'Vérification') : transferProgress < 85 ? (language === 'es' ? 'Red bancaria' : 'Réseau bancaire') : transferProgress < 100 ? (language === 'es' ? 'Validación final' : 'Validation finale') : (language === 'es' ? 'Transferencia completada' : 'Transfert terminé')}
                    </span>
                    <span className="text-brand font-mono font-bold text-sm bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                      {transferProgress}%
                    </span>
                    {transferProgress < 100 && activeTransfer.status !== 'rejected' && (
                      <button 
                        onClick={handleDiscardAndNew}
                        className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-red-500/20 text-red-400 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer"
                        title={language === 'es' ? 'Cancelar transferencia' : 'Annuler le transfert'}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                  <div className="h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${transferProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-brand rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>

                {/* Inline Action for Blocked Transfer / Completed / Rejected */}
                <AnimatePresence mode="wait">
                  {isTransferBlocked && transferProgress < 100 && (
                    <motion.div 
                      key="top-blocked-notice"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="pt-2 border-t border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <AlertCircle className="text-accent w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-accent uppercase tracking-wider">
                            {language === 'es' ? 'Código de desbloqueo requerido' : 'Code de déblocage requis'}
                          </p>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {language === 'es' ? 'Ingrese el código OTP enviado por correo para reanudar su transferencia.' : 'Entrez le code OTP envoyé par email pour débloquer votre transfert.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <input 
                          type="text"
                          placeholder={language === 'es' ? 'Código OTP' : 'Code OTP'}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className={`w-32 bg-zinc-950 border ${otpError ? 'border-red-500/50' : 'border-zinc-800'} rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent transition-colors text-center font-mono tracking-widest`}
                        />
                        <button 
                          onClick={handleValidateOtp}
                          disabled={isOtpValidating || !otpCode}
                          className="bg-accent hover:opacity-90 disabled:opacity-50 text-black font-bold px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 btn-premium"
                        >
                          {isOtpValidating ? <Loader2 size={12} className="animate-spin" /> : (language === 'es' ? 'Validar' : 'Valider')}
                        </button>
                        <button 
                          onClick={handleRequestSupportForTransfer}
                          disabled={isSendingSupport}
                          className="bg-zinc-800 hover:bg-zinc-700 text-accent font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        >
                          {isSendingSupport ? <Loader2 size={10} className="animate-spin" /> : <MessageSquare size={10} />}
                          {language === 'es' ? 'Soporte' : 'Support'}
                        </button>
                        <button 
                          onClick={handleDiscardAndNew}
                          className="bg-zinc-900 hover:bg-zinc-800 text-red-400 hover:text-red-300 border border-red-500/20 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        >
                          <X size={10} />
                          {language === 'es' ? 'Cancelar' : 'Annuler'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {transferProgress === 100 && (
                    <motion.div 
                      key="top-success-notice"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-2 border-t border-zinc-800/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="text-brand w-4 h-4 shrink-0" />
                        <p className="text-xs text-zinc-400">
                          {language === 'es' ? 'La transferencia se ha completado con éxito.' : 'Le transfert a été completé avec succès.'}
                        </p>
                      </div>
                      <button 
                        onClick={resetTransfer}
                        className="px-3 py-1 bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        {language === 'es' ? 'Cerrar' : 'Fermer'}
                      </button>
                    </motion.div>
                  )}

                  {activeTransfer.status === 'rejected' && (
                    <motion.div 
                      key="top-rejected-notice"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-2 border-t border-zinc-800/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <X className="text-red-500 w-4 h-4 shrink-0" />
                        <p className="text-xs text-zinc-400">
                          {language === 'es' ? 'Esta transferencia ha sido rechazada por el banco.' : 'Ce transfert a été refusé par l\'administration.'}
                        </p>
                      </div>
                      <button 
                        onClick={resetTransfer}
                        className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        {language === 'es' ? 'Cerrar' : 'Fermer'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {otpError && isTransferBlocked && transferProgress < 100 && (
                  <p className="text-[9px] text-red-500 font-bold uppercase text-right tracking-wider animate-pulse px-1">
                    {otpError === 'Code invalide' ? (language === 'es' ? 'Código inválido' : 'Code invalide') : otpError}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-6 mb-8 px-6 py-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {language === 'es' ? 'Estado del Sistema' : 'Status Système'}
                  </span>
                </div>
                
                <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

                <div className="flex items-center gap-2 text-zinc-300">
                  <Lock size={12} className="text-brand" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {language === 'es' ? 'Conexión SSL Segura' : 'Connexion sécurisée SSL'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <Activity size={12} className="text-brand animate-pulse" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {language === 'es' ? 'Sesión Activa' : 'Session active'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <Shield size={12} className="text-brand" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {language === 'es' ? 'Protección Bancaria' : 'Protection bancaire'}
                  </span>
                </div>

                <div className="ml-auto hidden lg:flex items-center gap-2">
                  <span className="text-[9px] font-mono text-zinc-500">
                    {language === 'es' ? 'ID Sesión: ' : 'ID Session: '}{user.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
              </motion.div>
            )}

      {/* Loan Request Section */}
      {profile?.role === 'user' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 glass-card card-premium rounded-3xl border border-brand/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                <Coins size={16} className="text-brand" />
              </div>
              <h2 className="text-lg font-bold">
                {language === 'es' ? 'Su Solicitud de Préstamo' : 'Votre Demande de Prêt'}
              </h2>
            </div>
            {userLoan && (
              <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${
                userLoan.status === 'approved' ? 'text-brand bg-brand/10 border-brand/20' :
                userLoan.status === 'rejected' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                'text-accent bg-accent/10 border-accent/20 animate-pulse'
              }`}>
                {userLoan.status === 'pending' ? (language === 'es' ? 'En proceso de análisis' : 'En cours d’analyse') :
                 userLoan.status === 'approved' ? (language === 'es' ? 'Aprobado' : 'Approuvé') : 
                 (language === 'es' ? 'Rechazado' : 'Refusé')}
              </span>
            )}
          </div>

          {isLoanLoading ? (
            <div className="flex items-center gap-3 text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm tracking-wide">
                {language === 'es' ? 'Cargando su solicitud...' : 'Chargement de votre demande...'}
              </span>
            </div>
          ) : userLoan ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {language === 'es' ? 'Monto' : 'Montant'}
                </p>
                <p className="text-xl font-bold text-white">{userLoan.amount.toLocaleString()}€</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {language === 'es' ? 'Modalidad' : 'Modalité'}
                </p>
                <p className="text-sm font-medium text-zinc-300 capitalize">
                  {userLoan.repayment_method === 'monthly' 
                    ? (language === 'es' ? 'Mensual' : 'Mensuel') 
                    : (language === 'es' ? 'Trimestral' : 'Trimestriel')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {language === 'es' ? 'Duración' : 'Durée'}
                </p>
                <p className="text-sm font-medium text-zinc-300">
                  {userLoan.duration_months} {language === 'es' ? 'Meses' : 'Mois'}
                </p>
              </div>
              <div className="space-y-1 text-right sm:text-left">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {language === 'es' ? 'Fecha de solicitud' : 'Date de demande'}
                </p>
                <p className="text-sm font-medium text-zinc-300">{new Date(userLoan.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 italic text-sm">
              <Info size={14} />
              <span>
                {language === 'es' ? 'Ninguna solicitud de préstamo en curso.' : 'Aucune demande de prêt en cours.'}
              </span>
            </div>
          )}
        </motion.div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 glass-card card-premium rounded-3xl p-8 flex flex-col justify-between border border-brand/10 min-h-[300px]"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-brand text-[10px] font-bold uppercase tracking-widest bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
                {language === 'es' ? 'Miembro Activo' : 'Membre Actif'}
              </span>
              {!isLoading && profile && profile.role?.toLowerCase() !== 'user' && (
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                  profile.role?.toLowerCase() === 'superadmin' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                  'text-blue-400 bg-blue-400/10 border-blue-400/20'
                }`}>
                  {profile.role?.toLowerCase() === 'superadmin' ? 'Super Admin' : 'Admin'}
                </span>
              )}
            </div>
            
            <h2 className="text-4xl font-bold mb-2">{language === 'es' ? 'Bienvenido/a,' : 'Bienvenue,'}</h2>
            <p className="text-zinc-400 text-xl font-medium truncate max-w-md">
              {isLoading ? (language === 'es' ? "Cargando..." : "Chargement...") : (profile?.full_name || user.email)}
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                <div className="flex items-center gap-2 mb-2 text-zinc-500">
                  <Mail size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {language === 'es' ? 'Cuenta de correo' : 'Compte Email'}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-300 truncate">{user.email}</p>
              </div>
              <div className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                <div className="flex items-center gap-2 mb-2 text-zinc-500">
                  <Shield size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {language === 'es' ? 'Nivel de seguridad' : 'Niveau de sécurité'}
                  </span>
                </div>
                <p className="text-sm font-medium text-brand">
                  {language === 'es' ? 'Protección SSL Activa' : 'Protection SSL Active'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex gap-4">
            <button className="flex-1 px-6 py-3 bg-brand text-black font-bold rounded-xl hover:opacity-90 transition-all btn-premium">
              {language === 'es' ? 'Ajustes' : 'Paramètres'}
            </button>
            <button 
              onClick={() => setIsSupportOpen(!isSupportOpen)}
              className={`px-6 py-3 font-bold rounded-xl transition-all btn-premium ${
                isSupportOpen ? 'bg-brand text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              {language === 'es' ? 'Soporte' : 'Support'}
            </button>
          </div>
        </motion.div>

        {/* Visual Bank Card: Balance */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, rotateY: 2 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative h-[300px] rounded-3xl overflow-hidden group perspective-1000"
        >
          {/* Main Card Body with glassmorphism and green gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand/40 via-brand/60 to-zinc-950/80 backdrop-blur-xl border border-brand/20 p-8 flex flex-col justify-between shadow-[0_20px_50px_rgba(var(--brand-rgb),0.15)] group-hover:shadow-[0_20px_60px_rgba(var(--brand-rgb),0.25)] transition-all duration-500 card-premium">
            
            {/* Animated Glow Effect */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/20 blur-[80px] rounded-full group-hover:bg-brand/30 transition-colors" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand/10 blur-[80px] rounded-full" />

            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em]">{settings.site_name}</p>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
              </div>
              {settings.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className="w-10 h-10 object-contain brightness-0 invert opacity-60" 
                />
              ) : (
                <CreditCard className="text-white/40 w-8 h-8" />
              )}
            </div>

            <div className="relative z-10">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                {language === 'es' ? 'Saldo Total' : 'Total Balance'}
              </p>
              <h3 className="text-4xl font-bold tracking-tighter text-white mb-8">
                {isLoading ? (
                  <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg" />
                ) : (
                  <>{profile?.balance?.toLocaleString() || 0}€</>
                )}
              </h3>
              
              <div className="space-y-4">
                <p className="text-lg font-medium text-white/90 tracking-[0.15em] font-mono">
                  **** **** **** 4582
                </p>
                
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                      {language === 'es' ? 'Titular de la tarjeta' : 'Card Holder'}
                    </p>
                    <p className="text-xs font-bold text-white uppercase truncate max-w-[140px]">
                      {isLoading ? (language === 'es' ? "Cargando..." : "Loading...") : (profile?.full_name || "MEMBER")}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                      {language === 'es' ? 'Expira' : 'Expires'}
                    </p>
                    <p className="text-xs font-bold text-white font-mono">12/28</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chip Detail */}
            <div className="absolute top-1/2 right-8 -translate-y-1/2 w-10 h-8 bg-gradient-to-br from-zinc-700/40 to-zinc-800/40 rounded-md border border-white/5 overflow-hidden">
               <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                 <div className="border border-white/20" />
                 <div className="border border-white/20" />
                 <div className="border border-white/20" />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Support Chat Section */}
        <AnimatePresence>
          {isSupportOpen && (
            <motion.div 
              ref={supportChatRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:col-span-3 glass-card card-premium rounded-3xl overflow-hidden border border-brand/10"
            >
              <div className="flex flex-col h-[500px]">
                {/* Header */}
                <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                      <MessageSquare className="text-brand w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">
                        {language === 'es' ? 'Soporte en vivo' : 'Assistance en direct'}
                      </h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">
                        {(profile?.role === 'admin' || profile?.role === 'superadmin') 
                          ? (language === 'es' ? 'Modo Administrador' : 'Mode Administrateur') 
                          : (language === 'es' ? 'Soporte al Cliente' : 'Support Client')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIsSupportOpen(false)} className="text-zinc-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Admin User List (if admin) */}
                  {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                    <div className="w-64 border-r border-zinc-800 bg-zinc-900/20 overflow-y-auto hidden md:block">
                      <div className="p-3 border-b border-zinc-800 bg-zinc-900/40">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {language === 'es' ? 'Conversaciones' : 'Conversations'}
                        </p>
                      </div>
                      {Array.from(new Set(allUsers.map(u => u.id))).map(userId => {
                        const userProfile = allUsers.find(u => u.id === userId);
                        if (!userProfile) return null;
                        return (
                          <button
                            key={userId}
                            onClick={() => setSelectedUserForSupport(userId)}
                            className={`w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/50 ${
                              selectedUserForSupport === userId ? 'bg-brand/5 border-l-2 border-l-brand' : ''
                            }`}
                          >
                            <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                              <span className="text-xs font-bold text-zinc-200 truncate w-full">
                                {userProfile.full_name || (language === 'es' ? 'Sin Nombre' : 'Sans Nom')}
                              </span>
                              <span className="text-[10px] text-zinc-500 truncate w-full">{userProfile.email}</span>
                            </div>
                            <ChevronRight size={14} className="text-zinc-600" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Messages Area */}
                  <div className="flex-1 flex flex-col bg-zinc-900/10">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {supportMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-4">
                          <MessageSquare className="text-zinc-850 w-12 h-12" />
                          <div className="space-y-2">
                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                              {(profile?.role === 'admin' || profile?.role === 'superadmin') && !selectedUserForSupport 
                                ? (language === 'es' ? 'Seleccione una conversación para comenzar.' : 'Sélectionnez une conversation pour commencer.')
                                : (language === 'es' ? 'Haga su pregunta a continuación, un asesor le responderá rápidamente.' : 'Posez votre question ci-dessous, un conseiller vous répondra rapidement.')}
                            </p>
                            {!(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                              <div className="pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500 space-y-1 text-center">
                                {settings.contact_email && (
                                  <p className="flex items-center justify-center gap-1.5">
                                    <Mail size={10} className="text-brand" />
                                    <span>E-mail: {settings.contact_email}</span>
                                  </p>
                                )}
                                {settings.contact_phone && (
                                  <p className="flex items-center justify-center gap-1.5">
                                    <Phone size={10} className="text-brand" />
                                    <span>Tél: {settings.contact_phone}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        supportMessages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                              msg.is_admin 
                                ? 'bg-brand text-black font-medium' 
                                : 'bg-zinc-800 text-zinc-200'
                            }`}>
                              <p>{msg.message}</p>
                              <div className={`text-[9px] mt-1 opacity-50 ${msg.is_admin ? 'text-black' : 'text-zinc-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/40">
                      <form onSubmit={handleSendSupportMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={supportInput}
                          onChange={(e) => setSupportInput(e.target.value)}
                          placeholder={language === 'es' ? "Su mensaje..." : "Votre message..."}
                          disabled={isSendingSupport || ((profile?.role === 'admin' || profile?.role === 'superadmin') && !selectedUserForSupport)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand transition-colors disabled:opacity-50 input-premium"
                        />
                        <button
                          type="submit"
                          disabled={isSendingSupport || !supportInput.trim() || ((profile?.role === 'admin' || profile?.role === 'superadmin') && !selectedUserForSupport)}
                          className="w-10 h-10 rounded-xl bg-brand text-black flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-50 btn-premium"
                        >
                          {isSendingSupport ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transfer Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-3 glass-card card-premium rounded-3xl p-8 border border-zinc-800"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
              <Send className="text-brand w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {language === 'es' ? 'Transferencia Express' : 'Transfert Express'}
              </h2>
              <p className="text-xs text-zinc-500">
                {language === 'es' ? 'Envíe fondos instantáneamente' : 'Envoyez des fonds instantanément'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {!activeTransfer ? (
              pendingTransfer ? (
                <div className="space-y-6 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 animate-fade-in flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-accent/10 rounded-2xl shrink-0 border border-accent/20">
                      <AlertCircle className="text-accent w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {language === 'es' ? 'Transferencia no completada detectada' : 'Transfert non achevé détecté'}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {language === 'es' ? (
                          <>Tiene una transferencia de <span className="text-white font-semibold">{pendingTransfer.amount}€</span> a <span className="text-white font-semibold">{pendingTransfer.recipient_name}</span> iniciada el {new Date(pendingTransfer.created_at).toLocaleDateString()} que no ha sido finalizada (progreso: <span className="text-accent font-semibold">{pendingTransfer.progress}%</span>).</>
                        ) : (
                          <>Vous avez un transfert de <span className="text-white font-semibold">{pendingTransfer.amount}€</span> vers <span className="text-white font-semibold">{pendingTransfer.recipient_name}</span> initié le {new Date(pendingTransfer.created_at).toLocaleDateString()} qui n'a pas été finalisé (progression : <span className="text-accent font-semibold">{pendingTransfer.progress}%</span>).</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      onClick={handleResumeTransfer}
                      className="flex-1 bg-brand hover:opacity-90 text-black font-bold py-3.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 btn-premium"
                    >
                      <Play size={14} fill="currentColor" />
                      {language === 'es' ? `Reanudar transferencia (${pendingTransfer.progress}%)` : `Reprendre le transfert (${pendingTransfer.progress}%)`}
                    </button>
                    <button
                      onClick={handleDiscardAndNew}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <X size={14} />
                      {language === 'es' ? 'Iniciar una nueva' : 'Initier un nouveau'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStartTransfer} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                        {language === 'es' ? 'Monto' : 'Montant'}
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          placeholder="0.00"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span>
                      </div>
                      {profile && parseFloat(transferAmount) > profile.balance && (
                        <p className="text-[10px] text-red-500 font-bold uppercase mt-1 animate-pulse">
                          <AlertCircle size={10} className="inline mr-1" />
                          {language === 'es' ? 'Saldo insuficiente' : 'Solde insuffisant'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                        {language === 'es' ? 'Destinatario' : 'Destinataire'}
                      </label>
                      <input 
                        type="text"
                        placeholder={language === 'es' ? 'Nombre del beneficiario' : 'Nom du bénéficiaire'}
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                        IBAN
                      </label>
                      <input 
                        type="text"
                        placeholder="ES00 0000 0000 0000 0000 0000"
                        value={transferIban}
                        onChange={(e) => setTransferIban(e.target.value)}
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                        {language === 'es' ? 'Concepto (opcional)' : 'Motif (optionnel)'}
                      </label>
                      <input 
                        type="text"
                        placeholder={language === 'es' ? 'Ej: Alquiler, Factura...' : 'Ex : Loyer, Facture...'}
                        value={transferMotif}
                        onChange={(e) => setTransferMotif(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors input-premium"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isTransferStarting || (profile !== null && parseFloat(transferAmount) > profile.balance)}
                    className="w-full bg-brand hover:opacity-90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-premium"
                  >
                    {isTransferStarting ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                    {profile && parseFloat(transferAmount) > profile.balance 
                      ? (language === 'es' ? 'Saldo insuficiente' : 'Solde insuffisant') 
                      : (language === 'es' ? 'Iniciar transferencia' : 'Initier le transfert')}
                  </button>
                </form>
              )
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 underline underline-offset-4 decoration-brand/50">
                      {language === 'es' ? 'Transferencia en curso' : 'Transfert en cours'}
                    </p>
                    <p className="text-xl font-bold">{activeTransfer.amount}€ {language === 'es' ? 'a' : 'vers'} {activeTransfer.recipient_name}</p>
                    {activeTransfer.iban && (
                      <p className="text-xs text-zinc-400 font-mono mt-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1.5">IBAN:</span>
                        {activeTransfer.iban}
                      </p>
                    )}
                    {activeTransfer.motif && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1.5">
                          {language === 'es' ? 'Concepto:' : 'Motif :'}
                        </span>
                        {activeTransfer.motif}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {transferProgress < 100 && activeTransfer.status !== 'rejected' && (
                      <button 
                        onClick={handleDiscardAndNew}
                        className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-red-400 hover:text-red-300 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X size={10} />
                        {language === 'es' ? 'Cancelar' : 'Annuler'}
                      </button>
                    )}
                    {transferProgress === 100 && (
                      <span className="bg-brand/10 text-brand text-[10px] font-bold px-3 py-1 rounded-full border border-brand/20">
                        {language === 'es' ? 'Completado' : 'Terminé'}
                      </span>
                    )}
                    {activeTransfer.status === 'rejected' && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-3 py-1 rounded-full border border-red-500/20">
                        {language === 'es' ? 'Rechazado' : 'Rejeté'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tighter">
                    <span className={transferProgress >= 100 ? "text-brand" : "text-zinc-400"}>
                      {transferProgress < 30 ? (language === 'es' ? 'Verificación' : 'Vérification') : transferProgress < 85 ? (language === 'es' ? 'Red bancaria' : 'Réseau bancaire') : transferProgress < 100 ? (language === 'es' ? 'Validación final' : 'Validation finale') : (language === 'es' ? 'Transferencia completada' : 'Transfert terminé')}
                    </span>
                    <span className="text-brand font-mono">{transferProgress}%</span>
                  </div>
                  
                  <div className="relative">
                    <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${transferProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-brand rounded-full relative animate-pulse-glow"
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        
                        {/* Inner Light Line */}
                        <div className="absolute top-0.5 left-0 right-0 h-px bg-white/20" />
                      </motion.div>
                    </div>

                    {/* Stage Markers */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 px-2 flex justify-between pointer-events-none">
                      {[25, 50, 75].map((pos) => (
                        <div 
                          key={pos} 
                          className={`w-1 h-1 rounded-full transition-colors duration-500 ${transferProgress >= pos ? 'bg-white/40' : 'bg-white/5'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stage Labels Subtext */}
                  <div className="flex justify-between px-1">
                    <p className={`text-[8px] font-bold uppercase transition-colors duration-500 ${transferProgress >= 10 ? 'text-brand/60' : 'text-zinc-700'}`}>
                      {language === 'es' ? 'Verificación' : 'Vérification'}
                    </p>
                    <p className={`text-[8px] font-bold uppercase transition-colors duration-500 ${transferProgress >= 40 ? 'text-brand/60' : 'text-zinc-700'}`}>
                      {language === 'es' ? 'Red' : 'Réseau'}
                    </p>
                    <p className={`text-[8px] font-bold uppercase transition-colors duration-500 ${transferProgress >= 85 ? 'text-brand/60' : 'text-zinc-700'}`}>
                      {language === 'es' ? 'Finalización' : 'Finalisation'}
                    </p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isTransferBlocked && transferProgress < 100 && (
                    <motion.div 
                      key="blocked-notice"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-accent/5 border border-accent/20 rounded-2xl space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-accent/10 rounded-lg shrink-0">
                          <AlertCircle className="text-accent w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-accent">
                            {language === 'es' ? 'Verificación de seguridad' : 'Vérification de sécurité'}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {language === 'es' ? `Código requerido para continuar con la transferencia a ${activeTransfer.recipient_name}.` : `Code requis pour continuer le transfert vers ${activeTransfer.recipient_name}.`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input 
                          type="text"
                          placeholder={language === 'es' ? 'Ingrese el código OTP' : 'Entrez le code OTP'}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className={`w-full bg-zinc-900 border ${otpError ? 'border-red-500/50' : 'border-zinc-800'} rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors text-center font-mono tracking-widest input-premium`}
                        />
                        {otpError && <p className="text-[10px] text-red-500 text-center font-bold uppercase">{otpError}</p>}
                        <button 
                          onClick={handleValidateOtp}
                          disabled={isOtpValidating || !otpCode}
                          className="w-full bg-accent hover:opacity-90 disabled:opacity-50 text-black font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 btn-premium"
                        >
                          {isOtpValidating ? <Loader2 size={14} className="animate-spin" /> : (language === 'es' ? 'Validar código' : 'Valider le code')}
                        </button>
                        <button 
                          onClick={handleRequestSupportForTransfer}
                          disabled={isSendingSupport}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-accent font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                          {isSendingSupport ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                          {language === 'es' ? 'Contactar soporte' : "Contacter l'assistance"}
                        </button>
                        <button 
                          onClick={handleDiscardAndNew}
                          className="w-full bg-zinc-950 hover:bg-zinc-900 border border-red-500/20 text-red-400 hover:text-red-300 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                          <X size={12} />
                          {language === 'es' ? 'Cancelar transferencia' : 'Annuler le transfert'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {transferProgress === 100 && (
                    <motion.div 
                      key="success-notice"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center gap-4"
                    >
                      <div className="p-2 bg-brand/10 rounded-lg">
                        <Check className="text-brand w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-brand">
                          {language === 'es' ? 'Transferencia completada' : 'Transfert terminé'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {language === 'es' ? 'Los fondos han sido enviados con éxito.' : 'Les fonds ont été envoyés avec succès.'}
                        </p>
                      </div>
                      <button 
                        onClick={resetTransfer}
                        className="p-2 text-zinc-500 hover:text-brand transition-colors"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </motion.div>
                  )}

                  {activeTransfer.status === 'rejected' && (
                    <motion.div 
                      key="rejected-notice"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4"
                    >
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <X className="text-red-500 w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-500">
                          {language === 'es' ? 'Transferencia rechazada' : 'Transfert rejeté'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {language === 'es' ? 'Esta transferencia ha sido rechazada por la administración.' : 'Ce transfert a été refusé par l\'administration.'}
                        </p>
                      </div>
                      <button 
                        onClick={resetTransfer}
                        className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="hidden lg:flex items-center justify-center">
              <div className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/20 relative group overflow-hidden">
                <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Shield className="w-16 h-16 text-zinc-800 mb-4 mx-auto group-hover:text-brand/20 transition-colors" />
                <p className="text-center text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                  {language === 'es' 
                    ? 'Sistema de transferencia seguro con cifrado de extremo a extremo y verificación en cada etapa crítica.' 
                    : 'Système de transfert sécurisé avec cryptage de bout en bout et vérification à chaque étape critique.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Loan Details Section */}
        {profile?.role === 'user' && userLoan && userLoan.status === 'approved' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-3 p-6 glass-card rounded-3xl border border-brand/20 bg-brand/[0.02]"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <Activity className="text-brand w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold">
                {language === 'es' ? 'Mi Préstamo Activo' : 'Mon Prêt Actif'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {language === 'es' ? 'Monto del préstamo' : 'Montant du prêt'}
                  </p>
                  <p className="text-2xl font-bold text-white">{userLoan.amount.toLocaleString()}€</p>
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalRepaid / userLoan.amount) * 100)}%` }}
                    className="h-full bg-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {language === 'es' ? 'Total reembolsado' : 'Total remboursé'}
                  </p>
                  <p className="text-lg font-bold text-brand">{totalRepaid.toLocaleString()}€</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {language === 'es' ? 'Restante por pagar' : 'Reste à payer'}
                  </p>
                  <p className="text-lg font-bold text-accent">{Math.max(0, userLoan.amount - totalRepaid).toLocaleString()}€</p>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      {language === 'es' ? 'Estado' : 'Statut'}
                    </span>
                    <span className="text-[10px] font-bold text-brand uppercase bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                      {language === 'es' ? 'Activo' : 'Actif'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      {language === 'es' ? 'Progreso' : 'Progression'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {Math.round((totalRepaid / userLoan.amount) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Repayment Form Section */}
        {profile?.role === 'user' && userLoan && userLoan.status === 'approved' && (
          <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 glass-card rounded-3xl border border-brand/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                  <Wallet className="text-brand w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold">
                  {language === 'es' ? 'Realizar un Reembolso' : 'Effectuer un Remboursement'}
                </h2>
              </div>

              <form onSubmit={handleRepayLoan} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                    {language === 'es' ? 'Monto a reembolsar (€)' : 'Montant à rembourser (€)'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                      <Coins size={16} />
                    </div>
                    <input 
                      type="number"
                      value={repaymentAmount}
                      onChange={(e) => setRepaymentAmount(e.target.value)}
                      placeholder="Ex: 250"
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-brand transition-all text-sm input-premium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                      {language === 'es' ? 'Método' : 'Méthode'}
                    </label>
                    <select 
                      value={repaymentMethod}
                      onChange={(e) => setRepaymentMethod(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand transition-all text-sm input-premium appearance-none"
                      required
                    >
                      <option value="visa">{language === 'es' ? 'Tarjeta Visa/Mastercard' : 'Carte Visa/Mastercard'}</option>
                      <option value="mobile_money">{language === 'es' ? 'Mobile Money (Orange/MTN)' : 'Mobile Money (Orange/MTN)'}</option>
                      <option value="bank_transfer">{language === 'es' ? 'Transferencia Bancaria' : 'Virement Bancaire'}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                      {language === 'es' ? 'Referencia' : 'Référence'}
                    </label>
                    <input 
                      type="text"
                      value={repaymentRef}
                      onChange={(e) => setRepaymentRef(e.target.value)}
                      placeholder={language === 'es' ? 'ID Transacción' : 'ID Transaction'}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand transition-all text-sm input-premium"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isRepaymentLoading}
                  className="w-full bg-brand hover:opacity-90 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 btn-premium"
                >
                  {isRepaymentLoading ? <Loader2 size={16} className="animate-spin" /> : (language === 'es' ? 'Confirmar el pago' : 'Confirmer le paiement')}
                </button>

                {repaymentMethod === 'bank_transfer' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-brand/5 border border-brand/10 rounded-xl space-y-2 mt-4 text-left"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
                      <CreditCard size={12} />
                      {language === 'es' ? 'Instrucciones de Transferencia' : 'Instructions de Virement'}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {language === 'es' ? 'Por favor realice su transferencia a la cuenta de la plataforma a continuación indicando la referencia de transacción ingresada arriba:' : 'Veuillez effectuer votre virement sur le compte de la plateforme ci-dessous en indiquant la référence de transaction saisie ci-dessus :'}
                    </p>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 select-all font-mono text-xs text-zinc-300 break-all">
                      {settings.bank_info || "FR76 3000 4000 1234 5678 9012 345"}
                    </div>
                  </motion.div>
                )}
              </form>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 glass-card rounded-3xl border border-zinc-800 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Clock className="text-zinc-400 w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold">
                  {language === 'es' ? 'Historial de Reembolsos' : 'Historique des Remboursements'}
                </h2>
              </div>

              <div className="flex-1 overflow-auto max-h-[300px] space-y-3 pr-2 scrollbar-premium">
                {userRepayments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 opacity-50 py-12">
                    <History size={24} />
                    <p className="text-xs uppercase font-bold tracking-widest">
                      {language === 'es' ? 'Sin historial' : 'Aucun historique'}
                    </p>
                  </div>
                ) : (
                  userRepayments.map((rep) => (
                    <div key={rep.id} className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${rep.status === 'confirmed' ? 'bg-brand/10 text-brand' : 'bg-accent/10 text-accent'}`}>
                          {rep.status === 'confirmed' ? <Check size={14} /> : <Clock size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{rep.amount.toLocaleString()}€</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{new Date(rep.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block ${
                          rep.status === 'confirmed' ? 'text-brand border-brand/20 bg-brand/5' : 'text-accent border-accent/20 bg-accent/5'
                        }`}>
                          {rep.status === 'confirmed' 
                            ? (language === 'es' ? 'pago validado' : 'paiement validé') 
                            : (language === 'es' ? 'en espera de validación' : 'en attente de validation')}
                        </p>
                        <p className="text-[8px] text-zinc-600 font-mono mt-1 uppercase">{rep.payment_method.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Transaction History Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="md:col-span-3 glass-card card-premium rounded-3xl border border-zinc-800 overflow-hidden flex flex-col"
        >
          <div className="p-8 pb-4 flex items-center justify-between border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <History className="text-blue-500 w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">
                {language === 'es' ? 'Historial de Transacciones' : 'Historique des Transactions'}
              </h2>
            </div>
            <button 
              onClick={fetchTransactions}
              disabled={isTransactionsLoading}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <RefreshCw size={16} className={isTransactionsLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            {isTransactionsLoading && transactions.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-zinc-700" size={32} />
              </div>
            ) : transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                  <History className="text-zinc-800 w-8 h-8" />
                </div>
                <p className="text-sm text-zinc-600 font-medium italic">
                  {language === 'es' ? 'No se encontraron transacciones.' : 'Aucune transaction trouvée.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/10">
                    <th className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {language === 'es' ? 'Fecha y Hora' : 'Date & Heure'}
                    </th>
                    <th className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {language === 'es' ? 'Detalles' : 'Détails'}
                    </th>
                    <th className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {language === 'es' ? 'Tipo' : 'Type'}
                    </th>
                    <th className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                      {language === 'es' ? 'Monto' : 'Montant'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {transactions.map((tx) => {
                    const isTransferSession = tx.itemType === 'transfer_session';
                    
                    // Determine Details title
                    let detailsTitle = tx.recipient_name || (language === 'es' ? 'Desconocido' : 'Inconnu');
                    if (isTransferSession) {
                      detailsTitle = language === 'es' ? `Transferencia Express a ${tx.recipient_name}` : `Transfert Express vers ${tx.recipient_name}`;
                    } else if (tx.type === 'debit_repayment') {
                      detailsTitle = language === 'es' ? 'Reembolso de Préstamo' : "Remboursement de Prêt";
                    } else if (tx.type === 'debit') {
                      detailsTitle = language === 'es' ? `Transferencia a ${tx.recipient_name}` : `Transfert vers ${tx.recipient_name}`;
                    } else if (tx.type === 'credit') {
                      detailsTitle = tx.recipient_name || (language === 'es' ? 'Depósito de fondos / Crédito' : "Dépôt de fonds / Crédit");
                    }

                    // Determine Icon and Container Color
                    let iconNode = <ArrowUpRight className="text-red-500 w-4 h-4" />;
                    let iconBgClass = "bg-red-500/10 border-red-500/20";
                    
                    if (isTransferSession) {
                      if (tx.status === 'pending') {
                        iconNode = <Clock className="text-amber-500 w-4 h-4 animate-pulse" />;
                        iconBgClass = "bg-amber-500/10 border-amber-500/20";
                      } else {
                        iconNode = <AlertCircle className="text-red-500 w-4 h-4" />;
                        iconBgClass = "bg-red-500/10 border-red-500/20";
                      }
                    } else {
                      if (tx.type === 'credit') {
                        iconNode = <ArrowDownRight className="text-brand w-4 h-4" />;
                        iconBgClass = "bg-brand/10 border-brand/20";
                      } else if (tx.type === 'debit_repayment') {
                        iconNode = <Coins className="text-amber-500 w-4 h-4" />;
                        iconBgClass = "bg-amber-500/10 border-amber-500/20";
                      }
                    }

                    // Determine Badge
                    let badgeNode = null;
                    if (isTransferSession) {
                      if (tx.status === 'pending') {
                        badgeNode = (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border text-amber-400 bg-amber-400/5 border-amber-400/10">
                              Express
                            </span>
                            <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping"></span>
                              {language === 'es' ? `En curso (${tx.progress}%)` : `En cours (${tx.progress}%)`}
                            </span>
                          </div>
                        );
                      } else {
                        badgeNode = (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border text-red-400 bg-red-400/5 border-red-400/10">
                              Express
                            </span>
                            <span className="text-[8px] text-red-500 font-bold uppercase tracking-wider">
                              {language === 'es' ? 'Cancelado' : 'Annulé'}
                            </span>
                          </div>
                        );
                      }
                    } else {
                      let typeLabel = language === 'es' ? 'Débito' : "Débit";
                      let typeBadgeColor = "text-red-400 bg-red-400/5 border-red-400/10";
                      if (tx.type === 'credit') {
                        typeLabel = language === 'es' ? 'Crédito' : "Crédit";
                        typeBadgeColor = "text-brand bg-brand/5 border-brand/10";
                      } else if (tx.type === 'debit_repayment') {
                        typeLabel = language === 'es' ? 'Reembolso' : "Remboursement";
                        typeBadgeColor = "text-amber-400 bg-amber-400/5 border-amber-400/10";
                      }
                      
                      badgeNode = (
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border ${typeBadgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            {language === 'es' ? 'Completado' : 'Terminé'}
                          </span>
                        </div>
                      );
                    }

                    // Determine Amount rendering
                    let amountNode = null;
                    if (isTransferSession) {
                      if (tx.status === 'pending') {
                        amountNode = (
                          <span className="text-sm font-bold font-mono text-zinc-400">
                            {tx.amount}€
                          </span>
                        );
                      } else {
                        amountNode = (
                          <span className="text-sm font-bold font-mono text-zinc-600 line-through">
                            {tx.amount}€
                          </span>
                        );
                      }
                    } else {
                      const isDebit = tx.type === 'debit' || tx.type === 'debit_repayment';
                      amountNode = (
                        <span className={`text-sm font-bold font-mono ${isDebit ? 'text-zinc-200' : 'text-brand'}`}>
                          {isDebit ? '-' : '+'}{tx.amount}€
                        </span>
                      );
                    }

                    return (
                      <tr key={tx.id} className="group hover:bg-zinc-800/20 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-300 font-mono">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconBgClass}`}>
                              {iconNode}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-200">{detailsTitle}</p>
                              {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                                <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{tx.user_id}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {badgeNode}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {amountNode}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </main>

      {/* Admin Section */}
      {isAdmin && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Shield className="text-blue-400 w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">
                {language === 'es' ? 'Gestión de Usuarios' : 'Gestion des Utilisateurs'}
              </h2>
            </div>
            <button 
              onClick={() => {
                fetchUsers();
                fetchAllTransfers();
                fetchAdminStats();
                fetchAllLoanRequests();
              }}
              disabled={isAdminLoading || isAdminStatsLoading || isAllLoansLoading}
              className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={(isAdminLoading || isAdminStatsLoading || isAllLoansLoading) ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Business Intelligence Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="p-6 glass-card card-premium rounded-3xl border border-zinc-800 space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                <Users size={48} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {language === 'es' ? 'Usuarios' : 'Utilisateurs'}
              </p>
              {isAdminStatsLoading ? (
                <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-white">{adminStats?.total_users || 0}</p>
              )}
              <div className="flex items-center gap-1 text-[10px] text-brand font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                {language === 'es' ? 'Cuentas Activas' : 'Comptes Actifs'}
              </div>
            </div>

            <div className="p-6 glass-card card-premium rounded-3xl border border-zinc-800 space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                <Wallet size={48} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {language === 'es' ? 'Volumen Total' : 'Volume Total'}
              </p>
              {isAdminStatsLoading ? (
                <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-white">{adminStats?.total_balance?.toLocaleString() || 0}€</p>
              )}
              <div className="text-[10px] text-zinc-500 font-bold">
                {language === 'es' ? 'Liquidez de Plataforma' : 'Liquidités Plateforme'}
              </div>
            </div>

            <div className="p-6 glass-card card-premium rounded-3xl border border-zinc-800 space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                <Send size={48} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {language === 'es' ? 'Sesiones de Transferencia' : 'Sessions Transfert'}
              </p>
              {isAdminStatsLoading ? (
                <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-white">{adminStats?.total_transfers || 0}</p>
              )}
              <div className="text-[10px] text-accent font-bold">
                {language === 'es' ? 'En curso / Historial' : 'En cours / Historique'}
              </div>
            </div>

            <div className="p-6 glass-card card-premium rounded-3xl border border-zinc-800 space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                <BarChart size={48} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {language === 'es' ? 'Transacciones' : 'Transactions'}
              </p>
              {isAdminStatsLoading ? (
                <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-white">{adminStats?.total_transactions || 0}</p>
              )}
              <div className="text-[10px] text-brand font-bold">
                {language === 'es' ? 'Procesadas con éxito' : 'Traitées avec succès'}
              </div>
            </div>
          </div>

          {/* Transfers Monitoring */}
          <div className="mb-12 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={14} className="text-brand animate-spin-slow" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {language === 'es' ? 'Live Monitor: Transferencias Activas' : 'Live Monitor: Transferts Actifs'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTransfers.filter(t => t.status === 'pending').map((t) => (
                <div key={t.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3 card-premium">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-zinc-300">{t.recipient_name}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.amount}€</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[8px] font-bold text-accent uppercase tracking-widest animate-pulse">
                      Processing
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-zinc-500">
                      <span>{language === 'es' ? 'Progreso' : 'Progression'}</span>
                      <span>{t.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${t.progress}%` }}
                        className="h-full bg-brand"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTransferDetails(t)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Eye size={12} />
                    {language === 'es' ? 'Ver detalles' : 'Voir détails'}
                  </button>
                </div>
              ))}
              {allTransfers.filter(t => t.status === 'pending').length === 0 && (
                <div className="col-span-full p-8 border border-dashed border-zinc-800 rounded-2xl text-center">
                  <p className="text-xs text-zinc-600 italic">
                    {language === 'es' ? 'Ninguna transferencia activa por el momento.' : 'Aucun transfert actif pour le moment.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* OTP Codes Section */}
          <div className="mb-12 space-y-4">
            <div className="p-8 glass-card rounded-3xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                  <Key className="text-accent w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {language === 'es' ? 'Gestión de Códigos OTP' : 'Gestion des Codes OTP'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {language === 'es' ? 'Gestione los códigos de acceso administrativos para transferencias bloqueadas.' : "Gérez les codes d'accès administratifs pour les transferts bloqués."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchAdminCodes}
                  disabled={isAdminCodesLoading}
                  className="p-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={20} className={isAdminCodesLoading ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode}
                  className="px-6 py-3 bg-accent text-black font-bold rounded-xl hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingCode ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                  {language === 'es' ? 'Generar un código' : 'Générer un code'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {adminCodes.map((c) => (
                <div 
                  key={c.id} 
                  className={`p-4 bg-zinc-900/40 border rounded-2xl flex flex-col gap-2 transition-colors ${
                    c.is_used ? 'border-zinc-800 opacity-60' : 'border-accent/20 bg-accent/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono font-bold text-white tracking-widest">{c.code}</span>
                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      c.is_used 
                        ? 'text-zinc-500 bg-zinc-800 border-zinc-700' 
                        : 'text-brand bg-brand/10 border-brand/20 animate-pulse'
                    }`}>
                      {c.is_used ? (language === 'es' ? 'Usado' : 'Utilisé') : (language === 'es' ? 'Activo' : 'Actif')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[9px] font-mono text-zinc-500">
                      {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {adminCodes.length === 0 && (
                <div className="col-span-full p-8 border border-dashed border-zinc-800 rounded-3xl text-center">
                  <p className="text-xs text-zinc-600 italic">
                    {language === 'es' ? 'Ningún código generado por el momento.' : 'Aucun code généré pour le moment.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Loan Requests Management */}
          <div className="mb-12 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Coins size={14} className="text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {language === 'es' ? 'Gestión de Solicitudes de Préstamo' : 'Gestion des Demandes de Prêt'}
              </span>
            </div>
            
            <div className="glass-card rounded-3xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/30">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {language === 'es' ? 'Usuario' : 'Utilisateur'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Monto' : 'Montant'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Duración' : 'Durée'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Modalidad' : 'Modalité'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Estado' : 'Statut'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                        {language === 'es' ? 'Acciones' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {allLoanRequests.map((loan) => (
                      <tr key={loan.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-200">
                              {loan.user?.full_name || loan.user?.email || 'N/A'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {loan.user?.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-white">
                          {loan.amount.toLocaleString()}€
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-zinc-300">
                          {loan.duration_months} {language === 'es' ? 'Meses' : 'Mois'}
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-zinc-300 capitalize">
                          {loan.repayment_method === 'monthly' 
                            ? (language === 'es' ? 'Mensual' : 'Mensuel') 
                            : (language === 'es' ? 'Trimestral' : 'Trimestriel')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            loan.status === 'approved' ? 'text-brand bg-brand/10 border-brand/20' :
                            loan.status === 'rejected' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                            'text-accent bg-accent/10 border-accent/20'
                          }`}>
                            {loan.status === 'pending' ? (language === 'es' ? 'En espera' : 'En attente') :
                             loan.status === 'approved' ? (language === 'es' ? 'Aprobado' : 'Approuvé') : (language === 'es' ? 'Rechazado' : 'Refusé')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {loan.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveLoan(loan.id)}
                                  className="px-3 py-1.5 bg-brand text-black text-[10px] font-bold uppercase rounded-lg hover:opacity-90 transition-all btn-premium"
                                >
                                  {language === 'es' ? 'Aprobar' : 'Approuver'}
                                </button>
                                <button
                                  onClick={() => handleRejectLoan(loan.id)}
                                  className="px-3 py-1.5 bg-zinc-800 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase rounded-lg hover:bg-red-500/10 transition-all"
                                >
                                  {language === 'es' ? 'Rechazar' : 'Rejeter'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allLoanRequests.length === 0 && !isAllLoansLoading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm italic">
                          {language === 'es' ? 'Ninguna solicitud de préstamo encontrada.' : 'Aucune demande de prêt trouvée.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Admin Repayments Management */}
          <div className="mb-12 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <History size={14} className="text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {language === 'es' ? 'Validación de Reembolsos' : 'Validation des Remboursements'}
              </span>
            </div>
            
            <div className="glass-card rounded-3xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/30">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {language === 'es' ? 'Usuario' : 'Utilisateur'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Monto' : 'Montant'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Método' : 'Méthode'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Referencia' : 'Référence'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                        {language === 'es' ? 'Estado' : 'Statut'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                        {language === 'es' ? 'Acciones' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {allRepayments.map((rep) => (
                      <tr key={rep.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-200">
                              {rep.user?.full_name || rep.user?.email || 'N/A'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {rep.user?.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-white">
                          {rep.amount.toLocaleString()}€
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-bold text-zinc-400 uppercase">
                          {rep.payment_method.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-mono text-zinc-500">
                          {rep.external_reference || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            rep.status === 'confirmed' ? 'text-brand bg-brand/10 border-brand/20' :
                            'text-accent bg-accent/10 border-accent/20'
                          }`}>
                            {rep.status === 'pending' ? (language === 'es' ? 'En espera' : 'En attente') : (language === 'es' ? 'Validado' : 'Validé')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {rep.status === 'pending' && (
                              <button
                                onClick={() => handleValidateRepayment(rep.id)}
                                className="px-3 py-1.5 bg-brand text-black text-[10px] font-bold uppercase rounded-lg hover:opacity-90 transition-all"
                              >
                                {language === 'es' ? 'Validar pago' : 'Valider paiement'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allRepayments.length === 0 && !isAllRepaymentsLoading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm italic">
                          {language === 'es' ? 'Ningún reembolso en espera.' : 'Aucun remboursement en attente.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/30">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {language === 'es' ? 'Usuario' : 'Utilisateur'}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                      {language === 'es' ? 'Rol' : 'Rôle'}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
                      {language === 'es' ? 'Saldo Actual' : 'Solde Actuel'}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">
                      {language === 'es' ? 'Acción' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-200">
                            {u.full_name || (language === 'es' ? 'Sin nombre' : 'Sans nom')}
                          </span>
                          <span className="text-xs text-zinc-500">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {u.role !== 'user' && (
                          <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-full border ${
                            u.role === 'superadmin' ? 'text-accent bg-accent/5 border-accent/10' :
                            u.role === 'admin' ? 'text-blue-400 bg-blue-400/5 border-blue-400/10' :
                            'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
                          }`}>
                            {u.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-zinc-300">
                        {u.balance}€
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <div className="relative">
                            <input 
                              type="number"
                              placeholder="0.00"
                              value={newBalances[u.id] || ''}
                              onChange={(e) => setNewBalances({...newBalances, [u.id]: e.target.value})}
                              className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand/50 transition-colors"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">€</span>
                          </div>
                          <button
                            onClick={() => handleUpdateBalance(u.id)}
                            disabled={updateStatus?.id === u.id && updateStatus?.state === 'loading'}
                            className="bg-zinc-200 hover:bg-white text-black px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
                          >
                            {updateStatus?.id === u.id ? (
                              updateStatus.state === 'loading' ? <RefreshCw size={12} className="animate-spin" /> :
                              updateStatus.state === 'success' ? <Check size={12} /> :
                              updateStatus.state === 'error' ? <X size={12} /> :
                              (language === 'es' ? 'Actualizar' : 'Mettre à jour')
                            ) : (language === 'es' ? 'Actualizar' : 'Mettre à jour')}
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={isDeletingUser === u.id}
                              title={language === 'es' ? 'Eliminar usuario' : "Supprimer l'utilisateur"}
                              className="p-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                            >
                              {isDeletingUser === u.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          )}
                        </div>
                        {updateStatus?.id === u.id && updateStatus.state === 'error' && (
                          <p className="text-[10px] text-red-500 text-right mt-1">{updateStatus.message}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                  {allUsers.length === 0 && !isAdminLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-sm italic">
                        {language === 'es' ? 'Ningún usuario encontrado.' : 'Aucun utilisateur trouvé.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      )}
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="py-8"
          >
            <AppSettings role={profile?.role} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Details Modal */}
      <AnimatePresence>
        {selectedTransferDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransferDetails(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                    <Info className="text-emerald-400 w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white">
                    {language === 'es' ? 'Detalles de la Transferencia' : 'Détails du Transfert'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedTransferDetails(null)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {language === 'es' ? 'ID Usuario' : 'ID Utilisateur'}
                    </p>
                    <p className="text-xs font-mono text-zinc-300 truncate">{(selectedTransferDetails as any).user_id || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {language === 'es' ? 'Estado' : 'Statut'}
                    </p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      selectedTransferDetails.status === 'completed' ? 'text-brand bg-brand/5 border-brand/10' : 'text-accent bg-accent/5 border-accent/10'
                    }`}>
                      {selectedTransferDetails.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {language === 'es' ? 'Monto' : 'Montant'}
                    </p>
                    <p className="text-lg font-bold text-white">{selectedTransferDetails.amount}€</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {language === 'es' ? 'Progreso' : 'Progression'}
                    </p>
                    <p className="text-lg font-bold text-brand">{selectedTransferDetails.progress}%</p>
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {language === 'es' ? 'Beneficiario' : 'Bénéficiaire'}
                  </p>
                  <p className="text-sm font-semibold text-zinc-200">{selectedTransferDetails.recipient_name}</p>
                  {selectedTransferDetails.iban && (
                    <p className="text-xs text-zinc-400 font-mono mt-1">
                      <span className="font-bold text-zinc-500 uppercase tracking-wider mr-1.5">IBAN:</span>
                      {selectedTransferDetails.iban}
                    </p>
                  )}
                  {selectedTransferDetails.motif && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <span className="font-bold text-zinc-500 uppercase tracking-wider mr-1.5">
                        {language === 'es' ? 'Concepto:' : 'Motif :'}
                      </span>
                      {selectedTransferDetails.motif}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">
                    <span>
                      {selectedTransferDetails.progress < 20 
                        ? (language === 'es' ? 'Inicialización' : 'Initialisation') 
                        : selectedTransferDetails.progress < 60 
                        ? (language === 'es' ? 'Validación de Red' : 'Validation Réseau') 
                        : selectedTransferDetails.progress < 85 
                        ? (language === 'es' ? 'Aseguramiento' : 'Sécurisation') 
                        : (language === 'es' ? 'Verificación Final' : 'Vérification Finale')}
                    </span>
                    <span className="text-brand">{selectedTransferDetails.progress}%</span>
                  </div>
                  <div className="h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50 p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedTransferDetails.progress}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-brand rounded-full relative animate-pulse-glow"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>

                {/* Accept / Reject Controls */}
                {selectedTransferDetails.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAcceptTransfer(selectedTransferDetails.id)}
                      disabled={isProcessingTransfer}
                      className="w-full py-2.5 bg-brand hover:opacity-90 disabled:opacity-50 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessingTransfer ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                      {language === 'es' ? 'Aceptar' : 'Accepter'}
                    </button>
                    <button
                      onClick={() => handleRejectTransfer(selectedTransferDetails.id)}
                      disabled={isProcessingTransfer}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessingTransfer ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                      {language === 'es' ? 'Rechazar' : 'Rejeter'}
                    </button>
                  </div>
                )}

                {/* Admin Force Progress Controls */}
                <div className="p-4 bg-accent/5 rounded-2xl border border-accent/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="text-accent w-4 h-4" />
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                      {language === 'es' ? 'Control de Administrador' : 'Contrôle Administrateur'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        placeholder={language === 'es' ? 'Nuevo %' : 'Nouv. %'}
                        value={forceProgressValue}
                        onChange={(e) => setForceProgressValue(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">%</span>
                    </div>
                    <button 
                      onClick={handleForceProgress}
                      disabled={isForcingProgress || !forceProgressValue}
                      className="px-4 py-2 bg-accent text-black font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      {isForcingProgress ? <Loader2 size={12} className="animate-spin" /> : (language === 'es' ? 'Forzar' : "Forcer")}
                    </button>
                  </div>
                  {forceProgressError && <p className="text-[9px] text-red-500 font-bold px-1">{forceProgressError}</p>}
                </div>
              </div>

              <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 text-center">
                <button 
                  onClick={() => setSelectedTransferDetails(null)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                >
                  {language === 'es' ? 'Cerrar' : 'Fermer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-16 pb-8 border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default opacity-40 hover:opacity-100">
            <Lock size={14} className="text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">AES-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default opacity-40 hover:opacity-100">
            <Shield size={14} className="text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">PCI-DSS Compliant</span>
          </div>
        </div>
        
        <p className="text-[10px] text-zinc-600 font-medium">
          {settings.footer_text || (language === 'es' ? "© Todos los derechos reservados. Plataforma de servicios financieros." : "© Tous droits réservés. Plateforme de services financiers.")}
        </p>
      </footer>
    </div>
  </div>
);
}
