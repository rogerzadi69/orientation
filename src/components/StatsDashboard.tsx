import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  History, 
  Calendar,
  User,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RefreshCw,
  Download,
  Trash2,
  Trash
} from 'lucide-react';
import { getDashboardStats, ADMIN_EMAIL, deleteSubmission, clearAllSubmissions } from '../services/firebaseService';

export default function StatsDashboard({ user }: { user?: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [debugInfo, setDebugInfo] = useState<string>('');

  const loadStats = async () => {
    setLoading(true);
    setDebugInfo('Chargement...');
    const data = await getDashboardStats();
    if (data && data.error) {
      setError(data.error);
      setDebugInfo(`Erreur: ${data.error}`);
    } else {
      setStats(data);
      setError(null);
      setDebugInfo(`Succès: total=${data.total}, recents=${data.recent.length}`);
    }
    setLoading(false);
  };

  const exportToExcel = () => {
    if (!stats || !stats.recent.length) return;
    setIsExporting(true);
    
    try {
      const headers = ['Date', 'Nom', 'Matricule', 'École', 'Série', 'MO', 'MGA', 'Public', 'Privé'];
      const rows = stats.recent.map((entry: any) => [
        new Date(entry.timestamp?.seconds * 1000).toLocaleString('fr-FR'),
        entry.studentName,
        entry.matricule,
        entry.school,
        entry.serie,
        entry.mo.toFixed(2),
        entry.mga || 'N/A',
        entry.admissiblePublic ? 'Admissible' : 'Non',
        entry.admissiblePrive ? 'Possible' : 'Non'
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map((r: any[]) => r.join(';'))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `orientations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
      alert("Erreur lors de l'exportation.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'orientation de ${name} (${id}) ? Cette action est irréversible.`)) {
      return;
    }

    const res = await deleteSubmission(id);
    if (res.success) {
      loadStats();
    } else {
      alert("Erreur de suppression : " + res.error);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    setDebugInfo("Initialisation...");
    try {
      const res = await clearAllSubmissions();
      if (res.success) {
        await loadStats();
        setDebugInfo("Succès");
        alert("Base de données vidée.");
      } else {
        setDebugInfo(`Erreur: ${res.error}`);
        alert("Erreur: " + res.error);
      }
    } catch (err: any) {
      setDebugInfo(`Crash: ${err.message}`);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ivory-orange"></div>
        <p className="text-slate-400 text-sm animate-pulse">Chargement des données...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass-card p-12 text-center rounded-3xl space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <BarChart3 size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">Données non accessibles</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            {error || "La base de données n'est pas encore configurée ou accessible."}
          </p>
          {error && error.toLowerCase().includes('offline') && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mt-4 text-left">
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                <strong>Mode Hors-ligne :</strong> L'application n'arrive pas à contacter les serveurs Firebase. 
                Cela arrive souvent dans les environnements de test ou si Firestore n'est pas encore activé.
              </p>
              <ul className="text-[10px] text-blue-600 list-disc ml-4 mt-2 space-y-1">
                <li>Rafraîchir la page (F5)</li>
                <li>Vérifier que Firestore est bien activé dans votre console Firebase</li>
                <li>Vérifer que la base de données est en mode "Standard" ou "Enterprise"</li>
              </ul>
            </div>
          )}
          {error && error.includes('permission') && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-4 text-left">
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                <strong>Problème de Permission :</strong> Vos droits d'administrateur n'ont pas encore été reconnus par le serveur. Vérifiez que vous êtes bien connecté avec l'adresse <strong>{ADMIN_EMAIL}</strong>.
              </p>
            </div>
          )}
        </div>
        <button 
          onClick={loadStats}
          className="btn-secondary mx-auto"
        >
          <RotateCcw size={16} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative group overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl transition-all hover:shadow-orange-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-ivory-orange/20 to-transparent opacity-30 group-hover:opacity-40 transition-opacity"></div>
          <div className="absolute -top-12 -right-12 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Users size={160} className="text-white" />
          </div>
          
          <div className="relative p-8 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-ivory-orange/20 flex items-center justify-center border border-ivory-orange/30">
                  <Users size={16} className="text-ivory-orange" />
                </div>
                <p className="text-[10px] font-bold text-ivory-orange uppercase tracking-[0.2em]">Volume d'Activité</p>
              </div>
              
              <button 
                onClick={loadStats} 
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory-orange hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group/btn"
                title="Actualiser les données"
              >
                <RotateCcw size={18} className={loading ? "animate-spin" : "group-hover/btn:rotate-180 transition-transform duration-500"} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Utilisateurs & Soumissions</h3>
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap min-w-0">
                <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter drop-shadow-sm truncate min-w-0">
                  {stats.total ?? 0}
                </p>
                <div className="px-2 py-0.5 rounded-full bg-ivory-orange/10 border border-ivory-orange/20 shrink-0 mb-1 lg:mb-2">
                  <p className="text-[10px] font-bold text-ivory-orange tracking-normal">+ Enregistré</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px]">
                Globalité des orientations enregistrées et des profils élèves identifiés dans le système.
              </p>
              {debugInfo && (
                <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                  <div className="w-1.5 h-1.5 rounded-full bg-ivory-green animate-pulse"></div>
                  <p className="text-[9px] font-mono text-ivory-green truncate uppercase tracking-tighter">{debugInfo}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="glass-card p-8 rounded-[2rem] border-slate-100/50 shadow-xl flex flex-col justify-between relative overflow-hidden bg-white group select-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
          
          <div className="flex flex-col gap-1 relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ivory-green/10 flex items-center justify-center border border-ivory-green/20">
                <Calendar size={16} className="text-ivory-green" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Flux Temps Réel</p>
            </div>
            
            <h3 className="text-[11px] font-medium text-slate-500 mb-1">Dernière mise à jour détectée</h3>
            <p className="text-2xl font-black text-slate-900 group-hover:text-ivory-green transition-colors">
               {stats.recent.length > 0 
                 ? (stats.recent[0].timestamp?.seconds 
                    ? new Date(stats.recent[0].timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                      })
                    : "Traitement en cours...")
                 : "En attente de données"}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between relative">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                  <User size={10} className="text-slate-400" />
                </div>
              ))}
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">
                +{stats.total > 3 ? stats.total - 3 : 0}
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 italic">Synchronisation Cloud Active</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="glass-card p-8 rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <History size={24} className="text-ivory-orange" />
            <h3 className="text-xl font-bold text-slate-800">Détails des dernières orientations</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              title="Rafraîchir la liste"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualiser la liste</span>
            </button>
            <button 
              onClick={exportToExcel}
              disabled={isExporting || !stats?.recent?.length}
              className="flex items-center gap-2 px-4 py-2 bg-ivory-green/10 hover:bg-ivory-green/20 text-ivory-green rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              title="Exporter vers Excel (CSV)"
            >
              <Download size={16} />
              <span className="hidden sm:inline">{isExporting ? 'Exportation...' : 'Exporter Excel'}</span>
            </button>
            {user && (
              <div className="flex items-center gap-2">
                {!showClearConfirm ? (
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    disabled={loading || (stats?.total === 0 && !stats?.recent?.length)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    title="Supprimer toutes les données"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Vider la base</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-red-100 p-1 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={handleClearAll}
                      disabled={isClearing}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isClearing ? 'Suppression...' : 'Confirmer ?'}
                    </button>
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      disabled={isClearing}
                      className="px-3 py-1.5 bg-white text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 relative">
          {loading && stats && (
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
              <RefreshCw className="animate-spin text-ivory-orange" />
            </div>
          )}
          
          {stats.recent.length === 0 ? (
            <p className="text-center py-8 text-slate-400 italic">Aucune donnée pour le moment.</p>
          ) : (
            stats.recent.map((entry) => (
              <div 
                key={entry.id} 
                className="border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 transition-colors bg-white/50 group"
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{entry.studentName}</p>
                      <p className="text-xs text-slate-500">{entry.school} • {entry.matricule}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-400 uppercase">MO</p>
                      <p className="font-black text-ivory-orange">{entry.mo.toFixed(2)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-400 uppercase">Série</p>
                      <p className="font-black text-ivory-green">{entry.serie}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {user && (
                        <button 
                          onClick={(e) => handleDelete(e, entry.id, entry.studentName)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Supprimer cette entrée"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                      {expandedId === entry.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </div>
                </div>

                {expandedId === entry.id && (
                  <div className="p-6 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">MGA</p>
                      <p className="text-sm font-bold text-slate-700">{entry.mga || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Public</p>
                      <p className={`text-sm font-bold ${entry.admissiblePublic ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.admissiblePublic ? 'Admissible' : 'Non Admissible'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Privé</p>
                      <p className={`text-sm font-bold ${entry.admissiblePrive ? 'text-blue-600' : 'text-slate-500'}`}>
                        {entry.admissiblePrive ? 'Possible' : 'Non'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                      <p className="text-xs font-medium text-slate-600">
                        {entry.timestamp?.seconds 
                          ? new Date(entry.timestamp.seconds * 1000).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                            })
                          : "En cours..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
        <GraduationCap size={20} className="text-ivory-orange shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Note de l'Auteur :</strong> Ces données sont collectées à titre informatif pour permettre au Collège Kirmann de mieux accompagner ses élèves dans leurs démarches d'orientation.
        </p>
      </div>
    </div>
  );
}
