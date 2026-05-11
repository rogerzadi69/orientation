/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  User, 
  PenTool, 
  BarChart3, 
  Info, 
  Settings, 
  RotateCcw, 
  Save, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  OrientationState, 
  StudentInfo, 
  SubjectData, 
  CandidateType, 
  Thresholds 
} from './types';
import { 
  INITIAL_STATE, 
  SUBJECT_LABELS, 
  SUBJECT_COEFS, 
  DEFAULT_THRESHOLDS 
} from './constants';
import { 
  calculateAnnualAverage, 
  calculateEnglishAnnual, 
  isDataComplete 
} from './utils/calculations';
import { submitResult } from './services/firebaseService';
import StatsDashboard from './components/StatsDashboard';

export default function App() {
  const [state, setState] = useState<OrientationState>(() => {
    const saved = localStorage.getItem('orientation_seconde_data');
    if (saved) return JSON.parse(saved);
    return INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState('home');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Persistence
  useEffect(() => {
    localStorage.setItem('orientation_seconde_data', JSON.stringify(state));
  }, [state]);

  const resetData = () => {
    // Suppression de confirm() car il peut être bloqué dans l'iframe
    localStorage.removeItem('orientation_seconde_data');
    setState(JSON.parse(JSON.stringify(INITIAL_STATE)));
    setActiveTab('home');
  };

  const saveLocally = () => {
    localStorage.setItem('orientation_seconde_data', JSON.stringify(state));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Calculations
  const getSubjectResults = (key: string, data: SubjectData) => {
    const ann = calculateAnnualAverage(data);
    
    if (ann === null || data.bepc === '') return null;
    
    let bepc = Number(data.bepc);

    // Pour l'anglais normal, la note BEPC est la moyenne de l'écrit et de l'oral
    if (key === 'anglais' && state.info.typeCandidat === 'Normal') {
      if (data.oral === '') return null;
      bepc = (bepc + Number(data.oral)) / 2;
    }
    
    const totalPondere = ann + bepc;
    const coef = SUBJECT_COEFS[key] || 1;
    const contribution = totalPondere * coef;

    return { ann, bepc, totalPondere, coef, contribution };
  };

  const results = isDataComplete(state) ? (() => {
    const subResults: any = {};
    Object.keys(state.notes).forEach(key => {
      subResults[key] = getSubjectResults(key, (state.notes as any)[key]);
    });

    const moSum = (subResults.francais?.contribution || 0) +
                  (subResults.maths?.contribution || 0) +
                  (subResults.pc?.contribution || 0) +
                  (subResults.anglais?.contribution || 0);
    
    const mo = moSum / 12;

    const bilanLettres = (
      (subResults.francais?.ann + subResults.francais?.bepc) +
      (subResults.anglais?.ann + subResults.anglais?.bepc) +
      (subResults.hg?.ann + subResults.hg?.bepc)
    ) / 6;

    const bilanSciences = (
      (subResults.maths?.ann + subResults.maths?.bepc) +
      (subResults.pc?.ann + subResults.pc?.bepc) +
      (subResults.svt?.ann + subResults.svt?.bepc)
    ) / 6;

    const serie = bilanLettres > bilanSciences ? 'A' : (bilanSciences > bilanLettres ? 'C' : 'A ou C');
    
    const admisibleOfficiel = mo >= state.thresholds.moMinimale;
    const admissiblePrive = !admisibleOfficiel && 
                           state.info.mgaAnnuelle >= state.thresholds.mgaPriveMin &&
                           mo >= state.thresholds.moPriveMin && 
                           mo <= state.thresholds.moPriveMax;

    return { mo, bilanLettres, bilanSciences, serie, admisibleOfficiel, admissiblePrive, subResults };
  })() : null;

  // Track results submission once they are complete
  useEffect(() => {
    if (results && activeTab === 'results') {
      const submissionData = {
        studentName: state.info.nom,
        matricule: state.info.matricule,
        school: state.info.etablissement,
        mga: state.info.mgaAnnuelle,
        mo: results.mo,
        serie: results.serie,
        admissiblePublic: results.admisibleOfficiel,
        admissiblePrive: results.admissiblePrive,
      };
      
      // We use a small delay or a check to avoid double submission
      const lastSubmitted = sessionStorage.getItem('last_submitted_id');
      const currentId = `${state.info.nom}-${state.info.matricule}-${results.mo.toFixed(2)}`;
      
      if (lastSubmitted !== currentId) {
        submitResult(submissionData);
        sessionStorage.setItem('last_submitted_id', currentId);
      }
    }
  }, [activeTab, results]);

  const updateInfo = (field: keyof StudentInfo, value: any) => {
    setState(prev => ({ ...prev, info: { ...prev.info, [field]: value } }));
  };

  const updateNote = (subject: string, field: keyof SubjectData, value: string) => {
    const numValue = value === '' ? '' : Math.min(20, Math.max(0, parseFloat(value)));
    setState(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [subject]: { ...(prev.notes as any)[subject], [field]: numValue }
      }
    }));
  };

  const updateThreshold = (field: keyof Thresholds, value: number) => {
    setState(prev => ({ ...prev, thresholds: { ...prev.thresholds, [field]: value } }));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans lg:max-w-[1600px] lg:mx-auto">
      {/* Sidebar / Navigation */}
      <nav className="w-full md:w-72 glass-card m-0 md:m-4 rounded-b-3xl md:rounded-3xl flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-ivory-orange rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-tight">Orientation</h1>
              <p className="text-xs font-medium text-ivory-green tracking-widest uppercase">Seconde CI</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { id: 'home', label: 'Accueil', icon: Home },
              { id: 'info', label: 'Espace Élève', icon: User },
              { id: 'notes', label: 'Notes Trimestrielles', icon: PenTool },
              { id: 'results', label: 'Résultats', icon: BarChart3 },
              { id: 'details', label: 'Détails du Calcul', icon: Info },
              { id: 'guide', label: 'Mode d\'emploi', icon: GraduationCap },
              { id: 'settings', label: 'Paramètres', icon: Settings },
              { id: 'admin', label: 'Tableau de Bord', icon: BarChart3 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-ivory-orange text-white shadow-lg shadow-orange-500/30' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div className={tab.id === 'admin' ? 'text-ivory-green' : ''}>
                  <tab.icon size={20} />
                </div>
                <span className="font-semibold text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6 space-y-3">
          <div className="px-2 pb-1">
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              Vos données sont conservées localement dans ce navigateur.
            </p>
          </div>
          <button 
            onClick={saveLocally}
            className="w-full btn-secondary text-sm"
          >
            {saveStatus === 'saved' ? <CheckCircle2 size={18} className="text-ivory-green" /> : <Save size={18} />}
            {saveStatus === 'saved' ? 'Données sauvegardées' : 'Sauvegarder'}
          </button>
          <button 
            onClick={resetData}
            className="w-full btn-secondary text-sm text-red-500 border-red-100 hover:bg-red-50"
          >
            <RotateCcw size={18} />
            Réinitialiser tout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-ivory-orange rounded-full text-xs font-bold uppercase tracking-widest border border-orange-100">
                  Calculateur KIRMANN • BEPC CI
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                  Préparez votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-ivory-orange to-orange-400">Orientation</span> en Seconde
                </h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                  Saisissez vos notes de classe et de BEPC pour estimer votre orientation après la 3ème selon les critères en vigueur au ministère.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 pt-8">
                {[
                  { title: "Saisie Facile", desc: "Informations personnelles et types de candidats.", icon: User },
                  { title: "Calcul Précis", desc: "Formules automatisées incluant les pondérations en vigueur.", icon: PenTool },
                  { title: "Avis Immédiat", desc: "Orientation indicative série A ou C et accès au privé.", icon: CheckCircle2 }
                ].map((item, i) => (
                  <div key={i} className="glass-card p-6 rounded-3xl space-y-4 hover:border-ivory-orange/50 transition-all group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-ivory-orange group-hover:scale-110 transition-transform">
                      <item.icon size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setActiveTab('info')}
                  className="btn-primary group"
                >
                  Commencer le calcul
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Creator Info Section */}
              <div className="mt-12 pt-12 border-t border-slate-200">
                <div className="glass-card p-8 rounded-3xl bg-slate-50/50 border-slate-200 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-ivory-orange shadow-inner border-2 border-white">
                    <User size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="inline-block px-3 py-1 bg-ivory-orange/10 text-ivory-orange text-[10px] font-bold uppercase tracking-widest rounded-full mb-1">
                      Auteur de l'application
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Frère ZADI BLEY ROGER, Sc.</h4>
                    <p className="text-sm font-medium text-slate-500">
                      Directeur du Collège catholique Kirmann d'Abengourou
                    </p>
                    <div className="pt-4 pb-2">
                      <p className="text-sm italic text-slate-600 bg-white/50 p-4 rounded-2xl border border-slate-100">
                        "L'Auteur Frère Roger Zadi vous prie de saisir avec beaucoup d'attention les données requises et vous aurez les calculs bien faits."
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                           <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>
                        </span>
                        07 77 23 53 55
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                           <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </span>
                        bleyrogerzadi@gmail.com
                      </div>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Création</p>
                    <p className="text-sm font-bold text-slate-700">Avril 2026</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'info' && (
            <motion.div 
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                  <User size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Informations Élève</h3>
              </div>
              
              <div className="glass-card p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Nom(s) & Prénom(s)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ex: Kouassi Koffi Jean"
                    value={state.info.nom}
                    onChange={(e) => updateInfo('nom', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Matricule</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ex: 21B0001X"
                    value={state.info.matricule}
                    onChange={(e) => updateInfo('matricule', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Établissement</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ex: Lycée Moderne..."
                    value={state.info.etablissement}
                    onChange={(e) => updateInfo('etablissement', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">MGA Annuelle</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field" 
                    placeholder="0.00"
                    value={state.info.mgaAnnuelle}
                    onChange={(e) => updateInfo('mgaAnnuelle', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Année Scolaire</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ex: 2025-2026"
                    value={state.info.anneeScolaire}
                    onChange={(e) => updateInfo('anneeScolaire', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Type de Candidat</label>
                  <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                    <button 
                      onClick={() => updateInfo('typeCandidat', 'Normal')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${state.info.typeCandidat === 'Normal' ? 'bg-white shadow-sm text-ivory-orange' : 'text-slate-500'}`}
                    >Candidat Normal</button>
                    <button 
                      onClick={() => updateInfo('typeCandidat', 'TO')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${state.info.typeCandidat === 'TO' ? 'bg-white shadow-sm text-ivory-orange' : 'text-slate-500'}`}
                    >Candidat TO</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Admis au BEPC ?</label>
                  <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                    <button 
                      onClick={() => updateInfo('admisBEPC', true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${state.info.admisBEPC ? 'bg-white shadow-sm text-ivory-green' : 'text-slate-500'}`}
                    >OUI</button>
                    <button 
                      onClick={() => updateInfo('admisBEPC', false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!state.info.admisBEPC ? 'bg-red-500 shadow-sm text-white' : 'text-slate-500'}`}
                    >NON</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setActiveTab('notes')}
                  className="btn-primary"
                >
                  Suivant: Saisie des notes
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-orange-50 text-ivory-orange rounded-2xl">
                  <PenTool size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Notes Trimestrielles & BEPC</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.keys(state.notes).map((subjectKey) => {
                  const subject = (state.notes as any)[subjectKey] as SubjectData;
                  const label = SUBJECT_LABELS[subjectKey];
                  
                  return (
                    <div key={subjectKey} className="glass-card p-6 rounded-3xl space-y-4">
                      <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">{label}</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Trimestre 1</label>
                          <input 
                            type="number" 
                            className="input-field text-center font-mono" 
                            placeholder="0.0"
                            value={subject.t1}
                            onChange={(e) => updateNote(subjectKey, 't1', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Trimestre 2</label>
                          <input 
                            type="number" 
                            className="input-field text-center font-mono" 
                            placeholder="0.0"
                            value={subject.t2}
                            onChange={(e) => updateNote(subjectKey, 't2', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Trimestre 3</label>
                          <input 
                            type="number" 
                            className="input-field text-center font-mono" 
                            placeholder="0.0"
                            value={subject.t3}
                            onChange={(e) => updateNote(subjectKey, 't3', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-ivory-orange uppercase tracking-tighter">
                            {subjectKey === 'anglais' && state.info.typeCandidat === 'Normal' ? 'BEPC Écrit' : 'Note BEPC'}
                          </label>
                          <input 
                            type="number" 
                            className="input-field text-center font-mono border-orange-200" 
                            placeholder="0.0"
                            value={subject.bepc}
                            onChange={(e) => updateNote(subjectKey, 'bepc', e.target.value)}
                          />
                        </div>
                      </div>

                      {subjectKey === 'anglais' && state.info.typeCandidat === 'Normal' && (
                        <div className="pt-2 border-t border-slate-100">
                          <label className="text-[10px] font-bold text-ivory-orange uppercase tracking-tighter">BEPC Oral</label>
                          <input 
                            type="number" 
                            className="input-field text-center font-mono mt-1 border-orange-200" 
                            placeholder="0.0"
                            value={subject.oral || ''}
                            onChange={(e) => updateNote(subjectKey, 'oral', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-6">
                <button onClick={() => setActiveTab('info')} className="btn-secondary">
                  <ChevronLeft size={20} />
                  Retour
                </button>
                <button 
                  onClick={() => setActiveTab('results')}
                  className="btn-primary"
                >
                  Calculer les résultats
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {!results ? (
                <div className="glass-card p-12 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">Données incomplètes</h3>
                  <p className="text-slate-500">Veuillez vérifier que toutes les notes des matières obligatoires et les informations de l'élève ont été saisies.</p>
                  <button onClick={() => setActiveTab('notes')} className="btn-primary">Saisir les notes</button>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="glass-card p-8 rounded-3xl bg-gradient-to-br from-white to-orange-50 border-orange-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-ivory-orange/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      <h4 className="text-sm font-bold text-ivory-orange uppercase tracking-widest mb-6 border-b border-orange-100 pb-2 flex items-center gap-2">
                        <BarChart3 size={18} />
                        Moyenne d'Orientation
                      </h4>
                      <div className="space-y-2">
                        <p className="text-6xl font-black text-slate-900 tracking-tighter">
                          {results.mo.toFixed(2)}
                        </p>
                        <p className="text-sm font-medium text-slate-400">Sur 20.00 pts</p>
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-orange-100 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${results.admisibleOfficiel ? 'bg-ivory-green text-white' : 'bg-red-50 text-red-400'}`}>
                          {results.admisibleOfficiel ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Avis d'Orientation</p>
                          <p className="text-sm text-slate-500">
                            {results.admisibleOfficiel 
                               ? "Admissible en Seconde (Public)" 
                               : (results.admissiblePrive ? "Admissible Privé Uniquement" : "Non Orientable")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="glass-card p-6 rounded-3xl">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Profil Académique</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-600">Série Proposée</span>
                            <span className="px-4 py-1 bg-ivory-green text-white text-lg font-black rounded-xl">Seconde {results.serie}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                             <div 
                               className="bg-ivory-orange h-full" 
                               style={{ width: `${(results.bilanLettres / (results.bilanLettres + results.bilanSciences)) * 100}%` }}
                             ></div>
                             <div 
                               className="bg-blue-500 h-full" 
                               style={{ width: `${(results.bilanSciences / (results.bilanLettres + results.bilanSciences)) * 100}%` }}
                             ></div>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                             <span>Bilan Lettres: {results.bilanLettres.toFixed(2)}</span>
                             <span>Bilan Sciences: {results.bilanSciences.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-card p-6 rounded-3xl border ${results.admissiblePrive ? 'border-blue-200 bg-blue-50' : 'border-slate-100'}`}>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Inscription au Privé</h4>
                        <p className={`text-sm font-medium ${results.admissiblePrive ? 'text-blue-700' : 'text-slate-500'}`}>
                          {results.admissiblePrive 
                            ? "Conditionnelle : Possible car MO ≥ 9.00 et MGA ≥ 10.00" 
                            : (results.admisibleOfficiel ? "Admission possible (Seuil standard)" : "Non éligible")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button onClick={() => setActiveTab('details')} className="btn-secondary">
                      <Info size={20} />
                      Voir les détails des calculs
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                  <Info size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Détails des Calculs</h3>
              </div>

              {!results ? (
                 <div className="glass-card p-12 text-center rounded-3xl">
                   <p className="text-slate-500">Veuillez d'abord compléter vos notes.</p>
                 </div>
              ) : (
                <div className="overflow-x-auto glass-card rounded-3xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Matière</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Moy. Ann. Ponderée</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Note BEPC</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Total Pondéré</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Coef</th>
                        <th className="px-6 py-4 text-xs font-bold text-ivory-orange uppercase text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.keys(results.subResults).map(key => {
                        const res = results.subResults[key];
                        if (!res) return null;
                        const isMain = ['francais', 'maths', 'pc', 'anglais'].includes(key);
                        
                        return (
                          <tr key={key} className={`hover:bg-slate-50/30 transition-colors ${!isMain ? 'opacity-60 grayscale' : ''}`}>
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-800">{SUBJECT_LABELS[key]}</span>
                              {!isMain && <span className="ml-2 text-[8px] bg-slate-200 px-1 rounded text-slate-500">HORS MO</span>}
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-sm">{res.ann.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center font-mono text-sm">{res.bepc.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center font-mono text-sm font-bold">{res.totalPondere.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center font-mono text-sm">{res.coef}</td>
                            <td className="px-6 py-4 text-right font-mono text-sm font-black text-ivory-orange">{res.contribution.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-orange-50/30 border-t-2 border-ivory-orange/20">
                        <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-600">Somme des notes coefficientées (MO)</td>
                        <td className="px-6 py-4 text-center font-black text-slate-800">12</td>
                        <td className="px-6 py-4 text-right font-black text-2xl text-ivory-orange">
                          {((results.mo * 12)).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'guide' && (
            <motion.div 
              key="guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-8 pb-12"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-orange-50 text-ivory-orange rounded-2xl">
                  <GraduationCap size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Mode d'emploi & Aide</h3>
              </div>

              <div className="grid gap-6">
                <div className="glass-card p-8 rounded-3xl space-y-6">
                  <section className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       <span className="w-8 h-8 bg-ivory-orange text-white rounded-lg flex items-center justify-center text-sm">1</span>
                       Saisie des Informations
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Allez dans l'onglet <strong>"Espace Élève"</strong>. Remplissez votre nom, matricule et établissement. 
                      Précisez si vous êtes un <strong>Candidat Normal</strong> ou <strong>Candidat TO</strong> (Test d'Orientation). 
                      Indiquez également si vous avez été admis au BEPC.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       <span className="w-8 h-8 bg-ivory-orange text-white rounded-lg flex items-center justify-center text-sm">2</span>
                       Saisie des Notes
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Dans l'onglet <strong>"Notes Trimestrielles"</strong>, saisissez vos moyennes des trois trimestres (T1, T2, T3) pour chaque matière, ainsi que vos notes obtenues à l'examen du BEPC.
                    </p>
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                      <p className="text-xs font-bold text-ivory-orange uppercase tracking-wider mb-2">Cas Particulier : Anglais</p>
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                        <li><strong>Candidat Normal :</strong> Vous devez saisir la note de l'écrit ET de l'oral du BEPC.</li>
                        <li><strong>Candidat TO :</strong> Seule la note de l'écrit est prise en compte.</li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       <span className="w-8 h-8 bg-ivory-orange text-white rounded-lg flex items-center justify-center text-sm">3</span>
                       Résultats et Orientation
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Consultez l'onglet <strong>"Résultats"</strong> pour voir votre <strong>Moyenne d'Orientation (MO)</strong>. 
                      L'application vous propose automatiquement une série (A ou C) basée sur vos points forts en Lettres ou en Sciences.
                    </p>
                  </section>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-card p-6 rounded-3xl space-y-3">
                    <h4 className="font-bold text-slate-800">Admission au Public</h4>
                    <p className="text-sm text-slate-500">
                      Pour être orienté dans le public, vous devez généralement obtenir une MO ≥ 10.00 (seuil standard qui peut varier selon les décisions du Ministère).
                    </p>
                  </div>
                  <div className="glass-card p-6 rounded-3xl space-y-3">
                    <h4 className="font-bold text-slate-800 border-b pb-2">Admission au Privé</h4>
                    <p className="text-sm text-slate-500 italic">
                      C'est le Ministère qui précise la moyenne d'orientation requise pour aller dans le privé au cas où l'on n'a pas atteint la moyenne exigée pour le public.
                    </p>
                    <p className="text-xs text-slate-500">
                      À titre informatif, les critères habituels sont : MGA ≥ 10.00 et MO comprise entre 9.00 et 9.99.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-green-50 text-ivory-green rounded-2xl">
                  <BarChart3 size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Données & Statistiques</h3>
              </div>
              <StatsDashboard />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl">
                  <Settings size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Paramètres des Seuils</h3>
              </div>

              <div className="glass-card p-8 rounded-3xl space-y-8">
                <div className="space-y-6">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <GraduationCap size={18} className="text-ivory-orange" />
                    Orientation Public
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-8">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-600">MO Minimale Requise</label>
                        <p className="text-xs text-slate-400">Le seuil standard est fixé à 10.00/20.</p>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="input-field w-32 text-center font-bold"
                        value={state.thresholds.moMinimale}
                        onChange={(e) => updateThreshold('moMinimale', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <CheckCircle2 size={18} className="text-ivory-green" />
                    Admission au Privé
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-8">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-600">MGA Minimale</label>
                        <p className="text-xs text-slate-400">Moyenne Générale Annuelle minimale.</p>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="input-field w-32 text-center font-bold"
                        value={state.thresholds.mgaPriveMin}
                        onChange={(e) => updateThreshold('mgaPriveMin', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-600">MO Min Privé</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="input-field text-center font-bold"
                          value={state.thresholds.moPriveMin}
                          onChange={(e) => updateThreshold('moPriveMin', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-600">MO Max Privé</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="input-field text-center font-bold"
                          value={state.thresholds.moPriveMax}
                          onChange={(e) => updateThreshold('moPriveMax', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-end">
                   <button 
                     onClick={() => {
                       setState(prev => ({ ...prev, thresholds: DEFAULT_THRESHOLDS }));
                       alert('Seuils réinitialisés aux valeurs par défaut.');
                     }}
                     className="text-sm font-bold text-ivory-orange hover:underline"
                   >
                     Restaurer les valeurs par défaut
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
