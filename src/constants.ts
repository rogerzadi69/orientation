import { OrientationState, Thresholds } from './types';

export const DEFAULT_THRESHOLDS: Thresholds = {
  moMinimale: 10.00,
  moPriveMin: 9.00,
  moPriveMax: 9.99,
  mgaPriveMin: 10.00,
};

export const INITIAL_STATE: OrientationState = {
  info: {
    nom: '',
    matricule: '',
    etablissement: '',
    anneeScolaire: '',
    typeCandidat: 'Normal',
    mgaAnnuelle: '',
    admisBEPC: true,
  },
  notes: {
    francais: { t1: '', t2: '', t3: '', bepc: '' },
    maths: { t1: '', t2: '', t3: '', bepc: '' },
    pc: { t1: '', t2: '', t3: '', bepc: '' },
    anglais: { t1: '', t2: '', t3: '', bepc: '', oral: '' },
    hg: { t1: '', t2: '', t3: '', bepc: '' },
    svt: { t1: '', t2: '', t3: '', bepc: '' },
  },
  thresholds: DEFAULT_THRESHOLDS,
};

export const SUBJECT_LABELS: Record<string, string> = {
  francais: 'Composition Française',
  maths: 'Mathématiques',
  pc: 'Physique-Chimie',
  anglais: 'Anglais',
  hg: 'Histoire-Géographie',
  svt: 'SVT',
};

export const SUBJECT_COEFS: Record<string, number> = {
  francais: 2,
  maths: 2,
  pc: 1,
  anglais: 1,
};
