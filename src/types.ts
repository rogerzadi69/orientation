import { LucideIcon } from 'lucide-react';

export type CandidateType = 'Normal' | 'TO';

export interface SubjectData {
  t1: number | '';
  t2: number | '';
  t3: number | '';
  bepc: number | '';
  oral?: number | ''; // Specific for English Normal
}

export interface StudentInfo {
  nom: string;
  matricule: string;
  etablissement: string;
  anneeScolaire: string;
  typeCandidat: CandidateType;
  mgaAnnuelle: number | '';
  admisBEPC: boolean;
}

export interface Thresholds {
  moMinimale: number;
  moPriveMin: number;
  moPriveMax: number;
  mgaPriveMin: number;
}

export interface OrientationState {
  info: StudentInfo;
  notes: {
    francais: SubjectData;
    maths: SubjectData;
    pc: SubjectData;
    anglais: SubjectData;
    hg: SubjectData;
    svt: SubjectData;
  };
  thresholds: Thresholds;
}

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}
