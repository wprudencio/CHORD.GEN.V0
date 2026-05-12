// ============================================================
// SYNTH_RHYTHMS
// Expanded with richer rhythmic patterns & arpeggios
// ============================================================

export type SynthRhythm = {
  pattern: number[]
  name: string
  isArp?: boolean
  arpDirection?: string
}

export const SYNTH_RHYTHMS: Record<string, SynthRhythm> = {
  sustained:   { pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], name: "Sustained" },
  pulse:       { pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], name: "Pulse" },
  offbeat:     { pattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], name: "Offbeat" },
  staccato:    { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Staccato" },
  syncopated:  { pattern: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0], name: "Syncopated" },
  triplet:     { pattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0], name: "Triplet" },
  dotted:      { pattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0], name: "Dotted" },
  driving:     { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0], name: "Driving" },
  sparse:      { pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], name: "Sparse" },
  // New rhythm patterns
  gallop:      { pattern: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0], name: "Gallop" },
  boomBap:     { pattern: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], name: "Boom Bap" },
  housePump:   { pattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], name: "House Pump" },
  broken:      { pattern: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], name: "Broken" },
  wave:        { pattern: [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0], name: "Wave" },
  // Arpeggio patterns
  arpUp:       { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp Up",    isArp: true, arpDirection: "up" },
  arpDown:     { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp Down",  isArp: true, arpDirection: "down" },
  arpUpDown:   { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp U/D",   isArp: true, arpDirection: "updown" },
  arpRandom:   { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp Rand",   isArp: true, arpDirection: "random" },
  arpSixteenth:{ pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], name: "Arp 16th",  isArp: true, arpDirection: "up" },
  arpEights:   { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp 8ths",  isArp: true, arpDirection: "updown" },
}