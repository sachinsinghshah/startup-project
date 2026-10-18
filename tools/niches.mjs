// Starting content per trade so a demo takes minutes. Always tweak it to the real business before sending.
export const NICHES = {
  plumber: {
    tagline: 'Plumbers', schemaType: 'Plumber',
    headline: 'Leaking pipe? Fast, friendly plumbers in {city}.',
    badges: ['Licensed & insured', 'Upfront pricing', 'Same-day service'],
    services: [
      { title: 'Emergency repairs', text: 'Burst pipes, leaks and overflowing toilets, fixed fast.' },
      { title: 'Water heaters', text: 'Repair and replacement for tank and tankless units.' },
      { title: 'Drain cleaning', text: 'Clogged sinks, showers and main lines cleared.' },
      { title: 'Bathroom & kitchen plumbing', text: 'Faucets, toilets, disposals and fixture installs.' },
    ],
  },
  hvac: {
    tagline: 'Heating & air conditioning', schemaType: 'HVACBusiness',
    headline: 'Heating or AC down? We fix it fast in {city}.',
    badges: ['Licensed & insured', 'Upfront pricing', 'Maintenance plans'],
    services: [
      { title: 'AC repair', text: 'Diagnosis and repair for all major brands.' },
      { title: 'Furnace & heat pump repair', text: 'Get your heat back on, fast.' },
      { title: 'New system installs', text: 'Efficient systems sized properly for your home.' },
      { title: 'Maintenance plans', text: 'Seasonal tune-ups that prevent breakdowns.' },
    ],
  },
  roofer: {
    tagline: 'Roofing contractors', schemaType: 'RoofingContractor',
    headline: 'Roof leaks and replacements done right in {city}.',
    badges: ['Licensed & insured', 'Free inspections', 'Workmanship warranty'],
    services: [
      { title: 'Roof repairs', text: 'Leaks, missing shingles and storm damage.' },
      { title: 'Roof replacement', text: 'Full tear-off and replacement with quality materials.' },
      { title: 'Inspections', text: 'Free roof inspections with photos.' },
      { title: 'Gutters', text: 'Gutter installation, repair and guards.' },
    ],
  },
  electrician: {
    tagline: 'Electricians', schemaType: 'Electrician',
    headline: 'Safe, reliable electricians in {city}.',
    badges: ['Licensed & insured', 'Upfront pricing', 'Emergency call-outs'],
    services: [
      { title: 'Repairs & fault finding', text: 'Tripping breakers, dead outlets and flickering lights.' },
      { title: 'Panel upgrades', text: 'Modern, safe electrical panels.' },
      { title: 'EV chargers', text: 'Home EV charger installation.' },
      { title: 'Lighting', text: 'Indoor and outdoor lighting installs.' },
    ],
  },
  dentist: {
    tagline: 'Family dentist', schemaType: 'Dentist',
    headline: 'Gentle, modern dental care in {city}.',
    badges: ['New patients welcome', 'Most insurance accepted', 'Emergency appointments'],
    services: [
      { title: 'Check-ups & cleaning', text: 'Routine exams and hygiene visits.' },
      { title: 'Cosmetic dentistry', text: 'Whitening, veneers and smile makeovers.' },
      { title: 'Implants & crowns', text: 'Restore missing or damaged teeth.' },
      { title: 'Emergency dental care', text: 'Same-day appointments for toothache and injuries.' },
    ],
  },
  physio: {
    tagline: 'Physiotherapy clinic', schemaType: 'MedicalClinic',
    headline: 'Get moving again: physiotherapy in {city}.',
    badges: ['Qualified physiotherapists', 'Appointments this week', 'Sports & injury rehab'],
    services: [
      { title: 'Back & neck pain', text: 'Assessment and treatment plans that work.' },
      { title: 'Sports injuries', text: 'Rehab to get you back to your sport safely.' },
      { title: 'Post-surgery rehab', text: 'Structured recovery after operations.' },
      { title: 'Massage therapy', text: 'Sports and deep tissue massage.' },
    ],
  },
  default: {
    tagline: 'Local experts', schemaType: 'LocalBusiness',
    headline: 'Trusted local service in {city}.',
    badges: ['Fully insured', 'Free quotes', 'Local & family-run'],
    services: [
      { title: 'Service one', text: 'Describe the main service.' },
      { title: 'Service two', text: 'Describe the second service.' },
      { title: 'Service three', text: 'Describe the third service.' },
    ],
  },
};
