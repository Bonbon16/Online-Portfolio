export type Project = {
  number: string; name: string; type: string; role: string; description: string;
  contribution: string; highlights: string[]; stack: string[];
  github?: string; live?: string;
  /** Card image. Tall images (e.g. posters) are cropped to the card; `imagePosition` picks the visible band. */
  image?: string; imagePosition?: string;
  /** If set, the card shows a "view full" link to this file (e.g. the full poster). */
  imageFull?: string;
};

export const projects: Project[] = [
  {
    number: '01', name: 'MANA', type: 'THESIS PROJECT', role: 'Developer',
    description: 'A disaster response recommendation and decision support system, deployed and tested with real users.',
    contribution: 'I worked on interface design, functional testing, data collection, and documentation.',
    highlights: [
      'Redesigned layouts and user flows in Figma to make navigation clearer.',
      'Tested functionality, identified bugs, and added exception handling.',
      'Configured Apify actors and built middleware to coordinate data collection.',
    ],
    stack: ['Python', 'JavaScript', 'Supabase', 'Apify', 'HTML', 'CSS', 'Figma', 'Render'],
    image: '/projects/mana.webp', imagePosition: 'center top', imageFull: '/projects/mana.webp',
  },
  {
    number: '02', name: 'GarbTime', type: 'ACADEMIC PROJECT', role: 'Front-End Developer',
    description: 'A barangay garbage collection notification system that helps residents check collection times and receive schedule updates.',
    contribution: 'I developed front-end screens and collaborated on Firebase functionality for schedule updates.',
    highlights: [
      'Built screens for a real-time garbage collection notification system.',
      'Developed features for residents to check collection times and receive updates.',
      'Collaborated on Firebase functionality to deliver schedule updates.',
    ],
    stack: ['Java', 'Firebase', 'HTML', 'CSS'],
  },
];
