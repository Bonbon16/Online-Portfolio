export type Certificate = {
  title: string;
  issuer: string;
  date: string;
  /** Credential / certificate ID printed on the certificate, if any. */
  credentialId?: string;
  /** Original PDF. */
  file: string;
  /** Card-sized preview (900px wide). */
  preview: string;
  /** High-resolution image for the lightbox (1800px wide). */
  full: string;
};

const previews = (name: string) => ({
  file: `/certificates/${name}.pdf`,
  preview: `/certificates/previews/${name}.webp`,
  full: `/certificates/previews/${name}-full.webp`,
});

export const certificates: Certificate[] = [
  { title: 'PMI Project Management Ready', issuer: 'Project Management Institute', date: 'MAR 2026', credentialId: 'w6UXV-48D4', ...previews('pmi') },
  { title: 'Learning MATLAB', issuer: 'LinkedIn Learning', date: 'NOV 2025', credentialId: 'ca48c42fc844666e6208d95c90bcf33919fb6f24ce2cb81172eef277ee5ac756', ...previews('matlab') },
  { title: 'Android Development with Kotlin for Beginners', issuer: 'LinkedIn Learning', date: 'NOV 2025', credentialId: '0a67c85d9411a48af2b240286f7e3ee9d12fa5f32540b4107ab10bb0db31d389', ...previews('android') },
  { title: 'Using Git with Visual Studio Code', issuer: 'LinkedIn Learning', date: 'OCT 2025', credentialId: 'b5261bb39e585ae46b82cf62fc119156ab9a87480baea235a5b4c055829be5da', ...previews('git') },
  { title: 'Python', issuer: 'Certiport · IT Specialist', date: 'JUL 2025', credentialId: 'bhzN-s4NA', ...previews('python') },
];
