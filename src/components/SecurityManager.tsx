import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LockKeyhole, AlertTriangle, Eye, Terminal, Clock, RefreshCw } from 'lucide-react';

interface SecurityLog {
  id: string;
  event: string;
  timestamp: Date;
  details: string;
  ip?: string;
  severity: 'info' | 'warning' | 'critical';
}

interface SecurityManagerProps {
  language: 'fr' | 'es';
  securityLogs: SecurityLog[];
  onLogSecurityEvent: (event: string, details: string, severity: 'info' | 'warning' | 'critical') => void;
}

export const SecurityManager: React.FC<SecurityManagerProps> = ({
  language,
  securityLogs,
  onLogSecurityEvent
}) => {
  const t = (fr: string, es: string) => language === 'es' ? es : fr;

  const severityColors = {
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  const handleTestEvent = () => {
    onLogSecurityEvent(
      t("Audit de sécurité", "Auditoría de seguridad"),
      t("L'administrateur a déclenché un audit manuel de conformité.", "El administrador inició una auditoría manual de cumplimiento."),
      'info'
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-[#794cff]" size={24} />
            <span>{t("Sécurité, Règles de Risque & Logs", "Seguridad, Reglas de Riesgo y Logs")}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {t("Supervisez l'intégrité de la plateforme bancaire, les règles de conformité et l'audit de sécurité.", "Supervise la integridad de la plataforma bancaria, las reglas de cumplimiento y la auditoría de seguridad.")}
          </p>
        </div>
        <button
          onClick={handleTestEvent}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 btn-premium"
        >
          <RefreshCw size={12} />
          <span>{t("Tester Audit", "Probar Auditoría")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: compliance rules engine */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 glass-card rounded-3xl border border-zinc-800 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                {t("Moteur de Conformité & Risques Financiers", "Motor de Cumplimiento y Riesgos Financieros")}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/60 space-y-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Rule CO-04: Multi-Factor Authentication enforcement</span>
                </p>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  {t("Tous les transferts dépassant le seuil utilisateur configuré déclenchent l'envoi immédiat d'un code de sécurité OTP par e-mail.", "Todas las transferencias que superan el límite de usuario configurado activan el envío inmediato de un código de seguridad OTP por correo electrónico.")}
                </p>
              </div>

              <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/60 space-y-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Rule FI-09: Real-time fraud detection engine</span>
                </p>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  {t("L'analyse dynamique vérifie les coordonnées bancaires saisies (IBAN, BIC) par rapport aux bases de données officielles de la zone SEPA.", "El análisis dinámico verifica las coordenadas bancarias ingresadas (IBAN, BIC) con respecto a las bases de datos oficiales de la zona SEPA.")}
                </p>
              </div>

              <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/60 space-y-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Rule CO-02: Compliance reporting under ECB sandbox</span>
                </p>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  {t("Toutes les transactions bancaires et les configurations d'utilisateurs sont cryptées de bout en bout et loggées sous certificat d'authenticité.", "Todas las transacciones bancarias y las configuraciones de usuarios están encriptadas de extremo a extremo y registradas bajo certificado de autenticidad.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: live security logs list */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 glass-card rounded-3xl border border-zinc-800 flex flex-col h-[460px]">
            <div className="flex items-center gap-2.5 mb-6">
              <Terminal className="text-[#794cff]" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                {t("Logs d'Audit & Activités Système", "Logs de Auditoría y Actividades de Sistema")}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-premium">
              {securityLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-4 opacity-50 space-y-2">
                  <Clock size={24} className="text-zinc-700" />
                  <p className="text-[10px] uppercase font-bold tracking-wider">{t("Aucun Log", "Sin Logs")}</p>
                </div>
              ) : (
                securityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl hover:border-zinc-800/80 transition-all space-y-1.5 text-xs font-mono"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-zinc-300 uppercase tracking-tight text-[11px]">{log.event}</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${severityColors[log.severity]}`}>
                        {log.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{log.details}</p>
                    <div className="flex items-center justify-between text-[8px] text-zinc-600 border-t border-zinc-900/40 pt-1.5">
                      <span>IP: {log.ip || 'Local Network'}</span>
                      <span>{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
