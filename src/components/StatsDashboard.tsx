import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  History, 
  Calendar,
  User,
  GraduationCap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getDashboardStats } from '../services/firebaseService';

export default function StatsDashboard() {
  const [stats, setStats] = useState<{ total: number; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      const data = await getDashboardStats();
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ivory-orange"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-card p-12 text-center rounded-3xl">
        <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Statistiques non disponibles</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          La base de données n'est pas encore configurée ou accessible. Les statistiques apparaîtront ici dès que les premiers élèves utiliseront l'application.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-3xl bg-slate-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Users size={80} />
          </div>
          <p className="text-xs font-bold text-ivory-orange uppercase tracking-widest mb-1">Total Utilisateurs</p>
          <p className="text-5xl font-black">{stats.total}</p>
          <p className="text-sm text-slate-400 mt-2">Calculations d'orientation effectuées</p>
        </div>
        
        <div className="glass-card p-8 rounded-3xl flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dernière activité</p>
          <div className="flex items-center gap-3">
             <Calendar size={24} className="text-ivory-orange" />
             <p className="text-lg font-bold text-slate-800">
               {stats.recent.length > 0 
                 ? new Date(stats.recent[0].timestamp?.seconds * 1000).toLocaleDateString('fr-FR', {
                     day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                   })
                 : "Aucune donnée"}
             </p>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="glass-card p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <History size={24} className="text-ivory-orange" />
          <h3 className="text-xl font-bold text-slate-800">Détails des dernières orientations</h3>
        </div>

        <div className="space-y-3">
          {stats.recent.length === 0 ? (
            <p className="text-center py-8 text-slate-400 italic">Aucune donnée pour le moment.</p>
          ) : (
            stats.recent.map((entry) => (
              <div 
                key={entry.id} 
                className="border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 transition-colors bg-white/50"
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{entry.studentName}</p>
                      <p className="text-xs text-slate-500">{entry.school} • {entry.matricule}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-400 uppercase">MO</p>
                      <p className="font-black text-ivory-orange">{entry.mo.toFixed(2)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-400 uppercase">Série</p>
                      <p className="font-black text-ivory-green">{entry.serie}</p>
                    </div>
                    {expandedId === entry.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
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
                        {new Date(entry.timestamp?.seconds * 1000).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
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
