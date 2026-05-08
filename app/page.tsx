"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Pencil, X } from "lucide-react"

// ── NOTE FREQUENCIES ──
const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63, "C#": 277.18, D: 293.66, "D#": 311.13, E: 329.63,
  F: 349.23, "F#": 369.99, G: 392.0, "G#": 415.3, A: 440.0, "A#": 466.16, B: 493.88,
}
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

const SCALES: Record<string, number[]> = {
  major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10], dorian: [0,2,3,5,7,9,10],
  mixolydian: [0,2,4,5,7,9,10], lydian: [0,2,4,6,7,9,11], phrygian: [0,1,3,5,7,8,10],
  locrian: [0,1,3,5,6,8,10], aeolian: [0,2,3,5,7,8,10], harmonicMinor: [0,2,3,5,7,8,11],
  melodicMinor: [0,2,3,5,7,9,11], wholeTone: [0,2,4,6,8,10], blues: [0,3,5,6,7,10],
  pentatonicMajor: [0,2,4,7,9], pentatonicMinor: [0,3,5,7,10], hungarian: [0,2,3,6,7,8,11],
  japanese: [0,1,5,7,8], arabian: [0,2,4,5,6,8,10], persian: [0,1,4,5,6,8,11],
  bebop: [0,2,4,5,7,9,10,11], chromatic: [0,1,2,3,4,5,6,7,8,9,10,11],
}

const CHORD_TYPES: Record<string, number[]> = {
  maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], min7:[0,3,7,10], dom7:[0,4,7,10],
  "7sus4":[0,5,7,10], add9:[0,4,7,14], madd9:[0,3,7,14], maj9:[0,4,7,11,14],
  min9:[0,3,7,10,14], sus2:[0,2,7], sus4:[0,5,7], "6":[0,4,7,9], min6:[0,3,7,9],
  dim:[0,3,6], dim7:[0,3,6,9], m7b5:[0,3,6,10], aug:[0,4,8], "11":[0,4,7,10,14,17],
  min11:[0,3,7,10,14,17], "13":[0,4,7,10,14,21], "7#9":[0,4,7,10,15], "7b9":[0,4,7,10,13],
}

type ChordDegree = { deg: number; type: string }

const STYLE_PROGRESSIONS: Record<string, Record<string, ChordDegree[][]>> = {
  modern: {
    major: [
      [{deg:1,type:"maj"},{deg:5,type:"maj"},{deg:6,type:"min"},{deg:4,type:"maj"}],
      [{deg:1,type:"maj"},{deg:4,type:"add9"},{deg:6,type:"min7"},{deg:5,type:"sus4"}],
      [{deg:6,type:"min"},{deg:4,type:"maj"},{deg:1,type:"maj"},{deg:5,type:"maj"}],
      [{deg:1,type:"maj7"},{deg:3,type:"min7"},{deg:4,type:"maj7"},{deg:5,type:"dom7"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:3,type:"maj"},{deg:7,type:"maj"}],
      [{deg:1,type:"min7"},{deg:4,type:"min7"},{deg:6,type:"maj7"},{deg:5,type:"dom7"}],
      [{deg:1,type:"min"},{deg:7,type:"maj"},{deg:6,type:"maj"},{deg:7,type:"maj"}],
      [{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"},{deg:1,type:"min"}],
    ],
  },
  electronic: {
    major: [
      [{deg:1,type:"sus2"},{deg:4,type:"sus2"},{deg:5,type:"sus4"},{deg:1,type:"maj"}],
      [{deg:1,type:"maj"},{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:4,type:"maj"}],
      [{deg:6,type:"min7"},{deg:4,type:"add9"},{deg:1,type:"maj"},{deg:5,type:"7sus4"}],
      [{deg:1,type:"add9"},{deg:5,type:"sus4"},{deg:6,type:"min"},{deg:4,type:"add9"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:1,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"}],
      [{deg:1,type:"madd9"},{deg:4,type:"min"},{deg:6,type:"maj"},{deg:7,type:"sus2"}],
      [{deg:1,type:"min7"},{deg:3,type:"maj"},{deg:6,type:"maj"},{deg:7,type:"maj"}],
      [{deg:1,type:"min"},{deg:7,type:"sus2"},{deg:6,type:"sus2"},{deg:4,type:"min"}],
    ],
  },
  ambient: {
    major: [
      [{deg:1,type:"maj9"},{deg:4,type:"maj7"},{deg:2,type:"min9"},{deg:5,type:"7sus4"}],
      [{deg:1,type:"add9"},{deg:6,type:"min9"},{deg:4,type:"maj9"},{deg:5,type:"sus4"}],
      [{deg:1,type:"maj7"},{deg:3,type:"min7"},{deg:6,type:"min9"},{deg:4,type:"maj9"}],
      [{deg:4,type:"maj9"},{deg:1,type:"maj7"},{deg:5,type:"sus4"},{deg:6,type:"min9"}],
    ],
    minor: [
      [{deg:1,type:"min9"},{deg:4,type:"min7"},{deg:6,type:"maj9"},{deg:3,type:"maj7"}],
      [{deg:1,type:"min7"},{deg:7,type:"maj7"},{deg:6,type:"maj9"},{deg:4,type:"min9"}],
      [{deg:6,type:"maj9"},{deg:3,type:"maj7"},{deg:7,type:"maj"},{deg:1,type:"min9"}],
      [{deg:1,type:"madd9"},{deg:6,type:"maj7"},{deg:7,type:"sus2"},{deg:4,type:"min7"}],
    ],
  },
  jazzy: {
    major: [
      [{deg:2,type:"min9"},{deg:5,type:"dom7"},{deg:1,type:"maj9"},{deg:6,type:"min7"}],
      [{deg:1,type:"maj9"},{deg:4,type:"maj7"},{deg:3,type:"min7"},{deg:6,type:"dom7"}],
      [{deg:1,type:"6"},{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"maj7"}],
      [{deg:3,type:"min7"},{deg:6,type:"dom7"},{deg:2,type:"min7"},{deg:5,type:"dom7"}],
    ],
    minor: [
      [{deg:1,type:"min9"},{deg:4,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"min6"}],
      [{deg:2,type:"m7b5"},{deg:5,type:"dom7"},{deg:1,type:"min9"},{deg:6,type:"maj7"}],
      [{deg:1,type:"min7"},{deg:7,type:"dom7"},{deg:3,type:"maj7"},{deg:6,type:"min7"}],
      [{deg:1,type:"min9"},{deg:4,type:"dom7"},{deg:7,type:"maj7"},{deg:3,type:"6"}],
    ],
  },
  lofi: {
    major: [
      [{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"maj7"},{deg:1,type:"maj7"}],
      [{deg:1,type:"maj7"},{deg:6,type:"min7"},{deg:2,type:"min7"},{deg:5,type:"7sus4"}],
      [{deg:4,type:"maj7"},{deg:3,type:"min7"},{deg:2,type:"min7"},{deg:1,type:"maj7"}],
      [{deg:1,type:"maj9"},{deg:4,type:"maj7"},{deg:6,type:"min9"},{deg:5,type:"dom7"}],
    ],
    minor: [
      [{deg:1,type:"min9"},{deg:4,type:"min7"},{deg:7,type:"maj7"},{deg:3,type:"maj7"}],
      [{deg:6,type:"maj7"},{deg:7,type:"maj7"},{deg:1,type:"min7"},{deg:4,type:"min7"}],
      [{deg:1,type:"min7"},{deg:6,type:"maj9"},{deg:3,type:"maj7"},{deg:7,type:"dom7"}],
      [{deg:2,type:"m7b5"},{deg:5,type:"dom7"},{deg:1,type:"min9"},{deg:4,type:"min7"}],
    ],
  },
  cinematic: {
    major: [
      [{deg:1,type:"maj"},{deg:3,type:"min"},{deg:4,type:"maj"},{deg:1,type:"maj"}],
      [{deg:1,type:"sus2"},{deg:5,type:"sus4"},{deg:6,type:"min"},{deg:4,type:"add9"}],
      [{deg:6,type:"min"},{deg:3,type:"min"},{deg:4,type:"maj"},{deg:1,type:"sus2"}],
      [{deg:1,type:"add9"},{deg:6,type:"min"},{deg:4,type:"maj"},{deg:5,type:"sus4"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:3,type:"maj"},{deg:4,type:"min"}],
      [{deg:1,type:"madd9"},{deg:7,type:"maj"},{deg:6,type:"sus2"},{deg:6,type:"maj"}],
      [{deg:4,type:"min"},{deg:1,type:"min"},{deg:6,type:"maj"},{deg:7,type:"sus2"}],
      [{deg:1,type:"min"},{deg:5,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"}],
    ],
  },
  rnb: {
    major: [
      [{deg:1,type:"maj9"},{deg:4,type:"maj7"},{deg:2,type:"min9"},{deg:5,type:"13"}],
      [{deg:1,type:"maj7"},{deg:6,type:"min9"},{deg:4,type:"maj9"},{deg:5,type:"11"}],
      [{deg:2,type:"min11"},{deg:5,type:"13"},{deg:1,type:"maj9"},{deg:4,type:"maj7"}],
      [{deg:1,type:"6"},{deg:3,type:"min7"},{deg:6,type:"min9"},{deg:2,type:"min7"}],
    ],
    minor: [
      [{deg:1,type:"min9"},{deg:4,type:"min11"},{deg:7,type:"maj9"},{deg:3,type:"maj7"}],
      [{deg:6,type:"maj9"},{deg:7,type:"13"},{deg:1,type:"min9"},{deg:4,type:"min7"}],
      [{deg:1,type:"min9"},{deg:5,type:"dom7"},{deg:4,type:"min7"},{deg:6,type:"maj7"}],
      [{deg:2,type:"m7b5"},{deg:5,type:"13"},{deg:1,type:"min9"},{deg:6,type:"maj9"}],
    ],
  },
  gospel: {
    major: [
      [{deg:1,type:"maj7"},{deg:4,type:"maj9"},{deg:5,type:"dom7"},{deg:1,type:"maj9"}],
      [{deg:4,type:"maj7"},{deg:4,type:"min7"},{deg:1,type:"maj7"},{deg:1,type:"maj7"}],
      [{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:3,type:"min7"},{deg:6,type:"dom7"}],
      [{deg:1,type:"maj7"},{deg:3,type:"dom7"},{deg:6,type:"min9"},{deg:2,type:"min7"}],
    ],
    minor: [
      [{deg:1,type:"min9"},{deg:4,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"min7"}],
      [{deg:6,type:"maj7"},{deg:7,type:"dom7"},{deg:1,type:"min9"},{deg:5,type:"dom7"}],
      [{deg:4,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"min9"},{deg:6,type:"maj7"}],
      [{deg:2,type:"m7b5"},{deg:5,type:"dom7"},{deg:1,type:"min7"},{deg:4,type:"min7"}],
    ],
  },
  funk: {
    major: [
      [{deg:1,type:"dom7"},{deg:4,type:"dom7"},{deg:1,type:"dom7"},{deg:5,type:"dom7"}],
      [{deg:1,type:"dom7"},{deg:1,type:"dom7"},{deg:4,type:"dom7"},{deg:1,type:"dom7"}],
      [{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"dom7"},{deg:1,type:"dom7"}],
      [{deg:1,type:"dom7"},{deg:3,type:"dom7"},{deg:4,type:"dom7"},{deg:5,type:"dom7"}],
    ],
    minor: [
      [{deg:1,type:"min7"},{deg:4,type:"min7"},{deg:1,type:"min7"},{deg:5,type:"dom7"}],
      [{deg:1,type:"min7"},{deg:1,type:"min7"},{deg:4,type:"dom7"},{deg:1,type:"min7"}],
      [{deg:6,type:"dom7"},{deg:7,type:"dom7"},{deg:1,type:"min7"},{deg:1,type:"min7"}],
      [{deg:1,type:"min7"},{deg:3,type:"maj7"},{deg:4,type:"dom7"},{deg:5,type:"dom7"}],
    ],
  },
  indie: {
    major: [
      [{deg:1,type:"maj"},{deg:5,type:"maj"},{deg:6,type:"min"},{deg:4,type:"maj"}],
      [{deg:1,type:"add9"},{deg:4,type:"add9"},{deg:6,type:"madd9"},{deg:5,type:"sus4"}],
      [{deg:4,type:"maj"},{deg:1,type:"maj"},{deg:5,type:"maj"},{deg:6,type:"min"}],
      [{deg:1,type:"sus2"},{deg:3,type:"min"},{deg:4,type:"add9"},{deg:1,type:"maj"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:3,type:"maj"},{deg:7,type:"maj"},{deg:4,type:"min"}],
      [{deg:1,type:"madd9"},{deg:6,type:"sus2"},{deg:3,type:"add9"},{deg:7,type:"sus4"}],
      [{deg:6,type:"maj"},{deg:3,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"}],
      [{deg:1,type:"min"},{deg:4,type:"min"},{deg:6,type:"add9"},{deg:7,type:"sus2"}],
    ],
  },
  bossa: {
    major: [
      [{deg:1,type:"maj9"},{deg:2,type:"min9"},{deg:3,type:"min7"},{deg:6,type:"dom7"}],
      [{deg:1,type:"maj7"},{deg:7,type:"dim7"},{deg:2,type:"min7"},{deg:5,type:"dom7"}],
      [{deg:1,type:"6"},{deg:4,type:"maj7"},{deg:5,type:"dom7"},{deg:1,type:"maj9"}],
      [{deg:2,type:"min7"},{deg:5,type:"7#9"},{deg:1,type:"maj9"},{deg:4,type:"maj7"}],
    ],
    minor: [
      [{deg:1,type:"min9"},{deg:4,type:"min7"},{deg:7,type:"dom7"},{deg:3,type:"maj7"}],
      [{deg:2,type:"m7b5"},{deg:5,type:"7b9"},{deg:1,type:"min9"},{deg:6,type:"maj7"}],
      [{deg:1,type:"min7"},{deg:6,type:"maj9"},{deg:2,type:"m7b5"},{deg:5,type:"dom7"}],
      [{deg:1,type:"min6"},{deg:4,type:"min9"},{deg:7,type:"maj7"},{deg:3,type:"6"}],
    ],
  },
  reggaeton: {
    major: [
      [{deg:6,type:"min"},{deg:4,type:"maj"},{deg:1,type:"maj"},{deg:5,type:"maj"}],
      [{deg:1,type:"maj"},{deg:6,type:"min"},{deg:4,type:"maj"},{deg:5,type:"maj"}],
      [{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:6,type:"min"},{deg:5,type:"maj"}],
      [{deg:6,type:"min"},{deg:5,type:"maj"},{deg:4,type:"maj"},{deg:1,type:"maj"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:3,type:"maj"},{deg:7,type:"maj"}],
      [{deg:1,type:"min"},{deg:7,type:"maj"},{deg:6,type:"maj"},{deg:3,type:"maj"}],
      [{deg:1,type:"min"},{deg:4,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"}],
      [{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"},{deg:1,type:"min"}],
    ],
  },
  country: {
    major: [
      [{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:1,type:"maj"},{deg:5,type:"maj"}],
      [{deg:1,type:"maj"},{deg:5,type:"maj"},{deg:4,type:"maj"},{deg:1,type:"maj"}],
      [{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:5,type:"dom7"},{deg:1,type:"maj"}],
      [{deg:1,type:"maj"},{deg:6,type:"min"},{deg:4,type:"maj"},{deg:5,type:"maj"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:4,type:"min"},{deg:1,type:"min"},{deg:5,type:"min"}],
      [{deg:1,type:"min"},{deg:7,type:"maj"},{deg:1,type:"min"},{deg:5,type:"min"}],
      [{deg:1,type:"min"},{deg:4,type:"min"},{deg:6,type:"maj"},{deg:5,type:"dom7"}],
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"}],
    ],
  },
  metal: {
    major: [
      [{deg:1,type:"maj"},{deg:7,type:"maj"},{deg:6,type:"min"},{deg:5,type:"maj"}],
      [{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:5,type:"maj"},{deg:7,type:"maj"}],
      [{deg:1,type:"maj"},{deg:6,type:"min"},{deg:7,type:"maj"},{deg:1,type:"maj"}],
      [{deg:1,type:"maj"},{deg:3,type:"min"},{deg:7,type:"maj"},{deg:4,type:"maj"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"}],
      [{deg:1,type:"min"},{deg:4,type:"min"},{deg:5,type:"min"},{deg:1,type:"min"}],
      [{deg:1,type:"min"},{deg:7,type:"maj"},{deg:6,type:"maj"},{deg:5,type:"maj"}],
      [{deg:1,type:"min"},{deg:2,type:"dim"},{deg:7,type:"maj"},{deg:1,type:"min"}],
    ],
  },
  classical: {
    major: [
      [{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:5,type:"dom7"},{deg:1,type:"maj"}],
      [{deg:1,type:"maj"},{deg:5,type:"maj"},{deg:6,type:"min"},{deg:3,type:"min"}],
      [{deg:1,type:"maj"},{deg:6,type:"min"},{deg:2,type:"min"},{deg:5,type:"dom7"}],
      [{deg:4,type:"maj"},{deg:5,type:"dom7"},{deg:3,type:"min"},{deg:6,type:"min"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:4,type:"min"},{deg:5,type:"dom7"},{deg:1,type:"min"}],
      [{deg:1,type:"min"},{deg:7,type:"maj"},{deg:3,type:"maj"},{deg:5,type:"dom7"}],
      [{deg:6,type:"maj"},{deg:3,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"}],
      [{deg:1,type:"min"},{deg:5,type:"dom7"},{deg:6,type:"maj"},{deg:5,type:"dom7"}],
    ],
  },
  disco: {
    major: [
      [{deg:1,type:"maj7"},{deg:2,type:"min7"},{deg:3,type:"min7"},{deg:4,type:"maj7"}],
      [{deg:6,type:"min7"},{deg:5,type:"dom7"},{deg:4,type:"maj7"},{deg:1,type:"maj7"}],
      [{deg:1,type:"maj"},{deg:4,type:"maj"},{deg:5,type:"dom7"},{deg:4,type:"maj"}],
      [{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"maj7"},{deg:6,type:"min7"}],
    ],
    minor: [
      [{deg:1,type:"min7"},{deg:4,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"min7"}],
      [{deg:6,type:"maj7"},{deg:7,type:"dom7"},{deg:1,type:"min7"},{deg:4,type:"min7"}],
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"}],
      [{deg:1,type:"min7"},{deg:7,type:"maj7"},{deg:6,type:"maj7"},{deg:5,type:"dom7"}],
    ],
  },
  synthwave: {
    major: [
      [{deg:1,type:"maj7"},{deg:5,type:"sus4"},{deg:6,type:"min7"},{deg:4,type:"maj7"}],
      [{deg:1,type:"add9"},{deg:4,type:"add9"},{deg:5,type:"sus2"},{deg:6,type:"min"}],
      [{deg:6,type:"min"},{deg:5,type:"maj"},{deg:4,type:"maj"},{deg:1,type:"maj"}],
      [{deg:1,type:"maj"},{deg:3,type:"min"},{deg:4,type:"maj"},{deg:5,type:"sus4"}],
    ],
    minor: [
      [{deg:1,type:"min7"},{deg:4,type:"min"},{deg:7,type:"maj"},{deg:6,type:"maj"}],
      [{deg:1,type:"madd9"},{deg:6,type:"maj"},{deg:7,type:"add9"},{deg:4,type:"min"}],
      [{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:1,type:"min"},{deg:5,type:"sus4"}],
      [{deg:1,type:"min"},{deg:7,type:"sus2"},{deg:6,type:"maj"},{deg:3,type:"maj"}],
    ],
  },
  edm: {
    major: [
      [{deg:1,type:"maj"},{deg:5,type:"maj"},{deg:6,type:"min"},{deg:4,type:"maj"}],
      [{deg:1,type:"sus2"},{deg:5,type:"sus4"},{deg:6,type:"min"},{deg:4,type:"sus2"}],
      [{deg:6,type:"min"},{deg:4,type:"maj"},{deg:1,type:"maj"},{deg:5,type:"sus4"}],
      [{deg:1,type:"add9"},{deg:4,type:"add9"},{deg:6,type:"min"},{deg:5,type:"sus4"}],
    ],
    minor: [
      [{deg:1,type:"min"},{deg:6,type:"maj"},{deg:7,type:"maj"},{deg:4,type:"min"}],
      [{deg:1,type:"min"},{deg:7,type:"maj"},{deg:6,type:"maj"},{deg:7,type:"maj"}],
      [{deg:6,type:"maj"},{deg:7,type:"sus2"},{deg:1,type:"min"},{deg:4,type:"min"}],
      [{deg:1,type:"madd9"},{deg:4,type:"min"},{deg:6,type:"sus2"},{deg:7,type:"maj"}],
    ],
  },
  latin: {
    major: [
      [{deg:1,type:"maj7"},{deg:4,type:"dom7"},{deg:1,type:"maj7"},{deg:5,type:"dom7"}],
      [{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"maj7"},{deg:6,type:"dom7"}],
      [{deg:1,type:"maj7"},{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"6"}],
      [{deg:1,type:"6"},{deg:4,type:"maj7"},{deg:2,type:"min7"},{deg:5,type:"dom7"}],
    ],
    minor: [
      [{deg:1,type:"min7"},{deg:4,type:"dom7"},{deg:1,type:"min7"},{deg:5,type:"dom7"}],
      [{deg:2,type:"m7b5"},{deg:5,type:"dom7"},{deg:1,type:"min9"},{deg:1,type:"min7"}],
      [{deg:1,type:"min7"},{deg:4,type:"min7"},{deg:7,type:"dom7"},{deg:3,type:"maj7"}],
      [{deg:1,type:"min6"},{deg:4,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"min7"}],
    ],
  },
  afrobeat: {
    major: [
      [{deg:1,type:"dom7"},{deg:4,type:"dom7"},{deg:1,type:"dom7"},{deg:4,type:"dom7"}],
      [{deg:1,type:"maj7"},{deg:5,type:"dom7"},{deg:4,type:"maj7"},{deg:1,type:"maj7"}],
      [{deg:1,type:"dom7"},{deg:1,type:"dom7"},{deg:4,type:"dom7"},{deg:5,type:"dom7"}],
      [{deg:2,type:"min7"},{deg:5,type:"dom7"},{deg:1,type:"maj7"},{deg:4,type:"dom7"}],
    ],
    minor: [
      [{deg:1,type:"min7"},{deg:4,type:"dom7"},{deg:1,type:"min7"},{deg:4,type:"dom7"}],
      [{deg:1,type:"min7"},{deg:7,type:"dom7"},{deg:6,type:"maj7"},{deg:5,type:"dom7"}],
      [{deg:1,type:"min7"},{deg:1,type:"min7"},{deg:4,type:"min7"},{deg:5,type:"dom7"}],
      [{deg:6,type:"maj7"},{deg:5,type:"dom7"},{deg:1,type:"min7"},{deg:4,type:"min7"}],
    ],
  },
}

const DRUM_STYLE_PATTERNS: Record<string, Record<string, Record<string, number[]>>> = {
  basic: {
    "4": { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  basic1: {
    "4": { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  basic2: {
    "4": { kick:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,0,1,0,0,1,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  basic3: {
    "4": { kick:[1,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1], openHat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,0,0,0,1,0,1,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,1,0,1,1,1,0,1,1,1,0,1], openHat:[0,0,0,0,0,0,1,0,0,0,0,0] },
    "6": { kick:[1,0,0,1,0,0,1,0,1,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,1,0,1,1,1,0,1,1,1,0,1], openHat:[0,0,0,0,0,0,1,0,0,0,0,0] },
  },
  hiphop: {
    "4": { kick:[1,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,0,1,0,0,0,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,0,0,1,0,0,1,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  house: {
    "4": { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], openHat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1] },
    "3": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[0,0,1,0,0,1,0,0,1,0,0,1], openHat:[0,0,0,0,0,1,0,0,0,0,0,1] },
    "6": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[0,0,1,0,0,1,0,0,1,0,0,1], openHat:[0,0,0,0,0,1,0,0,0,0,0,1] },
  },
  trap: {
    "4": { kick:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0] },
    "3": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  dnb: {
    "4": { kick:[1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,0,0,0,0,0,1,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,0,0,0,0,0,1,0,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  reggae: {
    "4": { kick:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0], hihat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1] },
    "3": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,1,0,0], hihat:[0,0,1,0,0,1,0,0,1,0,0,1], openHat:[0,0,0,0,0,1,0,0,0,0,0,1] },
    "6": { kick:[1,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,1,0,0], hihat:[0,0,1,0,0,1,0,0,1,0,0,1], openHat:[0,0,0,0,0,1,0,0,0,0,0,1] },
  },
  shuffle: {
    "4": { kick:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,0,1,0,0,0,0,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  bossa: {
    "4": { kick:[1,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,1,0,0,0,1,0,0,1,0], snare:[0,0,0,0,0,0,0,0,0,0,0,1], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,1,0,0,0,1,0,0,1,0], snare:[0,0,0,0,0,0,0,0,0,0,0,1], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  reggaeton: {
    "4": { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,1,0,0,1,0,0,1,0,0,1], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[1,0,0,1,0,0,1,0,0,1,0,0], snare:[0,0,1,0,0,1,0,0,1,0,0,1], hihat:[1,0,1,0,1,0,1,0,1,0,1,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  click: {
    "4": { kick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0], hihat:[1,0,0,1,0,0,1,0,0,1,0,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0], hihat:[1,0,0,1,0,0,1,0,0,1,0,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  none: {
    "4": { kick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hihat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    "3": { kick:[0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0], hihat:[0,0,0,0,0,0,0,0,0,0,0,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
    "6": { kick:[0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0], hihat:[0,0,0,0,0,0,0,0,0,0,0,0], openHat:[0,0,0,0,0,0,0,0,0,0,0,0] },
  },
}

const SYNTH_RHYTHMS: Record<string, { pattern: number[]; name: string; isArp?: boolean; arpDirection?: string }> = {
  sustained: { pattern: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], name: "Sustained" },
  pulse: { pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], name: "Pulse" },
  offbeat: { pattern: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], name: "Offbeat" },
  staccato: { pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], name: "Staccato" },
  syncopated: { pattern: [1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0], name: "Syncopated" },
  triplet: { pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], name: "Triplet" },
  dotted: { pattern: [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0], name: "Dotted" },
  driving: { pattern: [1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0], name: "Driving" },
  sparse: { pattern: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], name: "Sparse" },
  arpUp: { pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], name: "Arp Up", isArp: true, arpDirection: "up" },
  arpDown: { pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], name: "Arp Down", isArp: true, arpDirection: "down" },
  arpUpDown: { pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], name: "Arp U/D", isArp: true, arpDirection: "updown" },
  arpRandom: { pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], name: "Arp Rand", isArp: true, arpDirection: "random" },
}

type Chord = { root: string; type: string; name: string; frequencies: number[] }

type Settings = {
  bpm: number; timeSignature: number; barsPerChord: number; drumsEnabled: boolean;
  drumStyle: string; chordVolume: number; drumVolume: number; reverbAmount: number;
  synthType: string; synthRhythm: string;
}

const DEFAULT_SETTINGS: Settings = {
  bpm: 90, timeSignature: 4, barsPerChord: 2, drumsEnabled: true, drumStyle: "basic",
  chordVolume: 0.7, drumVolume: 0.6, reverbAmount: 0.4, synthType: "pad", synthRhythm: "sustained",
}

function formatChordType(type: string): string {
  const f: Record<string,string> = {
    maj:"",min:"m",maj7:"maj7",min7:"m7",dom7:"7","7sus4":"7sus4",add9:"add9",madd9:"madd9",
    maj9:"maj9",min9:"m9",sus2:"sus2",sus4:"sus4","6":"6",min6:"m6",dim:"dim",dim7:"dim7",
    m7b5:"m7b5",aug:"aug","11":"11",min11:"m11","13":"13","7#9":"7#9","7b9":"7b9",
  }
  return f[type] || type
}

function getChordTypeName(type: string): string {
  const n: Record<string,string> = {
    maj:"Major",min:"Minor",maj7:"Major 7",min7:"Minor 7",dom7:"Dominant 7","7sus4":"Dom 7sus4",
    add9:"Add 9",madd9:"Minor add9",maj9:"Major 9",min9:"Minor 9",sus2:"Sus 2",sus4:"Sus 4",
    "6":"Major 6",min6:"Minor 6",dim:"Diminished",dim7:"Dim 7",m7b5:"Half-dim",aug:"Augmented",
    "11":"Dominant 11",min11:"Minor 11","13":"Dominant 13","7#9":"7 Sharp 9","7b9":"7 Flat 9",
  }
  return n[type] || type
}

function getScaleNotes(rootNote: string, mode: string): string[] {
  const ri = NOTES.indexOf(rootNote)
  const s = SCALES[mode] || SCALES.major
  return s.map((i) => NOTES[(ri + i) % 12])
}

function getChordNotes(rootNote: string, chordType: string, octave: number = 3): number[] {
  const ri = NOTES.indexOf(rootNote)
  const ints = CHORD_TYPES[chordType] || CHORD_TYPES.maj
  return ints.map((interval) => {
    const ni = (ri + interval) % 12
    const no = octave + Math.floor((ri + interval) / 12)
    const n = NOTES[ni]
    return NOTE_FREQUENCIES[n] * Math.pow(2, no - 4)
  })
}

// ── COMPONENT ──
export default function ChordGenerator() {
  const [key, setKey] = useState("C")
  const [mode, setMode] = useState("major")
  const [style, setStyle] = useState("modern")
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [bpmInput, setBpmInput] = useState(settings.bpm.toString())
  const [progression, setProgression] = useState<Chord[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeChordIndex, setActiveChordIndex] = useState(-1)
  const [savedProgressions, setSavedProgressions] = useState<{name:string;key:string;mode:string;chords:Chord[]}[]>([])
  const [editingChord, setEditingChord] = useState<{index:number,root:string,type:string}|null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // JW-02 animations
  const [booted, setBooted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const [waveBars, setWaveBars] = useState<number[]>(Array(32).fill(4))

  useEffect(() => { setBpmInput(settings.bpm.toString()) }, [settings.bpm])

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chord-gen-config")
    if (saved) {
      try {
        const c = JSON.parse(saved)
        if (c.key) setKey(c.key)
        if (c.mode) setMode(c.mode)
        if (c.style) setStyle(c.style)
        if (c.settings) setSettings(c.settings)
        if (c.progression) { setProgression(c.progression); progressionRef.current = c.progression }
        if (c.savedProgressions) setSavedProgressions(c.savedProgressions)
      } catch(e) { console.error("Failed to load config", e) }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem("chord-gen-config", JSON.stringify({ key, mode, style, settings, progression, savedProgressions }))
  }, [key, mode, style, settings, progression, savedProgressions, isLoaded])

  // Glitch ref
  const glitchRef = useRef<HTMLSpanElement|null>(null)
  useEffect(() => {
    const el = glitchRef.current
    if (!el || !glitching) return
    el.classList.remove("glitching")
    void el.offsetWidth
    el.classList.add("glitching")
    const t = setTimeout(() => el.classList.remove("glitching"), 520)
    return () => clearTimeout(t)
  }, [glitching])

  // Audio refs
  const audioCtxRef = useRef<AudioContext|null>(null)
  const masterGainRef = useRef<GainNode|null>(null)
  const reverbNodeRef = useRef<ConvolverNode|null>(null)
  const isPlayingRef = useRef(false)
  const currentChordIndexRef = useRef(0)
  const currentBeatRef = useRef(0)
  const nextNoteTimeRef = useRef(0)
  const schedulerTimerRef = useRef<number|null>(null)
  const progressionRef = useRef<Chord[]>([])
  const settingsRef = useRef(settings)
  const activeNodesRef = useRef<Array<OscillatorNode|AudioBufferSourceNode>>([])
  const arpNoteIndexRef = useRef(0)

  useEffect(() => { progressionRef.current = progression }, [progression])
  useEffect(() => { settingsRef.current = settings }, [settings])

  // Randomize wave bars periodically when playing
  useEffect(() => {
    if (!isPlaying) {
      setWaveBars(Array(32).fill(4))
      return
    }
    const id = setInterval(() => {
      setWaveBars(Array.from({length:32},() => Math.max(4, Math.floor(Math.random()*36))))
    }, 200)
    return () => clearInterval(id)
  }, [isPlaying])

  // Reveal after boot
  useEffect(() => {
    if (booted) {
      const t = setTimeout(() => setRevealed(true), 100)
      return () => clearTimeout(t)
    }
  }, [booted])

  const createReverb = useCallback(() => {
    if (!audioCtxRef.current) return null
    const convolver = audioCtxRef.current.createConvolver()
    const rate = audioCtxRef.current.sampleRate
    const length = rate * 3
    const decay = 3
    const impulse = audioCtxRef.current.createBuffer(2, length, rate)
    for (let ch=0; ch<2; ch++) {
      const d = impulse.getChannelData(ch)
      for (let i=0; i<length; i++) {
        const early = i < rate * 0.03
        const density = early ? 0.8 : 0.4
        const refl = early ? 0.6 : Math.pow(1 - i/length, decay)
        d[i] = (Math.random()*2-1) * refl * density * (1 + (ch===0?0.1:-0.1))
      }
    }
    convolver.buffer = impulse
    return convolver
  }, [])

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return
    const AC = window.AudioContext || (window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext
    audioCtxRef.current = new AC()
    masterGainRef.current = audioCtxRef.current.createGain()
    masterGainRef.current.gain.value = 0.75
    const compressor = audioCtxRef.current.createDynamicsCompressor()
    compressor.threshold.value = -18; compressor.knee.value = 6; compressor.ratio.value = 3
    compressor.attack.value = 0.003; compressor.release.value = 0.25
    const limiter = audioCtxRef.current.createGain()
    limiter.gain.value = 1.0
    reverbNodeRef.current = createReverb()
    if (reverbNodeRef.current) reverbNodeRef.current.connect(compressor)
    masterGainRef.current.connect(compressor)
    compressor.connect(limiter)
    limiter.connect(audioCtxRef.current.destination)
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume()
  }, [createReverb])

  const stopAllNodes = useCallback(() => {
    const nodes = activeNodesRef.current
    activeNodesRef.current = []
    nodes.forEach((node) => { try { node.stop(); node.disconnect() } catch {} })
  }, [])

  const playSingleNote = useCallback((freq: number, time: number, duration: number, synthType: string) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    const vol = settingsRef.current.chordVolume
    const reverbAmount = settingsRef.current.reverbAmount
    const applyReverb = (node: AudioNode) => {
      if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
      const dryGain = audioCtxRef.current.createGain()
      const wetGain = audioCtxRef.current.createGain()
      dryGain.gain.value = 1 - reverbAmount
      wetGain.gain.value = reverbAmount
      node.connect(dryGain)
      node.connect(wetGain)
      dryGain.connect(masterGainRef.current)
      wetGain.connect(reverbNodeRef.current)
    }
    const trackNode = (n: OscillatorNode|AudioBufferSourceNode) => {
      n.onended = () => { const i = activeNodesRef.current.indexOf(n); if (i>=0) activeNodesRef.current.splice(i,1) }
      activeNodesRef.current.push(n)
    }
    switch (synthType) {
      case "pad": {
        const oscs: OscillatorNode[] = []
        const detunes = [-0.03,0,0.03,1.002]
        const types = ["sawtooth","sawtooth","sawtooth","triangle"]
        for (let i=0;i<4;i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = types[i] as OscillatorType
          osc.frequency.value = freq * detunes[i]
          oscs.push(osc)
        }
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(4000, time)
        filter.frequency.linearRampToValueAtTime(800, time + duration*0.5)
        filter.Q.value = 1.5
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.2, time+0.15)
        gain.gain.setValueAtTime(vol*0.18, time+duration-0.15)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        oscs.forEach(o => o.connect(filter))
        filter.connect(gain)
        applyReverb(gain)
        oscs.forEach(o => { trackNode(o); o.start(time); o.stop(time+duration) })
        break
      }
      case "pluck": {
        const osc = audioCtxRef.current.createOscillator()
        const osc2 = audioCtxRef.current.createOscillator()
        osc.type = "triangle"; osc2.type = "sine"
        osc.frequency.value = freq; osc2.frequency.value = freq*2.01
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(5000, time)
        filter.frequency.exponentialRampToValueAtTime(400, time+0.3)
        filter.Q.value = 3
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(vol*0.4, time)
        gain.gain.exponentialRampToValueAtTime(0.001, time+Math.min(duration,1.8))
        osc.connect(filter); osc2.connect(filter)
        filter.connect(gain); applyReverb(gain)
        trackNode(osc); trackNode(osc2)
        osc.start(time); osc2.start(time)
        osc.stop(time+duration); osc2.stop(time+duration)
        break
      }
      case "keys": {
        const osc1 = audioCtxRef.current.createOscillator()
        const osc2 = audioCtxRef.current.createOscillator()
        const osc3 = audioCtxRef.current.createOscillator()
        osc1.type = "sine"; osc2.type = "triangle"; osc3.type = "sine"
        osc1.frequency.value = freq; osc2.frequency.value = freq*2.001; osc3.frequency.value = freq*3.005
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"; filter.frequency.value = 4000
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(vol*0.25, time)
        gain.gain.setValueAtTime(vol*0.18, time+0.05)
        gain.gain.linearRampToValueAtTime(0, time+duration-0.05)
        osc1.connect(filter); osc2.connect(filter); osc3.connect(filter)
        filter.connect(gain); applyReverb(gain)
        trackNode(osc1); trackNode(osc2); trackNode(osc3)
        osc1.start(time); osc2.start(time); osc3.start(time)
        osc1.stop(time+duration); osc2.stop(time+duration); osc3.stop(time+duration)
        break
      }
      case "strings": {
        const oscs: OscillatorNode[] = []
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"; filter.frequency.value = 3000; filter.Q.value = 0.5
        for (let i=0;i<4;i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i-1.5)*0.004)
          osc.connect(filter)
          oscs.push(osc)
        }
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.15, time+0.2)
        gain.gain.setValueAtTime(vol*0.13, time+duration-0.15)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        filter.connect(gain); applyReverb(gain)
        oscs.forEach(o => { trackNode(o); o.start(time); o.stop(time+duration) })
        break
      }
      case "organ": {
        const harmonics = [1,2,3,4,5,6]
        const harmonicGains = [1,0.6,0.3,0.2,0.1,0.05]
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"; filter.frequency.value = 5000
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.15, time+0.005)
        gain.gain.setValueAtTime(vol*0.15, time+duration-0.1)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        harmonics.forEach((h,i) => {
          const osc = audioCtxRef.current!.createOscillator()
          osc.type = "sine"; osc.frequency.value = freq*h
          const hg = audioCtxRef.current!.createGain()
          hg.gain.value = harmonicGains[i]
          osc.connect(hg); hg.connect(filter)
          trackNode(osc); osc.start(time); osc.stop(time+duration)
        })
        filter.connect(gain); applyReverb(gain)
        break
      }
      case "bell": {
        const partials = [1,2.4,3,4.6,5.4,6.8]
        const gains = [1,0.7,0.5,0.3,0.2,0.1]
        partials.forEach((p,i) => {
          const osc = audioCtxRef.current!.createOscillator()
          const g = audioCtxRef.current!.createGain()
          osc.type = "sine"; osc.frequency.value = freq*p
          g.gain.setValueAtTime(vol*0.18*gains[i], time)
          g.gain.exponentialRampToValueAtTime(0.001, time+duration*(1-i*0.12))
          osc.connect(g); applyReverb(g)
          trackNode(osc); osc.start(time); osc.stop(time+duration)
        })
        break
      }
      case "bass": {
        const sub = audioCtxRef.current.createOscillator()
        const punch = audioCtxRef.current.createOscillator()
        sub.type = "sine"; punch.type = "square"
        sub.frequency.value = freq/2; punch.frequency.value = freq/2
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(600, time)
        filter.frequency.linearRampToValueAtTime(200, time+0.15)
        filter.Q.value = 3
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(vol*0.35, time)
        gain.gain.setValueAtTime(vol*0.25, time+0.05)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        sub.connect(filter); punch.connect(filter); filter.connect(gain)
        const shaper = audioCtxRef.current.createWaveShaper()
        const curve = new Float32Array(256)
        for (let i=0;i<256;i++) { const x=(i-128)/128; curve[i]=Math.tanh(x*1.5)/Math.tanh(1.5) }
        shaper.curve = curve
        gain.connect(shaper); applyReverb(shaper)
        trackNode(sub); trackNode(punch)
        sub.start(time); punch.start(time)
        sub.stop(time+duration); punch.stop(time+duration)
        break
      }
      case "lead": {
        const oscs: OscillatorNode[] = []
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(5000, time)
        filter.frequency.linearRampToValueAtTime(500, time+duration*0.7)
        filter.Q.value = 5
        for (let i=0;i<3;i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i-1)*0.008)
          osc.connect(filter)
          oscs.push(osc)
        }
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.22, time+0.03)
        gain.gain.setValueAtTime(vol*0.2, time+0.08)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        filter.connect(gain); applyReverb(gain)
        oscs.forEach(o => { trackNode(o); o.start(time); o.stop(time+duration) })
        break
      }
      case "brass": {
        const oscs: OscillatorNode[] = []
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(300, time)
        filter.frequency.linearRampToValueAtTime(3000, time+0.08)
        filter.frequency.linearRampToValueAtTime(1500, time+duration)
        filter.Q.value = 1.5
        for (let i=0;i<3;i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i-1)*0.005)
          osc.connect(filter)
          oscs.push(osc)
        }
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.18, time+0.05)
        gain.gain.setValueAtTime(vol*0.15, time+0.15)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        filter.connect(gain); applyReverb(gain)
        oscs.forEach(o => { trackNode(o); o.start(time); o.stop(time+duration) })
        break
      }
      case "fm": {
        const carrier = audioCtxRef.current.createOscillator()
        const modulator = audioCtxRef.current.createOscillator()
        const modGain = audioCtxRef.current.createGain()
        const gain = audioCtxRef.current.createGain()
        const filter = audioCtxRef.current.createBiquadFilter()
        carrier.type = "sine"; modulator.type = "sine"
        carrier.frequency.value = freq; modulator.frequency.value = freq*3
        modGain.gain.setValueAtTime(freq*0.5, time)
        modGain.gain.linearRampToValueAtTime(freq*0.05, time+duration*0.5)
        modulator.connect(modGain); modGain.connect(carrier.frequency)
        filter.type = "lowpass"; filter.frequency.value = 6000
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.25, time+0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, time+duration)
        carrier.connect(filter); filter.connect(gain); applyReverb(gain)
        trackNode(carrier); trackNode(modulator)
        carrier.start(time); modulator.start(time)
        carrier.stop(time+duration); modulator.stop(time+duration)
        break
      }
      case "supersaw": {
        const oscs: OscillatorNode[] = []
        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(5000, time)
        filter.frequency.linearRampToValueAtTime(2000, time+duration*0.5)
        filter.Q.value = 1.5
        for (let i=0;i<9;i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i-4)*0.008)
          osc.connect(filter)
          oscs.push(osc)
        }
        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol*0.12, time+0.05)
        gain.gain.setValueAtTime(vol*0.12, time+duration-0.1)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        filter.connect(gain); applyReverb(gain)
        oscs.forEach(o => { trackNode(o); o.start(time); o.stop(time+duration) })
        break
      }
      case "wobble": {
        const osc = audioCtxRef.current.createOscillator()
        const osc2 = audioCtxRef.current.createOscillator()
        const lfo = audioCtxRef.current.createOscillator()
        const lfoGain = audioCtxRef.current.createGain()
        const gain = audioCtxRef.current.createGain()
        const filter = audioCtxRef.current.createBiquadFilter()
        const filter2 = audioCtxRef.current.createBiquadFilter()
        osc.type = "sawtooth"; osc2.type = "square"
        osc.frequency.value = freq; osc2.frequency.value = freq*1.005
        const bpm = settingsRef.current.bpm
        const wobbleRate = (bpm/60)*2
        lfo.type = "sine"; lfo.frequency.value = wobbleRate
        lfoGain.gain.value = 2000
        lfo.connect(lfoGain); lfoGain.connect(filter.frequency)
        filter.type = "lowpass"; filter.frequency.value = 2000; filter.Q.value = 8
        filter2.type = "highpass"; filter2.frequency.value = 200
        gain.gain.setValueAtTime(vol*0.25, time)
        gain.gain.setValueAtTime(vol*0.25, time+duration-0.1)
        gain.gain.linearRampToValueAtTime(0, time+duration)
        osc.connect(filter); osc2.connect(filter)
        filter.connect(filter2); filter2.connect(gain); applyReverb(gain)
        trackNode(osc); trackNode(osc2); trackNode(lfo)
        osc.start(time); osc2.start(time); lfo.start(time)
        osc.stop(time+duration); osc2.stop(time+duration); lfo.stop(time+duration)
        break
      }
    }
  }, [])

  const playChord = useCallback((frequencies: number[], time: number, duration: number) => {
    const synthType = settingsRef.current.synthType
    frequencies.forEach((freq) => playSingleNote(freq, time, duration, synthType))
  }, [playSingleNote])

  const playArpNote = useCallback((frequencies: number[], time: number, duration: number, direction: string) => {
    if (frequencies.length === 0) return
    let noteIndex: number
    switch (direction) {
      case "up": noteIndex = arpNoteIndexRef.current % frequencies.length; arpNoteIndexRef.current++; break
      case "down": noteIndex = (frequencies.length-1) - (arpNoteIndexRef.current % frequencies.length); arpNoteIndexRef.current++; break
      case "updown":
        const totalCycle = frequencies.length*2-2
        const pos = arpNoteIndexRef.current % totalCycle
        noteIndex = pos < frequencies.length ? pos : totalCycle - pos
        arpNoteIndexRef.current++; break
      case "random": noteIndex = Math.floor(Math.random()*frequencies.length); break
      default: noteIndex = 0
    }
    playSingleNote(frequencies[noteIndex], time, duration, settingsRef.current.synthType)
  }, [playSingleNote])

  const playKick = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    const vol = settingsRef.current.drumVolume * 1.0
    const rate = audioCtxRef.current.sampleRate
    const attackLen = rate * 0.03
    const attackBuffer = audioCtxRef.current.createBuffer(1, attackLen, rate)
    const attackData = attackBuffer.getChannelData(0)
    for (let i=0;i<attackLen;i++) attackData[i] = (Math.random()*2-1) * Math.pow(1-i/attackLen, 6)
    const attackSource = audioCtxRef.current.createBufferSource()
    attackSource.buffer = attackBuffer
    const attackFilter = audioCtxRef.current.createBiquadFilter()
    attackFilter.type = "bandpass"; attackFilter.frequency.value = 500; attackFilter.Q.value = 2.0
    const attackGain = audioCtxRef.current.createGain()
    attackGain.gain.setValueAtTime(vol*0.5, time)
    attackGain.gain.exponentialRampToValueAtTime(0.001, time+0.03)
    attackSource.connect(attackFilter); attackFilter.connect(attackGain)
    const bodyOsc = audioCtxRef.current.createOscillator()
    const bodyGain = audioCtxRef.current.createGain()
    bodyOsc.type = "sine"
    bodyOsc.frequency.setValueAtTime(120, time)
    bodyOsc.frequency.exponentialRampToValueAtTime(45, time+0.15)
    bodyGain.gain.setValueAtTime(vol*0.8, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time+0.35)
    bodyOsc.connect(bodyGain)
    const boomOsc = audioCtxRef.current.createOscillator()
    const boomGain = audioCtxRef.current.createGain()
    boomOsc.type = "sine"
    boomOsc.frequency.setValueAtTime(60, time)
    boomOsc.frequency.exponentialRampToValueAtTime(25, time+0.25)
    boomGain.gain.setValueAtTime(vol*0.6, time)
    boomGain.gain.exponentialRampToValueAtTime(0.001, time+0.5)
    boomOsc.connect(boomGain)
    const sumGain = audioCtxRef.current.createGain()
    attackGain.connect(sumGain); bodyGain.connect(sumGain); boomGain.connect(sumGain)
    const filter = audioCtxRef.current.createBiquadFilter()
    filter.type = "lowpass"; filter.frequency.value = 400
    sumGain.connect(filter)
    const dryGain = audioCtxRef.current.createGain()
    const wetGain = audioCtxRef.current.createGain()
    const reverbAmount = settingsRef.current.reverbAmount * 0.2
    dryGain.gain.value = 1 - reverbAmount
    wetGain.gain.value = reverbAmount
    filter.connect(dryGain); filter.connect(wetGain)
    dryGain.connect(masterGainRef.current); wetGain.connect(reverbNodeRef.current)
    const track = (n: OscillatorNode|AudioBufferSourceNode) => { activeNodesRef.current.push(n); n.onended = () => { const i = activeNodesRef.current.indexOf(n); if (i>=0) activeNodesRef.current.splice(i,1) } }
    track(attackSource); track(bodyOsc); track(boomOsc)
    attackSource.start(time); bodyOsc.start(time); boomOsc.start(time)
    attackSource.stop(time+0.04); bodyOsc.stop(time+0.4); boomOsc.stop(time+0.55)
  }, [])

  const playSnare = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    const vol = settingsRef.current.drumVolume * 0.9
    const rate = audioCtxRef.current.sampleRate
    const attackLen = rate * 0.005
    const attackBuffer = audioCtxRef.current.createBuffer(1, attackLen, rate)
    const ad = attackBuffer.getChannelData(0)
    for (let i=0;i<attackLen;i++) ad[i] = (Math.random()*2-1) * Math.pow(1-i/attackLen, 8)
    const attackSource = audioCtxRef.current.createBufferSource()
    attackSource.buffer = attackBuffer
    const attackGain = audioCtxRef.current.createGain()
    attackGain.gain.setValueAtTime(vol*0.4, time)
    attackGain.gain.exponentialRampToValueAtTime(0.001, time+0.006)
    attackSource.connect(attackGain)
    const wireLen = rate * 0.12
    const wireBuffer = audioCtxRef.current.createBuffer(1, wireLen, rate)
    const wd = wireBuffer.getChannelData(0)
    for (let i=0;i<wireLen;i++) wd[i] = (Math.random()*2-1) * Math.pow(1-i/wireLen, 3)
    const wireSource = audioCtxRef.current.createBufferSource()
    wireSource.buffer = wireBuffer
    const wireFilter = audioCtxRef.current.createBiquadFilter()
    wireFilter.type = "highpass"; wireFilter.frequency.value = 2000
    const wireGain = audioCtxRef.current.createGain()
    wireGain.gain.setValueAtTime(vol*0.5, time)
    wireGain.gain.exponentialRampToValueAtTime(0.001, time+0.1)
    wireSource.connect(wireFilter); wireFilter.connect(wireGain)
    const bodyLen = rate * 0.2
    const bodyBuffer = audioCtxRef.current.createBuffer(1, bodyLen, rate)
    const bd = bodyBuffer.getChannelData(0)
    for (let i=0;i<bodyLen;i++) bd[i] = (Math.random()*2-1) * Math.pow(1-i/bodyLen, 1.5)
    const bodySource = audioCtxRef.current.createBufferSource()
    bodySource.buffer = bodyBuffer
    const bodyFilter = audioCtxRef.current.createBiquadFilter()
    bodyFilter.type = "lowpass"; bodyFilter.frequency.value = 1000
    const bodyGain = audioCtxRef.current.createGain()
    bodyGain.gain.setValueAtTime(vol*0.6, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time+0.2)
    bodySource.connect(bodyFilter); bodyFilter.connect(bodyGain)
    const sumGain = audioCtxRef.current.createGain()
    attackGain.connect(sumGain); wireGain.connect(sumGain); bodyGain.connect(sumGain)
    const dryGain = audioCtxRef.current.createGain()
    const wetGain = audioCtxRef.current.createGain()
    const reverbAmount = settingsRef.current.reverbAmount * 0.35
    dryGain.gain.value = 1 - reverbAmount; wetGain.gain.value = reverbAmount
    sumGain.connect(dryGain); sumGain.connect(wetGain)
    dryGain.connect(masterGainRef.current); wetGain.connect(reverbNodeRef.current)
    const track = (n: AudioBufferSourceNode) => { activeNodesRef.current.push(n); n.onended = () => { const i = activeNodesRef.current.indexOf(n); if (i>=0) activeNodesRef.current.splice(i,1) } }
    track(attackSource); track(wireSource); track(bodySource)
    attackSource.start(time); wireSource.start(time); bodySource.start(time)
    attackSource.stop(time+0.008); wireSource.stop(time+0.14); bodySource.stop(time+0.22)
  }, [])

  const playHiHat = useCallback((time: number, open: boolean = false) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    const vol = settingsRef.current.drumVolume * (open ? 0.3 : 0.35)
    const hiLen = open ? 0.35 : 0.05
    const rate = audioCtxRef.current.sampleRate
    const washLen = rate * hiLen
    const washBuffer = audioCtxRef.current.createBuffer(2, washLen, rate)
    for (let ch=0; ch<2; ch++) {
      const cd = washBuffer.getChannelData(ch)
      for (let i=0;i<washLen;i++) {
        const env = Math.pow(1-i/washLen, open ? 1.0 : 6)
        cd[i] = (Math.random()*2-1) * env
      }
    }
    const washSource = audioCtxRef.current.createBufferSource()
    washSource.buffer = washBuffer
    const hpFilter = audioCtxRef.current.createBiquadFilter()
    hpFilter.type = "highpass"; hpFilter.frequency.value = open ? 3000 : 5000
    const washGain = audioCtxRef.current.createGain()
    washGain.gain.setValueAtTime(vol*0.8, time)
    washGain.gain.exponentialRampToValueAtTime(0.001, time+hiLen)
    washSource.connect(hpFilter); hpFilter.connect(washGain)
    const sizzleLen = rate * (open ? 0.2 : 0.03)
    const sizzleBuffer = audioCtxRef.current.createBuffer(1, sizzleLen, rate)
    const sd = sizzleBuffer.getChannelData(0)
    for (let i=0;i<sizzleLen;i++) sd[i] = (Math.random()*2-1) * Math.pow(1-i/sizzleLen, open ? 1.5 : 10)
    const sizzleSource = audioCtxRef.current.createBufferSource()
    sizzleSource.buffer = sizzleBuffer
    const sizzleBP = audioCtxRef.current.createBiquadFilter()
    sizzleBP.type = "bandpass"; sizzleBP.frequency.value = open ? 5000 : 8000; sizzleBP.Q.value = open ? 0.5 : 0.3
    const sizzleGain = audioCtxRef.current.createGain()
    sizzleGain.gain.setValueAtTime(vol*0.5, time)
    sizzleGain.gain.exponentialRampToValueAtTime(0.001, time+(open?0.15:0.02))
    sizzleSource.connect(sizzleBP); sizzleBP.connect(sizzleGain)
    const sumGain = audioCtxRef.current.createGain()
    washGain.connect(sumGain); sizzleGain.connect(sumGain)
    const dryGain = audioCtxRef.current.createGain()
    const wetGain = audioCtxRef.current.createGain()
    const reverbAmount = settingsRef.current.reverbAmount * 0.25
    dryGain.gain.value = 1 - reverbAmount; wetGain.gain.value = reverbAmount
    sumGain.connect(dryGain); sumGain.connect(wetGain)
    dryGain.connect(masterGainRef.current); wetGain.connect(reverbNodeRef.current)
    const track = (n: AudioBufferSourceNode) => { activeNodesRef.current.push(n); n.onended = () => { const i = activeNodesRef.current.indexOf(n); if (i>=0) activeNodesRef.current.splice(i,1) } }
    track(washSource); track(sizzleSource)
    washSource.start(time); sizzleSource.start(time)
    washSource.stop(time+hiLen+0.01); sizzleSource.stop(time+(open?0.22:0.04))
  }, [])

  const scheduleNote = useCallback((time: number) => {
    if (!isPlayingRef.current) return
    const beatsPerBar = settingsRef.current.timeSignature
    const stepsPerBar = beatsPerBar * 4
    const totalSteps = stepsPerBar * settingsRef.current.barsPerChord
    const drumPatterns = DRUM_STYLE_PATTERNS[settingsRef.current.drumStyle] || DRUM_STYLE_PATTERNS.basic
    const pattern = drumPatterns[String(settingsRef.current.timeSignature)] || drumPatterns["4"]
    const patternStep = currentBeatRef.current % pattern.kick.length
    if (settingsRef.current.drumsEnabled) {
      if (pattern.kick[patternStep]) playKick(time)
      if (pattern.snare[patternStep]) playSnare(time)
      if (pattern.hihat[patternStep]) playHiHat(time)
      if (pattern.openHat[patternStep]) playHiHat(time, true)
    }
    const synthRhythm = SYNTH_RHYTHMS[settingsRef.current.synthRhythm] || SYNTH_RHYTHMS.sustained
    const synthPatternStep = currentBeatRef.current % synthRhythm.pattern.length
    const chordStepInBar = currentBeatRef.current % totalSteps
    const chord = progressionRef.current[currentChordIndexRef.current]
    if (!chord) {
      currentBeatRef.current++
      if (currentBeatRef.current >= totalSteps) {
        currentBeatRef.current = 0
        currentChordIndexRef.current = (currentChordIndexRef.current + 1) % progressionRef.current.length
        arpNoteIndexRef.current = 0
      }
      return
    }
    if (chordStepInBar === 0) {
      arpNoteIndexRef.current = 0
      const audioCtx = audioCtxRef.current
      if (audioCtx) {
        setTimeout(() => setActiveChordIndex(currentChordIndexRef.current), (time - audioCtx.currentTime)*1000)
      }
    }
    if (settingsRef.current.synthRhythm === "sustained") {
      if (chordStepInBar === 0) {
        const chordDuration = (60/settingsRef.current.bpm) * beatsPerBar * settingsRef.current.barsPerChord
        playChord(chord.frequencies, time, chordDuration)
      }
    } else if (synthRhythm.isArp) {
      if (synthRhythm.pattern[synthPatternStep]) {
        const noteDuration = (60/settingsRef.current.bpm)/4 * 1.5
        playArpNote(chord.frequencies, time, noteDuration, synthRhythm.arpDirection || "up")
      }
    } else {
      if (synthRhythm.pattern[synthPatternStep]) {
        const noteDuration = (60/settingsRef.current.bpm)/4 * 1.5
        playChord(chord.frequencies, time, noteDuration)
      }
    }
    currentBeatRef.current++
    if (currentBeatRef.current >= totalSteps) {
      currentBeatRef.current = 0
      currentChordIndexRef.current = (currentChordIndexRef.current + 1) % progressionRef.current.length
      arpNoteIndexRef.current = 0
    }
  }, [playKick, playSnare, playHiHat, playChord, playArpNote])

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioCtxRef.current) return
    const secondsPerBeat = 60 / settingsRef.current.bpm
    const scheduleAheadTime = 0.2
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
      if (!isPlayingRef.current) break
      scheduleNote(nextNoteTimeRef.current)
      nextNoteTimeRef.current += secondsPerBeat / 4
    }
    if (isPlayingRef.current) schedulerTimerRef.current = window.setTimeout(scheduler, 50)
  }, [scheduleNote])

  const generateProgression = useCallback(() => {
    const modeFamily = ["minor","dorian","phrygian","locrian","aeolian","harmonicMinor","melodicMinor","hungarian","persian"].includes(mode) ? "minor" : "major"
    const styleProgs = STYLE_PROGRESSIONS[style] || STYLE_PROGRESSIONS.modern
    const progressions = styleProgs[modeFamily]
    const selectedProg = progressions[Math.floor(Math.random()*progressions.length)]
    const scaleNotes = getScaleNotes(key, mode)
    const newProgression = selectedProg.map((chord) => {
      const rootNote = scaleNotes[(chord.deg-1) % scaleNotes.length]
      return { root: rootNote, type: chord.type, name: rootNote + formatChordType(chord.type), frequencies: getChordNotes(rootNote, chord.type, 3) }
    })
    setProgression(newProgression)
    progressionRef.current = newProgression
    if (isPlayingRef.current) {
      currentChordIndexRef.current = 0
      currentBeatRef.current = 0
      arpNoteIndexRef.current = 0
    }
    // Trigger glitch
    setGlitching(true)
    setTimeout(() => setGlitching(false), 520)
  }, [key, mode, style])

  const updateChord = useCallback((index: number, root: string, type: string) => {
    const frequencies = getChordNotes(root, type, 3)
    const name = root + formatChordType(type)
    const newChord = { root, type, name, frequencies }
    const newProgression = [...progressionRef.current]
    newProgression[index] = newChord
    setProgression(newProgression)
    progressionRef.current = newProgression
    setEditingChord(null)
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setKey("C")
    setMode("major")
    setStyle("modern")
  }, [])

  const startPlayback = useCallback(() => {
    initAudio()
    if (progressionRef.current.length === 0) generateProgression()
    isPlayingRef.current = true
    setIsPlaying(true)
    currentChordIndexRef.current = 0
    currentBeatRef.current = 0
    arpNoteIndexRef.current = 0
    if (audioCtxRef.current) nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1
    scheduler()
  }, [initAudio, generateProgression, scheduler])

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setActiveChordIndex(-1)
    if (schedulerTimerRef.current) { clearTimeout(schedulerTimerRef.current); schedulerTimerRef.current = null }
    stopAllNodes()
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; masterGainRef.current = null; reverbNodeRef.current = null }
  }, [stopAllNodes])

  const playChordPreview = useCallback((index: number) => {
    initAudio()
    const chord = progressionRef.current[index]
    if (chord && audioCtxRef.current) playChord(chord.frequencies, audioCtxRef.current.currentTime, 1.5)
  }, [initAudio, playChord])

  const saveProgression = useCallback(() => {
    if (progression.length === 0) return
    const name = `${key} ${mode} - ${new Date().toLocaleTimeString()}`
    setSavedProgressions((prev) => [...prev, { name, key, mode, chords: progression }])
  }, [progression, key, mode])

  const loadProgression = useCallback((saved: {chords: Chord[]}) => {
    setProgression(saved.chords)
    progressionRef.current = saved.chords
  }, [])

  const deleteSavedProgression = useCallback((index: number) => {
    setSavedProgressions((prev) => prev.filter((_,i) => i !== index))
  }, [])

  const exportProgression = useCallback(() => {
    const text = progression.map((c) => c.name).join(" - ")
    navigator.clipboard.writeText(text)
  }, [progression])

  const exportMidi = useCallback(() => {
    const chordNames = progression.map((c) => c.name).join(" | ")
    const midiText = `CHORD PROGRESSION EXPORT\n========================\nKey: ${key} ${mode}\nStyle: ${style}\nBPM: ${settings.bpm}\nTime: ${settings.timeSignature}/4\n\nProgression:\n${chordNames}\n\nChord Details:\n${progression.map((c,i) => `${i+1}. ${c.name} (${c.type})`).join("\n")}`
    const blob = new Blob([midiText], {type:"text/plain"})
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `progression-${key}-${mode}.txt`; a.click()
    URL.revokeObjectURL(url)
  }, [progression, key, mode, style, settings.bpm, settings.timeSignature])

  // Generate initial progression
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (!isLoaded) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (progressionRef.current.length === 0) generateProgression()
      return
    }
    generateProgression()
  }, [generateProgression, isLoaded])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault()
        if (isPlayingRef.current) { stopPlayback() } else { startPlayback() }
      }
      if (e.code === "KeyR" && (e.target as HTMLElement).tagName !== "INPUT") generateProgression()
      if (e.code === "KeyS" && (e.target as HTMLElement).tagName !== "INPUT") saveProgression()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [stopPlayback, startPlayback, generateProgression, saveProgression])

  // ── RENDER ──
  return (
    <>
      {/* Overlays */}
      <div id="noise-overlay" />
      <div id="scanlines-overlay" />
      <div id="glow-overlay" />

      {/* Boot Overlay */}
      {!booted && (
        <div id="boot-overlay" onClick={() => setBooted(true)}>
          <div className="boot-logo">CHORD.GEN</div>
          <div className="boot-log">
            <div className="boot-log-line ok" style={{animationDelay:"200ms"}}>[OK] Audio subsystem initialized</div>
            <div className="boot-log-line ok" style={{animationDelay:"400ms"}}>[OK] Synthesis engine ready</div>
            <div className="boot-log-line ok" style={{animationDelay:"600ms"}}>[OK] Drum patterns loaded</div>
            <div className="boot-log-line warn" style={{animationDelay:"800ms"}}>[WARN] No MIDI devices detected</div>
            <div className="boot-log-line ok" style={{animationDelay:"1000ms"}}>[OK] Reverb convolution generated</div>
            <div className="boot-log-line ok" style={{animationDelay:"1200ms"}}>[OK] Ready for activation</div>
          </div>
          <div className="boot-prompt">
            <span className="status-prompt">&gt;</span> PRESS ANY KEY TO ACTIVATE <span className="boot-cursor">█</span>
          </div>
        </div>
      )}

      <div id="app">
        {/* Top Bar */}
        <div className={`top-bar reveal-item ${revealed ? "revealed" : ""} reveal-delay-1`}>
          <div className="flex items-center gap-2">
            <span className="logo">CHORD.GEN</span>
            <span className="version-tag">v.02</span>
          </div>
          <div className="status-leds">
            <span className={`led ${isPlaying ? "on" : "off"}`} />
            <span className="led-label">{isPlaying ? "PLAYING" : "STOPPED"}</span>
          </div>
        </div>

        {/* Main Chord Display Panel */}
        <div className={`panel p-4 md:p-6 mb-4 reveal-item ${revealed ? "revealed" : ""} reveal-delay-2`}>
          {/* Waveform deco */}
          <div className="waveform-deco">
            {waveBars.map((h,i) => (
              <div key={i} className="bar" style={{height: `${h}px`}} />
            ))}
          </div>

          {/* Chord cards — vertical stack */}
          <div className="flex flex-col gap-2 mb-4">
            {progression.map((chord, i) => (
              <button
                key={`${chord.name}-${i}`}
                onClick={() => playChordPreview(i)}
                className={`chord-card ${activeChordIndex === i ? "active" : ""} chord-anim-in`}
                style={{animationDelay: `${i * 80}ms`}}
              >
                <div className="flex items-baseline gap-2">
                  <span className="chord-root">{chord.root}</span>
                  <span className="chord-type">{formatChordType(chord.type)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="chord-degree">{getChordTypeName(chord.type)}</span>
                  <span
                    className="chord-edit-btn"
                    onClick={(e) => { e.stopPropagation(); setEditingChord({index:i, root:chord.root, type:chord.type}) }}
                  >
                    <Pencil size={11} />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Transport */}
          <div className="flex flex-col gap-2">
            <button
              onClick={isPlaying ? stopPlayback : startPlayback}
              className={`btn-play ${isPlaying ? "playing" : ""}`}
            >
              <span>{isPlaying ? "■ STOP" : "▶ PLAY"}</span>
              <span className="key-hint">SPACE</span>
            </button>
            <button onClick={generateProgression} className="btn-generate">
              <span className="glitch-text" data-text="GENERATE PROGRESSION" ref={glitchRef}>GENERATE PROGRESSION</span>
              <span className="key-hint">R</span>
            </button>
          </div>
        </div>

        {/* Action Row */}
        <div className={`flex gap-2 mb-4 reveal-item ${revealed ? "revealed" : ""} reveal-delay-3`}>
          <button onClick={exportProgression} className="action-btn flex-1" title="Copy progression">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <span className="text-[10px] tracking-widest uppercase">Copy</span>
          </button>
          <button onClick={saveProgression} className="action-btn flex-1" title="Save progression">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span className="text-[10px] tracking-widest uppercase">Save</span>
          </button>
          <button onClick={exportMidi} className="action-btn flex-1" title="Export MIDI">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="text-[10px] tracking-widest uppercase">Export</span>
          </button>
          <button onClick={resetSettings} className="action-btn flex-1" title="Reset">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            <span className="text-[10px] tracking-widest uppercase">Reset</span>
          </button>
        </div>

        {/* Control Panels — stacked vertically */}
        <div className={`reveal-item ${revealed ? "revealed" : ""} reveal-delay-4`}>
          {/* Chord Config */}
          <div className="control-section">
            <div className="control-header">
              <span className="control-header-dot" />
              <span className="control-header-title">Chord Config</span>
              <span className="control-header-meta">Key / Mode / Style / Meter</span>
            </div>
            <div className="control-body">
              <div className="control-row">
                <span className="control-label">Key</span>
                <select value={key} onChange={(e) => setKey(e.target.value)} className="ctrl-select">
                  {NOTES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="control-row">
                <span className="control-label">Mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="ctrl-select">
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="dorian">Dorian</option>
                  <option value="mixolydian">Mixolydian</option>
                  <option value="lydian">Lydian</option>
                  <option value="phrygian">Phrygian</option>
                  <option value="locrian">Locrian</option>
                  <option value="aeolian">Aeolian</option>
                  <option value="harmonicMinor">Harmonic Minor</option>
                  <option value="melodicMinor">Melodic Minor</option>
                  <option value="wholeTone">Whole Tone</option>
                  <option value="blues">Blues</option>
                  <option value="pentatonicMajor">Pentatonic Major</option>
                  <option value="pentatonicMinor">Pentatonic Minor</option>
                  <option value="hungarian">Hungarian</option>
                  <option value="japanese">Japanese</option>
                  <option value="arabian">Arabian</option>
                  <option value="persian">Persian</option>
                  <option value="bebop">Bebop</option>
                </select>
              </div>
              <div className="control-row">
                <span className="control-label">Style</span>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="ctrl-select">
                  <option value="modern">Modern Pop</option>
                  <option value="electronic">Electronic</option>
                  <option value="ambient">Ambient</option>
                  <option value="jazzy">Jazz</option>
                  <option value="lofi">Lo-Fi</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="rnb">R&B</option>
                  <option value="gospel">Gospel</option>
                  <option value="funk">Funk</option>
                  <option value="indie">Indie</option>
                  <option value="bossa">Bossa Nova</option>
                  <option value="reggaeton">Reggaeton</option>
                  <option value="country">Country</option>
                  <option value="metal">Metal</option>
                  <option value="classical">Classical</option>
                  <option value="disco">Disco</option>
                  <option value="synthwave">Synthwave</option>
                  <option value="edm">EDM</option>
                  <option value="latin">Latin</option>
                  <option value="afrobeat">Afrobeat</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="control-row">
                  <span className="control-label">BPM</span>
                  <input
                    type="number"
                    value={bpmInput}
                    onChange={(e) => { setBpmInput(e.target.value); const n=parseInt(e.target.value); if (!isNaN(n) && n>=1 && n<=999) setSettings(s=>({...s,bpm:n})) }}
                    onBlur={() => { const n=parseInt(bpmInput); const c=Math.max(40,Math.min(200,n||90)); setSettings(s=>({...s,bpm:c})); setBpmInput(c.toString()) }}
                    min={40} max={200}
                    className="ctrl-input"
                  />
                </div>
                <div className="control-row">
                  <span className="control-label">Time</span>
                  <select value={settings.timeSignature} onChange={(e) => setSettings(s=>({...s,timeSignature:parseInt(e.target.value)}))} className="ctrl-select">
                    <option value="4">4/4</option>
                    <option value="3">3/4</option>
                    <option value="6">6/8</option>
                  </select>
                </div>
                <div className="control-row">
                  <span className="control-label">Bars</span>
                  <select value={settings.barsPerChord} onChange={(e) => setSettings(s=>({...s,barsPerChord:parseInt(e.target.value)}))} className="ctrl-select">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="4">4</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Synth Config */}
          <div className="control-section">
            <div className="control-header">
              <span className="control-header-dot" style={{background:"var(--green)"}} />
              <span className="control-header-title">Synth Config</span>
              <span className="control-header-meta">Osc / Pattern / Reverb / Level</span>
            </div>
            <div className="control-body">
              <div className="control-row">
                <span className="control-label">Synth Engine</span>
                <select value={settings.synthType} onChange={(e) => setSettings(s=>({...s,synthType:e.target.value}))} className="ctrl-select">
                  <option value="pad">Pad</option>
                  <option value="pluck">Pluck</option>
                  <option value="keys">Keys</option>
                  <option value="strings">Strings</option>
                  <option value="organ">Organ</option>
                  <option value="bell">Bell</option>
                  <option value="bass">Bass</option>
                  <option value="lead">Lead</option>
                  <option value="brass">Brass</option>
                  <option value="fm">FM</option>
                  <option value="supersaw">Supersaw</option>
                  <option value="wobble">Wobble</option>
                </select>
              </div>
              <div className="control-row">
                <span className="control-label">Rhythm Pattern</span>
                <select value={settings.synthRhythm} onChange={(e) => setSettings(s=>({...s,synthRhythm:e.target.value}))} className="ctrl-select">
                  {Object.entries(SYNTH_RHYTHMS).map(([k,{name}]) => <option key={k} value={k}>{name}</option>)}
                </select>
              </div>
              <div className="control-row">
                <span className="control-label">Reverb {(settings.reverbAmount*100).toFixed(0)}%</span>
                <input type="range" min="0" max="100" value={settings.reverbAmount*100} onChange={(e) => setSettings(s=>({...s,reverbAmount:parseInt(e.target.value)/100}))} />
              </div>
              <div className="control-row">
                <span className="control-label">Chord Vol {(settings.chordVolume*100).toFixed(0)}%</span>
                <input type="range" min="0" max="100" value={settings.chordVolume*100} onChange={(e) => setSettings(s=>({...s,chordVolume:parseInt(e.target.value)/100}))} />
              </div>
            </div>
          </div>

          {/* Drum Config */}
          <div className="control-section">
            <div className="control-header">
              <span className="control-header-dot" style={{background:"var(--red)"}} />
              <span className="control-header-title">Drum Config</span>
              <span className="control-header-meta">Pattern / Level / Toggle</span>
            </div>
            <div className="control-body">
              <div className="control-row">
                <span className="control-label">Drum Style</span>
                <select value={settings.drumStyle} onChange={(e) => setSettings(s=>({...s,drumStyle:e.target.value}))} className="ctrl-select">
                  <option value="basic">Basic</option>
                  <option value="basic1">Basic-1</option>
                  <option value="basic2">Basic-2</option>
                  <option value="basic3">Basic-3</option>
                  <option value="hiphop">Hip-Hop</option>
                  <option value="house">House</option>
                  <option value="trap">Trap</option>
                  <option value="dnb">DnB</option>
                  <option value="reggae">Reggae</option>
                  <option value="shuffle">Shuffle</option>
                  <option value="bossa">Bossa</option>
                  <option value="reggaeton">Reggaeton</option>
                  <option value="click">Click</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="control-row">
                <span className="control-label">Drum Vol {(settings.drumVolume*100).toFixed(0)}%</span>
                <input type="range" min="0" max="100" value={settings.drumVolume*100} onChange={(e) => setSettings(s=>({...s,drumVolume:parseInt(e.target.value)/100}))} />
              </div>
              <div className="control-row">
                <span className="control-label">Status</span>
                <button onClick={() => setSettings(s=>({...s,drumsEnabled:!s.drumsEnabled}))} className={`ctrl-toggle ${settings.drumsEnabled ? "active" : ""}`}>
                  DRUMS {settings.drumsEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Progressions */}
        {savedProgressions.length > 0 && (
          <div className={`mt-4 reveal-item ${revealed ? "revealed" : ""} reveal-delay-5`}>
            <div className="control-header" style={{borderBottom:"1px solid var(--border-thin)", background:"transparent", paddingLeft:0}}>
              <span className="control-header-dot" />
              <span className="control-header-title">Saved</span>
              <span className="control-header-meta">{savedProgressions.length} items</span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {savedProgressions.map((saved, i) => (
                <div key={i} className="saved-chip" onClick={() => loadProgression(saved)}>
                  <span>{saved.chords.map((c) => c.name).join(" ")}</span>
                  <span className="saved-chip-delete" onClick={(e) => { e.stopPropagation(); deleteSavedProgression(i) }}>
                    <X size={10} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className={`status-bar reveal-item ${revealed ? "revealed" : ""} reveal-delay-6`}>
          <div>
            <span className="status-prompt">&gt;</span> STATUS: {isPlaying ? "ACTIVE" : "STANDBY"} <span className="status-cursor">█</span>
          </div>
          <div className="flex gap-3">
            <span><span className="kbd">SPACE</span> Play</span>
            <span><span className="kbd">R</span> Gen</span>
            <span><span className="kbd">S</span> Save</span>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingChord && (
        <div className="dialog-backdrop" onClick={() => setEditingChord(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Edit Chord</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div>
                <label className="dialog-label">Root Note</label>
                <select className="dialog-select" value={editingChord.root} onChange={(e) => setEditingChord(p => p ? {...p, root:e.target.value} : null)}>
                  {NOTES.map(note => <option key={note} value={note}>{note}</option>)}
                </select>
              </div>
              <div>
                <label className="dialog-label">Chord Type</label>
                <select className="dialog-select" value={editingChord.type} onChange={(e) => setEditingChord(p => p ? {...p, type:e.target.value} : null)}>
                  {Object.keys(CHORD_TYPES).map(type => <option key={type} value={type}>{getChordTypeName(type)}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => editingChord && updateChord(editingChord.index, editingChord.root, editingChord.type)} className="dialog-btn">
              UPDATE CHORD
            </button>
          </div>
        </div>
      )}
    </>
  )
}
