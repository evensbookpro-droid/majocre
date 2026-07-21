import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  Database, 
  FileSpreadsheet, 
  Play, 
  ArrowLeft, 
  AlertCircle, 
  X, 
  Info, 
  Globe, 
  Clock,
  RefreshCw,
  Search,
  ChevronRight
} from 'lucide-react';
import { BankImporterService } from '../lib/banks/service';
import { BankRepository } from '../lib/banks/repository';
import { DatasetMeta, ImportReport } from '../lib/banks/types';

interface BankDatasetsProps {
  role?: string;
}

const INITIAL_COUNTRIES = [
  { code: 'DE', name: 'Germany', localCode: 'BLZ (Bankleitzahl)' },
  { code: 'ES', name: 'Spain', localCode: 'Código Entidad' },
  { code: 'FR', name: 'France', localCode: 'Code Banque' },
  { code: 'BE', name: 'Belgium', localCode: 'Bank Code' },
  { code: 'IT', name: 'Italy', localCode: 'ABI / CAB' },
  { code: 'NL', name: 'Netherlands', localCode: 'Bank Code' },
  { code: 'AT', name: 'Austria', localCode: 'BLZ' },
  { code: 'PT', name: 'Portugal', localCode: 'Código' },
  { code: 'LU', name: 'Luxembourg', localCode: 'Bank Code' },
  { code: 'IE', name: 'Ireland', localCode: 'NSC' },
  { code: 'FI', name: 'Finland', localCode: 'Bank Code' }
];

export default function BankDatasets({ role }: BankDatasetsProps) {
  const isAuthorized = role === 'superadmin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importerService = BankImporterService.getInstance();
  const bankRepository = BankRepository.getInstance();

  // State
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // CSV State
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [isValidStructure, setIsValidStructure] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  
  // Options
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [rollbackOnFailure, setRollbackOnFailure] = useState<boolean>(true);
  const [showImportWizard, setShowImportWizard] = useState<boolean>(false);

  // Stats Modal / Display
  const [lastReport, setLastReport] = useState<ImportReport | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Initialize datasets metadata from local storage or defaults
  useEffect(() => {
    const cached = localStorage.getItem('bank_datasets_metadata');
    if (cached) {
      try {
        setDatasets(JSON.parse(cached));
      } catch (e) {
        initializeDefaultDatasets();
      }
    } else {
      initializeDefaultDatasets();
    }
  }, []);

  const initializeDefaultDatasets = () => {
    const defaults: DatasetMeta[] = INITIAL_COUNTRIES.map(c => ({
      id: c.code,
      countryCode: c.code,
      countryName: c.name,
      datasetName: 'No dataset uploaded',
      uploadDate: '—',
      importedRows: 0,
      updatedRows: 0,
      ignoredRows: 0,
      errors: 0,
      status: 'idle'
    }));
    setDatasets(defaults);
    localStorage.setItem('bank_datasets_metadata', JSON.stringify(defaults));
  };

  const saveDatasetsMeta = (updated: DatasetMeta[]) => {
    setDatasets(updated);
    localStorage.setItem('bank_datasets_metadata', JSON.stringify(updated));
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 glass-card rounded-3xl border border-zinc-800">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="text-red-500 w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Accès Restreint</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Cette page est strictement réservée au Super Administrateur de la plateforme. Les autres utilisateurs ne peuvent pas importer de fichiers bancaires.
          </p>
        </div>
      </div>
    );
  }

  // Handle file reading
  const handleFile = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      alert('Veuillez sélectionner un fichier au format .csv');
      return;
    }

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      
      // Parse file
      const { headers, rows } = importerService.parseCSV(content);
      setParsedHeaders(headers);
      setParsedRows(rows);

      // Smart-detect country if not selected yet
      let detectedCountry = selectedCountry;
      if (!selectedCountry) {
        // Try to auto-detect country using headers
        const detected = ImporterRegistryAutoDetect(headers);
        if (detected) {
          detectedCountry = detected;
          setSelectedCountry(detected);
        } else {
          // Default to the first country if none detected
          detectedCountry = INITIAL_COUNTRIES[0].code;
          setSelectedCountry(detectedCountry);
        }
      }

      // Validate structure for the active country
      validateCSVStructureForCountry(headers, detectedCountry);
    };
    reader.readAsText(file);
  };

  const ImporterRegistryAutoDetect = (headers: string[]): string | null => {
    try {
      const detected = BankImporterService.getInstance();
      // We can also let our ImporterRegistry detect
      const registry = importerService['registry']; // internal reference or helper
      if (registry) {
        const imp = registry.detectImporter(headers);
        return imp ? imp.countryCode : null;
      }
    } catch (e) {}
    return null;
  };

  const validateCSVStructureForCountry = (headers: string[], countryCode: string) => {
    if (headers.length === 0 || !countryCode) return;
    
    const result = importerService.validateStructure(headers, countryCode);
    setIsValidStructure(result.isValid);
    if (!result.isValid) {
      setValidationError(result.error || 'Erreur de structure CSV.');
    } else {
      setValidationError('');
    }
  };

  // Drag and Drop helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Perform import
  const handleStartImport = async () => {
    if (!selectedCountry || !csvContent) return;
    setIsImporting(true);

    try {
      const report = await importerService.importDataset(
        selectedCountry,
        csvContent,
        replaceExisting,
        rollbackOnFailure
      );

      setLastReport(report);
      setShowReportModal(true);

      // Update datasets stats
      const updatedMeta = datasets.map(d => {
        if (d.countryCode === selectedCountry) {
          const success = report.errorsList.length === 0 || report.importedRows > 0;
          return {
            ...d,
            datasetName: csvFileName,
            uploadDate: new Date().toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            importedRows: replaceExisting ? report.importedRows : d.importedRows + report.importedRows,
            updatedRows: report.updatedRows,
            ignoredRows: report.ignoredRows,
            errors: report.errorsList.length,
            status: success ? 'success' : 'failed' as any
          };
        }
        return d;
      });

      saveDatasetsMeta(updatedMeta);
      
      // Reset wizard
      if (report.errorsList.length === 0 || report.importedRows > 0) {
        setShowImportWizard(false);
        setCsvContent('');
        setCsvFileName('');
        setParsedHeaders([]);
        setParsedRows([]);
        setIsValidStructure(null);
      }
    } catch (e: any) {
      alert(`Erreur d'importation : ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Delete dataset (clean table)
  const handleDeleteDataset = async (countryCode: string) => {
    const country = INITIAL_COUNTRIES.find(c => c.code === countryCode);
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la base de données bancaires pour ${country?.name || countryCode} ? Cela videra tous ses enregistrements de la table.`
    );
    if (!confirmDelete) return;

    try {
      await bankRepository.deleteBanksByCountry(countryCode);

      // Reset meta
      const updatedMeta = datasets.map(d => {
        if (d.countryCode === countryCode) {
          return {
            ...d,
            datasetName: 'No dataset uploaded',
            uploadDate: '—',
            importedRows: 0,
            updatedRows: 0,
            ignoredRows: 0,
            errors: 0,
            status: 'idle' as any
          };
        }
        return d;
      });

      saveDatasetsMeta(updatedMeta);
      alert(`Base de données de ${country?.name || countryCode} supprimée avec succès !`);
    } catch (e: any) {
      alert(`Erreur lors de la suppression : ${e.message}`);
    }
  };

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    if (parsedHeaders.length > 0) {
      validateCSVStructureForCountry(parsedHeaders, code);
    }
  };

  const openImportForCountry = (code: string, replace = true) => {
    setSelectedCountry(code);
    setReplaceExisting(replace);
    setShowImportWizard(true);
  };

  const filteredCountries = INITIAL_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/50 border border-zinc-800 rounded-3xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Database className="text-brand w-5 h-5" />
            Bases de données bancaires SEPA
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Gérez et importez les fichiers de codes guichets et d'identification des banques européennes pour la validation IBAN.
          </p>
        </div>
        {!showImportWizard && (
          <button 
            onClick={() => setShowImportWizard(true)}
            className="px-5 py-2.5 rounded-xl bg-brand text-black font-bold text-sm shadow-lg shadow-brand/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Upload size={16} />
            Importer un fichier CSV
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showImportWizard ? (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Wizard Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setShowImportWizard(false);
                  setCsvContent('');
                  setCsvFileName('');
                  setParsedHeaders([]);
                  setParsedRows([]);
                  setIsValidStructure(null);
                }}
                className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 className="text-lg font-bold text-white">Assistant d'Importation</h3>
                <p className="text-xs text-zinc-400">Suivez les étapes pour intégrer un jeu de données bancaires</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form: Drop / Select */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-card border border-zinc-800 rounded-3xl p-6 space-y-6">
                  {/* Country Choice */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <Globe size={14} className="text-brand" />
                      Pays cible
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-all"
                    >
                      <option value="">-- Sélectionner un pays --</option>
                      {INITIAL_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code}) - {c.localCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Drag area */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">Fichier de données bancaires (.csv)</label>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={triggerFileInput}
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        dragActive 
                          ? 'border-brand bg-brand/5' 
                          : csvFileName 
                            ? 'border-zinc-700 bg-zinc-900/40' 
                            : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/20'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                        className="hidden"
                      />
                      {csvFileName ? (
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto">
                            <FileSpreadsheet className="text-brand w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white truncate max-w-xs mx-auto">{csvFileName}</p>
                            <p className="text-xs text-zinc-500 mt-1">{(csvContent.length / 1024).toFixed(1)} KB</p>
                          </div>
                          <span className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                            Changer de fichier
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
                            <Upload className="text-zinc-500 w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">Glissez-déposez votre fichier ici</p>
                            <p className="text-xs text-zinc-500 mt-1">ou cliquez pour parcourir vos fichiers (.csv)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Settings / Options */}
                  <div className="space-y-4 pt-2 border-t border-zinc-800">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Options d'importation</h4>
                    
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={(e) => setReplaceExisting(e.target.checked)}
                        className="mt-1 rounded border-zinc-800 text-brand focus:ring-brand"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-brand transition-all">Remplacer le jeu de données existant</p>
                        <p className="text-[10px] text-zinc-500">Vide les anciennes banques de ce pays avant d'insérer le nouveau CSV.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rollbackOnFailure}
                        onChange={(e) => setRollbackOnFailure(e.target.checked)}
                        className="mt-1 rounded border-zinc-800 text-brand focus:ring-brand"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-brand transition-all">Annuler l'import en cas d'erreur (Rollback)</p>
                        <p className="text-[10px] text-zinc-500">Restaure la base de données à son état initial si l'import échoue.</p>
                      </div>
                    </label>
                  </div>

                  {/* Action buttons */}
                  <button
                    disabled={!selectedCountry || !csvContent || isValidStructure === false || isImporting}
                    onClick={handleStartImport}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      !selectedCountry || !csvContent || isValidStructure === false
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-brand text-black shadow-lg shadow-brand/20 hover:scale-[1.02]'
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="animate-spin w-4 h-4" />
                        Importation en cours...
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        Lancer l'importation
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Preview Pane */}
              <div className="lg:col-span-7 space-y-6">
                {/* Structural Validation status */}
                {isValidStructure !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      isValidStructure 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/5 border-red-500/20 text-red-400'
                    }`}
                  >
                    {isValidStructure ? (
                      <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {isValidStructure ? 'Structure Validée !' : 'Structure Invalide'}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        {isValidStructure 
                          ? 'Les colonnes nécessaires (Code Banque, Nom de Banque) ont été détectées et associées au modèle de données.'
                          : validationError || 'Le fichier CSV ne possède pas les colonnes d\'identification indispensables.'
                        }
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* CSV Table Preview */}
                <div className="glass-card border border-zinc-800 rounded-3xl overflow-hidden flex flex-col h-[520px]">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Aperçu du fichier CSV</h4>
                      <p className="text-[10px] text-zinc-500">Visualisation des 8 premières lignes du document</p>
                    </div>
                    {parsedRows.length > 0 && (
                      <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
                        {parsedRows.length} lignes trouvées
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto">
                    {parsedRows.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-950/50">
                            {parsedHeaders.map(h => (
                              <th key={h} className="px-4 py-3 font-semibold text-zinc-400 tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.slice(0, 8).map((row, idx) => (
                            <tr key={idx} className="border-b border-zinc-900/60 hover:bg-zinc-900/20">
                              {parsedHeaders.map(h => (
                                <td key={h} className="px-4 py-3 text-zinc-300 whitespace-nowrap overflow-hidden max-w-[160px] truncate">{row[h] || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600">
                        <FileSpreadsheet size={48} strokeWidth={1} className="mb-2" />
                        <p className="text-xs">Aucun fichier chargé pour l'aperçu.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Country Database List Grid / Table */}
            <div className="glass-card border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Rechercher un pays..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <Info size={12} className="text-zinc-500" />
                  <span>Tous les transferts SEPA interrogent ces bases de données.</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/30">
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500">Pays</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500">Fichier de Données</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500">Date d'import</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500 text-center">Lignes</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500 text-center text-red-400">Erreurs</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500">Statut</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCountries.map(country => {
                      const meta = datasets.find(d => d.countryCode === country.code) || {
                        datasetName: 'No dataset uploaded',
                        uploadDate: '—',
                        importedRows: 0,
                        errors: 0,
                        status: 'idle'
                      };

                      return (
                        <tr key={country.code} className="border-b border-zinc-900/80 hover:bg-zinc-900/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                                {country.code}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{country.name}</p>
                                <p className="text-[10px] text-zinc-500">{country.localCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-mono text-[11px] ${meta.datasetName === 'No dataset uploaded' ? 'text-zinc-600 italic' : 'text-zinc-300'}`}>
                              {meta.datasetName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-zinc-400">{meta.uploadDate}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-zinc-300">{meta.importedRows.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-semibold ${meta.errors > 0 ? 'text-red-400' : 'text-zinc-500'}`}>{meta.errors}</span>
                          </td>
                          <td className="px-6 py-4">
                            {meta.status === 'success' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Actif
                              </span>
                            ) : meta.status === 'failed' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                Échec
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                                Non configuré
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {meta.importedRows > 0 ? (
                                <>
                                  <button
                                    onClick={() => openImportForCountry(country.code, true)}
                                    title="Remplacer le fichier"
                                    className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
                                  >
                                    <RefreshCw size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDataset(country.code)}
                                    title="Supprimer les données"
                                    className="p-1.5 bg-red-950/30 border border-red-900/30 text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => openImportForCountry(country.code, false)}
                                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-brand font-bold text-[10px] uppercase tracking-wider hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                                >
                                  <Upload size={10} />
                                  Charger
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistics / Report Modal */}
      <AnimatePresence>
        {showReportModal && lastReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="relative w-full max-w-xl glass-card border border-zinc-800 rounded-3xl p-6 overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Rapport d'Importation</h3>
                    <p className="text-[10px] text-zinc-500">Exécution terminée avec succès</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4 py-6">
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Lignes créées</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{lastReport.importedRows.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Lignes mises à jour</p>
                  <p className="text-2xl font-black text-brand mt-1">{lastReport.updatedRows.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Doublons ignorés</p>
                  <p className="text-2xl font-black text-zinc-400 mt-1">{lastReport.ignoredRows.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Temps de calcul</p>
                    <p className="text-xl font-bold text-white mt-1">{lastReport.executionTimeMs} ms</p>
                  </div>
                  <Clock className="text-zinc-600 w-5 h-5 shrink-0" />
                </div>
              </div>

              {/* Error list */}
              {lastReport.errorsList.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0 border-t border-zinc-900 pt-4">
                  <p className="text-xs font-bold text-red-400 flex items-center gap-1.5 mb-2.5">
                    <AlertTriangle size={14} />
                    Alertes et erreurs rencontrées ({lastReport.errorsList.length})
                  </p>
                  <div className="flex-1 overflow-y-auto bg-zinc-950 border border-zinc-900 rounded-xl p-3 space-y-1.5 max-h-[160px]">
                    {lastReport.errorsList.map((err, idx) => (
                      <div key={idx} className="text-[10px] text-zinc-500 font-mono flex items-start gap-1.5">
                        <span className="text-red-500 shrink-0">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom dismiss */}
              <div className="pt-4 mt-4 border-t border-zinc-800 text-right">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2.5 bg-brand text-black font-bold text-xs rounded-xl shadow-lg shadow-brand/20 hover:scale-105 transition-all"
                >
                  Fermer le rapport
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
