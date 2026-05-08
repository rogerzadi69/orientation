import { SubjectData, CandidateType } from '../types';

export function calculateAnnualAverage(subject: SubjectData): number | null {
  const { t1, t2, t3 } = subject;
  if (t1 === '' || t2 === '' || t3 === '') return null;
  return (Number(t1) + 2 * Number(t2) + 2 * Number(t3)) / 5;
}

export function isDataComplete(state: any): boolean {
  const { info, notes } = state;
  
  // Check info
  if (!info.nom || !info.mgaAnnuelle) return false;

  // Check subjects used for MO
  const moSubjects = ['francais', 'maths', 'pc', 'anglais'];
  for (const s of moSubjects) {
    const data = notes[s];
    if (data.t1 === '' || data.t2 === '' || data.t3 === '' || data.bepc === '') return false;
    if (s === 'anglais' && info.typeCandidat === 'Normal' && data.oral === '') return false;
  }

  // Bilan Lettres/Sciences also need SVT and HG
  const otherSubjects = ['hg', 'svt'];
  for (const s of otherSubjects) {
     const data = notes[s];
     if (data.t1 === '' || data.t2 === '' || data.t3 === '' || data.bepc === '') return false;
  }

  return true;
}
