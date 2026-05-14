import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrientationState, SubjectData } from '../types';
import { SUBJECT_LABELS, SUBJECT_COEFS } from '../constants';

export function generateOrientationPDF(state: OrientationState, results: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const { info } = state;

  // Header
  // Logo placeholder or text header
  doc.setFontSize(18);
  doc.setTextColor(249, 115, 22); // Ivory orange
  doc.text('ORIENTATION SECONDE CI', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Calculateur KIRMANN - Rapport d\'orientation', pageWidth / 2, 26, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(249, 115, 22);
  doc.line(20, 30, pageWidth - 20, 30);

  // Espace Élève
  doc.setFontSize(14);
  doc.setTextColor(51, 65, 85); // Slate 800
  doc.text('1. Informations sur l\'Élève', 20, 42);
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate 600
  
  const studentInfoTable = [
    ['Nom & Prénoms:', info.nom || 'Non renseigné', 'Matricule:', info.matricule || 'Non renseigné'],
    ['Établissement:', info.etablissement || 'Non renseigné', 'Année Scolaire:', info.anneeScolaire || 'Non renseigné'],
    ['Type de Candidat:', info.typeCandidat, 'Admis au BEPC:', info.admisBEPC ? 'OUI' : 'NON'],
    ['MGA Annuelle:', `${info.mgaAnnuelle || '0.00'} / 20`, '', '']
  ];

  autoTable(doc, {
    startY: 46,
    body: studentInfoTable,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 40 }
    }
  });

  // Détails des calculs
  const currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setTextColor(51, 65, 85);
  doc.text('2. Détails des Calculs', 20, currentY);

  const tableHeaders = [['Matière', 'Moy. Ann. Pond.', 'Note BEPC', 'Total Pondéré', 'Coef', 'Contribution']];
  const tableData = Object.keys(results.subResults).map(key => {
    const res = results.subResults[key];
    const isMain = ['francais', 'maths', 'pc', 'anglais'].includes(key);
    return [
      SUBJECT_LABELS[key] + (!isMain ? ' (Hors MO)' : ''),
      res.ann.toFixed(2),
      res.bepc.toFixed(2),
      res.totalPondere.toFixed(2),
      res.coef,
      res.contribution.toFixed(2)
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: tableHeaders,
    body: tableData,
    foot: [[
      { content: 'Somme des notes coefficientées (MO)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '12', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: (results.mo * 12).toFixed(2), styles: { halign: 'right', fontStyle: 'bold', textColor: [249, 115, 22] } }
    ]],
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    footStyles: { fillColor: [255, 247, 237], textColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: {
      5: { fontStyle: 'bold', halign: 'right' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' }
    }
  });

  // Synthèse
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Draw a box for results
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(20, finalY, pageWidth - 40, 65, 5, 5, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('3. RÉSULTATS SYNTHÉTIQUES', pageWidth / 2, finalY + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const synthX = 30;
  const synthValX = 140;
  let synthY = finalY + 22;

  const orientationAvis = results.admisibleOfficiel 
    ? "Admissible en Seconde (Public)" 
    : (results.admissiblePrive ? "Admissible au Privé Uniquement" : "Non Orientable");

  const records = [
    ['Moyenne d\'Orientation:', results.mo.toFixed(2) + ' / 20'],
    ['Bilan Lettres:', results.bilanLettres.toFixed(2)],
    ['Bilan Sciences:', results.bilanSciences.toFixed(2)],
    ['Série Proposée:', 'Seconde ' + results.serie],
    ['Avis d\'Orientation:', orientationAvis],
    ['Inscription au Privé:', results.admissiblePrive ? 'Éligible' : (results.admisibleOfficiel ? 'Possible' : 'Non éligible')]
  ];

  records.forEach(row => {
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], synthX, synthY);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], synthValX, synthY);
    synthY += 8;
  });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Calculateur KIRMANN - Auteur: Frère ZADI BLEY ROGER, Sc.', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text('Généré le ' + new Date().toLocaleString('fr-FR'), pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  const filename = `orientation_${info.nom?.replace(/\s+/g, '_')}_${info.matricule}.pdf`;
  doc.save(filename);
}

export function generateStatsPDF(results: any[]) {
  const doc = new jsPDF('l'); // Landscape for better table width
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(249, 115, 22);
  doc.text('LISTE DES ORIENTATIONS - CALCULATEUR KIRMANN', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, 26, { align: 'center' });

  const headers = [['N°', 'Nom & Prénoms', 'Matricule', 'MO', 'Lettres', 'Sciences', 'Série', 'Établissement', 'Date']];
  const data = results.map((r, i) => [
    i + 1,
    r.studentName || 'N/A',
    r.matricule || 'N/A',
    r.mo?.toFixed(2) || 'N/A',
    r.bilanLettres?.toFixed(2) || 'N/A',
    r.bilanSciences?.toFixed(2) || 'N/A',
    'Seconde ' + (r.serie || 'N/A'),
    r.school || 'N/A',
    r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString('fr-FR') : 'N/A'
  ]);

  autoTable(doc, {
    startY: 35,
    head: headers,
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 },
      3: { fontStyle: 'bold', halign: 'center' },
      6: { fontStyle: 'bold' }
    }
  });

  doc.save(`export_orientations_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateGuidePDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // PAGE 1: POURQUOI CETTE APPLICATION & MODE D'EMPLOI ÉLÈVES
  // Header
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFontSize(20);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.text('MODE D\'EMPLOI - CALCULATEUR KIRMANN', pageWidth / 2, 25, { align: 'center' });

  // 1. Pourquoi cette application ?
  let y = 55;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(14);
  doc.text('1. Pourquoi cette application ?', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const intro = "Le Calculateur KIRMANN est un outil conçu pour aider les élèves de 3ème en Côte d'Ivoire à anticiper leur orientation. L'orientation ne doit plus être une surprise le jour des résultats du BEPC. Cette application est ouverte à TOUS les élèves (de Kirmann ou d'ailleurs) qui souhaitent intégrer le Collège Catholique Kirmann en classe de Seconde.";
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 6;

  const points = [
    "- Prévoir sa série (A ou C) en fonction de ses forces.",
    "- Simuler l'impact des notes du BEPC sur la Moyenne d'Orientation (MO).",
    "- Se fixer des objectifs de notes concrets.",
    "- Faciliter la sélection des dossiers par l'administration du Collège Kirmann."
  ];
  
  points.forEach(point => {
    doc.text(point, margin + 5, y);
    y += 6;
  });

  // 2. Guide de l'Élève
  y += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Guide d\'utilisation (Élèves)', margin, y);
  y += 10;

  doc.setFontSize(10);
  const steps = [
    { t: "Phase 1 : Simulation (Avant les résultats)", d: "Saisissez vos notes de classe et testez différentes notes de BEPC pour voir vos chances d'orientation." },
    { t: "Phase 2 : Saisie Définitive (Après les résultats)", d: "Dès que vous avez vos notes réelles du BEPC, saisissez-les immédiatement dans l'application. Soyez rigoureux et honnête." },
    { t: "Phase 3 : Envoi et Dépôt", d: "Tirez le rapport PDF final ou envoyez-le par email à : kirmannabengourou@gmail.com. Déposez ensuite votre 'collante' (relevé de notes BEPC) et vos 3 bulletins trimestriels au Secrétariat du Collège." }
  ];

  steps.forEach(step => {
    doc.setFont('helvetica', 'bold');
    doc.text(step.t, margin + 5, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const desc = doc.splitTextToSize(step.d, contentWidth - 10);
    doc.text(desc, margin + 10, y);
    y += desc.length * 6 + 2;
  });

  // Warning box
  y += 5;
  doc.setDrawColor(220, 38, 38); // Red-600
  doc.setFillColor(254, 242, 242); // Red-50
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('ATTENTION - AVERTISSEMENT SÉRIEUX :', margin + 5, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(153, 27, 27);
  const warningText = "L'administration du Collège dispose des moyens nécessaires pour vérifier l'authenticité de vos notes. Toute tentative de fraude ou saisie de fausses informations entraînera la disqualification immédiate de votre candidature pour le Collège Kirmann. Avant les résultats on simule, après on donne les vraies informations.";
  const warningLines = doc.splitTextToSize(warningText, contentWidth - 10);
  doc.text(warningLines, margin + 5, y + 15);

  // PAGE 2: GUIDE COLLABORATEURS
  doc.addPage();
  y = 30;

  doc.setFillColor(51, 65, 85);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFontSize(20);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.text('GUIDE POUR LES COLLABORATEURS', pageWidth / 2, 25, { align: 'center' });

  y = 55;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(14);
  doc.text('1. Administration et Gestion', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const adminIntro = "Cette application est l'outil officiel de suivi des orientations pour la Direction du Collège Kirmann.";
  doc.text(adminIntro, margin, y);
  y += 12;

  const adminSteps = [
    { t: "Suivi des admissions", d: "La Direction utilise les données reçues sur kirmannabengourou@gmail.com et dans le tableau de bord pour sélectionner les élèves de Seconde (A ou C)." },
    { t: "Contrôle de conformité", d: "Les PDF reçus sont systématiquement comparés aux collantes physiques déposées au secrétariat." },
    { t: "Tableau de Bord", d: "Accédez à l'onglet Paramètres pour voir les statistiques globales des simulations." },
    { t: "Conseil de Classe", d: "Le personnel peut utiliser les exports Excel pour préparer les travaux d'orientation en fin d'année scolaire." }
  ];

  adminSteps.forEach(step => {
    doc.setFont('helvetica', 'bold');
    doc.text(step.t, margin + 5, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const desc = doc.splitTextToSize(step.d, contentWidth - 10);
    doc.text(desc, margin + 10, y);
    y += desc.length * 6 + 4;
  });

  // Logo/Seal area
  y += 20;
  doc.setDrawColor(200);
  doc.setLineWidth(0.1);
  doc.line(pageWidth - 70, y + 20, pageWidth - margin, y + 20);
  doc.setFontSize(8);
  doc.text('Le Secrétariat du Collège', pageWidth - 55, y + 25, { align: 'center' });

  // Footer for both pages
  const addFooter = (pNum: number) => {
    doc.setPage(pNum);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Calculateur KIRMANN - Frère ZADI BLEY ROGER, Sc.', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`Page ${pNum} / 2`, pageWidth - 25, pageHeight - 15);
  };

  addFooter(1);
  addFooter(2);

  doc.save('Guide_Utilisation_KIRMANN.pdf');
}
