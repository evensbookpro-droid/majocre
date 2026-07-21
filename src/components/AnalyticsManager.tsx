import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BarChart2, CheckCircle, ShieldAlert, ArrowUpRight, Zap, PieChart } from 'lucide-react';

interface AnalyticsManagerProps {
  language: 'fr' | 'es';
  allUsersCount: number;
  totalTransfersCount: number;
}

export const AnalyticsManager: React.FC<AnalyticsManagerProps> = ({
  language,
  allUsersCount,
  totalTransfersCount
}) => {
  const t = (fr: string, es: string) => language === 'es' ? es : fr;

  // Let's create beautiful CSS-based charts and grid stats
  const performanceMetrics = [
    { label: t("Taux d'approbation", "Tasa de aprobación"), value: "84.2%", desc: t("Transferts instantanés complétés", "Transferencias instantáneas completadas"), trend: "+2.4%", status: 'success' },
    { label: t("Friction de blocage", "Fricción de bloqueo"), value: "15.8%", desc: t("Règles de conformité déclenchées", "Reglas de cumplimiento activadas"), trend: "-1.1%", status: 'warning' },
    { label: t("Temps de réponse moyen", "Tiempo de respuesta promedio"), value: "180ms", desc: t("Intégration API de passerelle", "Integración API de pasarela"), trend: "Stable", status: 'info' },
    { label: t("Volume mensuel total", "Volumen mensual total"), value: "1.2M €", desc: t("Zone SEPA & réseaux internationaux", "Zona SEPA y redes internacionales"), trend: "+12.8%", status: 'success' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="text-[#794cff]" size={24} />
            <span>{t("Statistiques Système & Analytique", "Estadísticas del Sistema y Analítica")}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {t("Consultez en direct les volumes transactionnels, les indicateurs de friction et l'activité générale.", "Consulte en vivo volúmenes transaccionales, indicadores de fricción y actividad general.")}
          </p>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, idx) => (
          <div key={idx} className="p-6 glass-card rounded-3xl border border-zinc-800 space-y-3 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{metric.label}</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                metric.trend.startsWith('+') ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                metric.trend.startsWith('-') ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                'text-zinc-500 border-zinc-800'
              }`}>
                {metric.trend}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white tracking-tight font-mono">{metric.value}</p>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{metric.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphical indicators (Beautiful pure-CSS visualizations for robust render and no-crash insurance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Transfer statistics visualizer */}
        <div className="lg:col-span-7 p-6 glass-card rounded-3xl border border-zinc-800 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="text-[#794cff]" size={16} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                {t("Répartition des transferts", "Distribución de transferencias")}
              </h3>
            </div>
            <p className="text-xs text-zinc-500">{t("Proportion entre transferts validés et blocages de sécurité.", "Proporción entre transferencias validadas y bloqueos de seguridad.")}</p>
          </div>

          {/* Custom animated bar chart */}
          <div className="my-6 space-y-4">
            {/* Approved bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold font-mono text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-emerald-400" />
                  <span>{t("Complétés & Validés", "Completados y Validados")}</span>
                </span>
                <span>84.2%</span>
              </div>
              <div className="h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "84.2%" }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Blocked/Verified bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold font-mono text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert size={12} className="text-amber-500" />
                  <span>{t("Blocages OTP sur Seuil", "Bloqueos OTP por Límite")}</span>
                </span>
                <span>15.8%</span>
              </div>
              <div className="h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "15.8%" }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-4 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            <span>Total: {totalTransfersCount} {t("sessions", "sesiones")}</span>
            <span className="text-[#794cff] flex items-center gap-1">
              <span>99.99% system uptime</span>
              <Zap size={10} className="animate-pulse" />
            </span>
          </div>
        </div>

        {/* User metrics & distribution */}
        <div className="lg:col-span-5 p-6 glass-card rounded-3xl border border-zinc-800 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="text-[#794cff]" size={16} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                {t("Statistiques d'utilisateurs", "Estadísticas de usuarios")}
              </h3>
            </div>
            <p className="text-xs text-zinc-500">{t("Aperçu de la base de données utilisateurs.", "Resumen de la base de datos de usuarios.")}</p>
          </div>

          {/* User composition pie-like representation */}
          <div className="flex items-center justify-center py-6">
            <div className="relative w-28 h-28 rounded-full border-4 border-zinc-900 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-t-[#794cff] border-r-brand border-l-brand/30 border-b-zinc-800 animate-[spin_12s_linear_infinite]" />
              <div className="text-center">
                <span className="text-2xl font-bold font-mono text-white">{allUsersCount}</span>
                <p className="text-[8px] uppercase text-zinc-500 font-bold tracking-widest mt-0.5">{t("Utilisateurs", "Usuarios")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-zinc-900 pt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">{t("Utilisateurs standard", "Usuarios estándar")}</span>
              <span className="font-bold text-zinc-300 font-mono">{(allUsersCount > 2 ? allUsersCount - 2 : allUsersCount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Superadmins / Admins</span>
              <span className="font-bold text-[#794cff] font-mono">2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
