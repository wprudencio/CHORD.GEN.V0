"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Pencil, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// Note frequencies (A4 = 440Hz)
const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63,
  "C#": 277.18,
  D: 293.66,
  "D#": 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  G: 392.0,
  "G#": 415.3,
  A: 440.0,
  "A#": 466.16,
  B: 493.88,
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

// Scale patterns (semitones from root)
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  // New modes
  hungarian: [0, 2, 3, 6, 7, 8, 11],
  japanese: [0, 1, 5, 7, 8],
  arabian: [0, 2, 4, 5, 6, 8, 10],
  persian: [0, 1, 4, 5, 6, 8, 11],
  bebop: [0, 2, 4, 5, 7, 9, 10, 11],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

// Chord types with intervals
const CHORD_TYPES: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  "7sus4": [0, 5, 7, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "6": [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  "11": [0, 4, 7, 10, 14, 17],
  min11: [0, 3, 7, 10, 14, 17],
  "13": [0, 4, 7, 10, 14, 21],
  "7#9": [0, 4, 7, 10, 15],
  "7b9": [0, 4, 7, 10, 13],
}

type ChordDegree = { deg: number; type: string }

const STYLE_PROGRESSIONS: Record<string, Record<string, ChordDegree[][]>> = {
  modern: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 5, type: "maj" }, { deg: 6, type: "min" }, { deg: 4, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 4, type: "add9" }, { deg: 6, type: "min7" }, { deg: 5, type: "sus4" }],
      [{ deg: 6, type: "min" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }, { deg: 5, type: "maj" }],
      [{ deg: 1, type: "maj7" }, { deg: 3, type: "min7" }, { deg: 4, type: "maj7" }, { deg: 5, type: "dom7" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 3, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 1, type: "min7" }, { deg: 4, type: "min7" }, { deg: 6, type: "maj7" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "maj" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }, { deg: 1, type: "min" }],
    ],
  },
  electronic: {
    major: [
      [{ deg: 1, type: "sus2" }, { deg: 4, type: "sus2" }, { deg: 5, type: "sus4" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 4, type: "maj" }],
      [{ deg: 6, type: "min7" }, { deg: 4, type: "add9" }, { deg: 1, type: "maj" }, { deg: 5, type: "7sus4" }],
      [{ deg: 1, type: "add9" }, { deg: 5, type: "sus4" }, { deg: 6, type: "min" }, { deg: 4, type: "add9" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 1, type: "madd9" }, { deg: 4, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "sus2" }],
      [{ deg: 1, type: "min7" }, { deg: 3, type: "maj" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "sus2" }, { deg: 6, type: "sus2" }, { deg: 4, type: "min" }],
    ],
  },
  ambient: {
    major: [
      [{ deg: 1, type: "maj9" }, { deg: 4, type: "maj7" }, { deg: 2, type: "min9" }, { deg: 5, type: "7sus4" }],
      [{ deg: 1, type: "add9" }, { deg: 6, type: "min9" }, { deg: 4, type: "maj9" }, { deg: 5, type: "sus4" }],
      [{ deg: 1, type: "maj7" }, { deg: 3, type: "min7" }, { deg: 6, type: "min9" }, { deg: 4, type: "maj9" }],
      [{ deg: 4, type: "maj9" }, { deg: 1, type: "maj7" }, { deg: 5, type: "sus4" }, { deg: 6, type: "min9" }],
    ],
    minor: [
      [{ deg: 1, type: "min9" }, { deg: 4, type: "min7" }, { deg: 6, type: "maj9" }, { deg: 3, type: "maj7" }],
      [{ deg: 1, type: "min7" }, { deg: 7, type: "maj7" }, { deg: 6, type: "maj9" }, { deg: 4, type: "min9" }],
      [{ deg: 6, type: "maj9" }, { deg: 3, type: "maj7" }, { deg: 7, type: "maj" }, { deg: 1, type: "min9" }],
      [{ deg: 1, type: "madd9" }, { deg: 6, type: "maj7" }, { deg: 7, type: "sus2" }, { deg: 4, type: "min7" }],
    ],
  },
  jazzy: {
    major: [
      [{ deg: 2, type: "min9" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj9" }, { deg: 6, type: "min7" }],
      [{ deg: 1, type: "maj9" }, { deg: 4, type: "maj7" }, { deg: 3, type: "min7" }, { deg: 6, type: "dom7" }],
      [{ deg: 1, type: "6" }, { deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj7" }],
      [{ deg: 3, type: "min7" }, { deg: 6, type: "dom7" }, { deg: 2, type: "min7" }, { deg: 5, type: "dom7" }],
    ],
    minor: [
      [{ deg: 1, type: "min9" }, { deg: 4, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min6" }],
      [{ deg: 2, type: "m7b5" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min9" }, { deg: 6, type: "maj7" }],
      [{ deg: 1, type: "min7" }, { deg: 7, type: "dom7" }, { deg: 3, type: "maj7" }, { deg: 6, type: "min7" }],
      [{ deg: 1, type: "min9" }, { deg: 4, type: "dom7" }, { deg: 7, type: "maj7" }, { deg: 3, type: "6" }],
    ],
  },
  lofi: {
    major: [
      [{ deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj7" }, { deg: 1, type: "maj7" }],
      [{ deg: 1, type: "maj7" }, { deg: 6, type: "min7" }, { deg: 2, type: "min7" }, { deg: 5, type: "7sus4" }],
      [{ deg: 4, type: "maj7" }, { deg: 3, type: "min7" }, { deg: 2, type: "min7" }, { deg: 1, type: "maj7" }],
      [{ deg: 1, type: "maj9" }, { deg: 4, type: "maj7" }, { deg: 6, type: "min9" }, { deg: 5, type: "dom7" }],
    ],
    minor: [
      [{ deg: 1, type: "min9" }, { deg: 4, type: "min7" }, { deg: 7, type: "maj7" }, { deg: 3, type: "maj7" }],
      [{ deg: 6, type: "maj7" }, { deg: 7, type: "maj7" }, { deg: 1, type: "min7" }, { deg: 4, type: "min7" }],
      [{ deg: 1, type: "min7" }, { deg: 6, type: "maj9" }, { deg: 3, type: "maj7" }, { deg: 7, type: "dom7" }],
      [{ deg: 2, type: "m7b5" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min9" }, { deg: 4, type: "min7" }],
    ],
  },
  cinematic: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 3, type: "min" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "sus2" }, { deg: 5, type: "sus4" }, { deg: 6, type: "min" }, { deg: 4, type: "add9" }],
      [{ deg: 6, type: "min" }, { deg: 3, type: "min" }, { deg: 4, type: "maj" }, { deg: 1, type: "sus2" }],
      [{ deg: 1, type: "add9" }, { deg: 6, type: "min" }, { deg: 4, type: "maj" }, { deg: 5, type: "sus4" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 3, type: "maj" }, { deg: 4, type: "min" }],
      [{ deg: 1, type: "madd9" }, { deg: 7, type: "maj" }, { deg: 6, type: "sus2" }, { deg: 6, type: "maj" }],
      [{ deg: 4, type: "min" }, { deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "sus2" }],
      [{ deg: 1, type: "min" }, { deg: 5, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }],
    ],
  },
  rnb: {
    major: [
      [{ deg: 1, type: "maj9" }, { deg: 4, type: "maj7" }, { deg: 2, type: "min9" }, { deg: 5, type: "13" }],
      [{ deg: 1, type: "maj7" }, { deg: 6, type: "min9" }, { deg: 4, type: "maj9" }, { deg: 5, type: "11" }],
      [{ deg: 2, type: "min11" }, { deg: 5, type: "13" }, { deg: 1, type: "maj9" }, { deg: 4, type: "maj7" }],
      [{ deg: 1, type: "6" }, { deg: 3, type: "min7" }, { deg: 6, type: "min9" }, { deg: 2, type: "min7" }],
    ],
    minor: [
      [{ deg: 1, type: "min9" }, { deg: 4, type: "min11" }, { deg: 7, type: "maj9" }, { deg: 3, type: "maj7" }],
      [{ deg: 6, type: "maj9" }, { deg: 7, type: "13" }, { deg: 1, type: "min9" }, { deg: 4, type: "min7" }],
      [{ deg: 1, type: "min9" }, { deg: 5, type: "dom7" }, { deg: 4, type: "min7" }, { deg: 6, type: "maj7" }],
      [{ deg: 2, type: "m7b5" }, { deg: 5, type: "13" }, { deg: 1, type: "min9" }, { deg: 6, type: "maj9" }],
    ],
  },
  gospel: {
    major: [
      [{ deg: 1, type: "maj7" }, { deg: 4, type: "maj9" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj9" }],
      [{ deg: 4, type: "maj7" }, { deg: 4, type: "min7" }, { deg: 1, type: "maj7" }, { deg: 1, type: "maj7" }],
      [{ deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 3, type: "min7" }, { deg: 6, type: "dom7" }],
      [{ deg: 1, type: "maj7" }, { deg: 3, type: "dom7" }, { deg: 6, type: "min9" }, { deg: 2, type: "min7" }],
    ],
    minor: [
      [{ deg: 1, type: "min9" }, { deg: 4, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min7" }],
      [{ deg: 6, type: "maj7" }, { deg: 7, type: "dom7" }, { deg: 1, type: "min9" }, { deg: 5, type: "dom7" }],
      [{ deg: 4, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min9" }, { deg: 6, type: "maj7" }],
      [{ deg: 2, type: "m7b5" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min7" }, { deg: 4, type: "min7" }],
    ],
  },
  funk: {
    major: [
      [{ deg: 1, type: "dom7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "dom7" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "dom7" }, { deg: 1, type: "dom7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "dom7" }],
      [{ deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "dom7" }, { deg: 1, type: "dom7" }],
      [{ deg: 1, type: "dom7" }, { deg: 3, type: "dom7" }, { deg: 4, type: "dom7" }, { deg: 5, type: "dom7" }],
    ],
    minor: [
      [{ deg: 1, type: "min7" }, { deg: 4, type: "min7" }, { deg: 1, type: "min7" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "min7" }, { deg: 1, type: "min7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "min7" }],
      [{ deg: 6, type: "dom7" }, { deg: 7, type: "dom7" }, { deg: 1, type: "min7" }, { deg: 1, type: "min7" }],
      [{ deg: 1, type: "min7" }, { deg: 3, type: "maj7" }, { deg: 4, type: "dom7" }, { deg: 5, type: "dom7" }],
    ],
  },
  indie: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 5, type: "maj" }, { deg: 6, type: "min" }, { deg: 4, type: "maj" }],
      [{ deg: 1, type: "add9" }, { deg: 4, type: "add9" }, { deg: 6, type: "madd9" }, { deg: 5, type: "sus4" }],
      [{ deg: 4, type: "maj" }, { deg: 1, type: "maj" }, { deg: 5, type: "maj" }, { deg: 6, type: "min" }],
      [{ deg: 1, type: "sus2" }, { deg: 3, type: "min" }, { deg: 4, type: "add9" }, { deg: 1, type: "maj" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 3, type: "maj" }, { deg: 7, type: "maj" }, { deg: 4, type: "min" }],
      [{ deg: 1, type: "madd9" }, { deg: 6, type: "sus2" }, { deg: 3, type: "add9" }, { deg: 7, type: "sus4" }],
      [{ deg: 6, type: "maj" }, { deg: 3, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 4, type: "min" }, { deg: 6, type: "add9" }, { deg: 7, type: "sus2" }],
    ],
  },
  bossa: {
    major: [
      [{ deg: 1, type: "maj9" }, { deg: 2, type: "min9" }, { deg: 3, type: "min7" }, { deg: 6, type: "dom7" }],
      [{ deg: 1, type: "maj7" }, { deg: 7, type: "dim7" }, { deg: 2, type: "min7" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "6" }, { deg: 4, type: "maj7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj9" }],
      [{ deg: 2, type: "min7" }, { deg: 5, type: "7#9" }, { deg: 1, type: "maj9" }, { deg: 4, type: "maj7" }],
    ],
    minor: [
      [{ deg: 1, type: "min9" }, { deg: 4, type: "min7" }, { deg: 7, type: "dom7" }, { deg: 3, type: "maj7" }],
      [{ deg: 2, type: "m7b5" }, { deg: 5, type: "7b9" }, { deg: 1, type: "min9" }, { deg: 6, type: "maj7" }],
      [{ deg: 1, type: "min7" }, { deg: 6, type: "maj9" }, { deg: 2, type: "m7b5" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "min6" }, { deg: 4, type: "min9" }, { deg: 7, type: "maj7" }, { deg: 3, type: "6" }],
    ],
  },
  reggaeton: {
    major: [
      [{ deg: 6, type: "min" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }, { deg: 5, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 6, type: "min" }, { deg: 4, type: "maj" }, { deg: 5, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 6, type: "min" }, { deg: 5, type: "maj" }],
      [{ deg: 6, type: "min" }, { deg: 5, type: "maj" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 3, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "maj" }, { deg: 6, type: "maj" }, { deg: 3, type: "maj" }],
      [{ deg: 1, type: "min" }, { deg: 4, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }, { deg: 1, type: "min" }],
    ],
  },
  country: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }, { deg: 5, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 5, type: "maj" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 6, type: "min" }, { deg: 4, type: "maj" }, { deg: 5, type: "maj" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 4, type: "min" }, { deg: 1, type: "min" }, { deg: 5, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }, { deg: 5, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 4, type: "min" }, { deg: 6, type: "maj" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }],
    ],
  },
  metal: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 7, type: "maj" }, { deg: 6, type: "min" }, { deg: 5, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 5, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 6, type: "min" }, { deg: 7, type: "maj" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 3, type: "min" }, { deg: 7, type: "maj" }, { deg: 4, type: "maj" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 4, type: "min" }, { deg: 5, type: "min" }, { deg: 1, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "maj" }, { deg: 6, type: "maj" }, { deg: 5, type: "maj" }],
      [{ deg: 1, type: "min" }, { deg: 2, type: "dim" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }],
    ],
  },
  classical: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 5, type: "maj" }, { deg: 6, type: "min" }, { deg: 3, type: "min" }],
      [{ deg: 1, type: "maj" }, { deg: 6, type: "min" }, { deg: 2, type: "min" }, { deg: 5, type: "dom7" }],
      [{ deg: 4, type: "maj" }, { deg: 5, type: "dom7" }, { deg: 3, type: "min" }, { deg: 6, type: "min" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 4, type: "min" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "maj" }, { deg: 3, type: "maj" }, { deg: 5, type: "dom7" }],
      [{ deg: 6, type: "maj" }, { deg: 3, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 5, type: "dom7" }, { deg: 6, type: "maj" }, { deg: 5, type: "dom7" }],
    ],
  },
  disco: {
    major: [
      [{ deg: 1, type: "maj7" }, { deg: 2, type: "min7" }, { deg: 3, type: "min7" }, { deg: 4, type: "maj7" }],
      [{ deg: 6, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 4, type: "maj7" }, { deg: 1, type: "maj7" }],
      [{ deg: 1, type: "maj" }, { deg: 4, type: "maj" }, { deg: 5, type: "dom7" }, { deg: 4, type: "maj" }],
      [{ deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj7" }, { deg: 6, type: "min7" }],
    ],
    minor: [
      [{ deg: 1, type: "min7" }, { deg: 4, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min7" }],
      [{ deg: 6, type: "maj7" }, { deg: 7, type: "dom7" }, { deg: 1, type: "min7" }, { deg: 4, type: "min7" }],
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }],
      [{ deg: 1, type: "min7" }, { deg: 7, type: "maj7" }, { deg: 6, type: "maj7" }, { deg: 5, type: "dom7" }],
    ],
  },
  // New styles
  synthwave: {
    major: [
      [{ deg: 1, type: "maj7" }, { deg: 5, type: "sus4" }, { deg: 6, type: "min7" }, { deg: 4, type: "maj7" }],
      [{ deg: 1, type: "add9" }, { deg: 4, type: "add9" }, { deg: 5, type: "sus2" }, { deg: 6, type: "min" }],
      [{ deg: 6, type: "min" }, { deg: 5, type: "maj" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }],
      [{ deg: 1, type: "maj" }, { deg: 3, type: "min" }, { deg: 4, type: "maj" }, { deg: 5, type: "sus4" }],
    ],
    minor: [
      [{ deg: 1, type: "min7" }, { deg: 4, type: "min" }, { deg: 7, type: "maj" }, { deg: 6, type: "maj" }],
      [{ deg: 1, type: "madd9" }, { deg: 6, type: "maj" }, { deg: 7, type: "add9" }, { deg: 4, type: "min" }],
      [{ deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 1, type: "min" }, { deg: 5, type: "sus4" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "sus2" }, { deg: 6, type: "maj" }, { deg: 3, type: "maj" }],
    ],
  },
  edm: {
    major: [
      [{ deg: 1, type: "maj" }, { deg: 5, type: "maj" }, { deg: 6, type: "min" }, { deg: 4, type: "maj" }],
      [{ deg: 1, type: "sus2" }, { deg: 5, type: "sus4" }, { deg: 6, type: "min" }, { deg: 4, type: "sus2" }],
      [{ deg: 6, type: "min" }, { deg: 4, type: "maj" }, { deg: 1, type: "maj" }, { deg: 5, type: "sus4" }],
      [{ deg: 1, type: "add9" }, { deg: 4, type: "add9" }, { deg: 6, type: "min" }, { deg: 5, type: "sus4" }],
    ],
    minor: [
      [{ deg: 1, type: "min" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }, { deg: 4, type: "min" }],
      [{ deg: 1, type: "min" }, { deg: 7, type: "maj" }, { deg: 6, type: "maj" }, { deg: 7, type: "maj" }],
      [{ deg: 6, type: "maj" }, { deg: 7, type: "sus2" }, { deg: 1, type: "min" }, { deg: 4, type: "min" }],
      [{ deg: 1, type: "madd9" }, { deg: 4, type: "min" }, { deg: 6, type: "sus2" }, { deg: 7, type: "maj" }],
    ],
  },
  latin: {
    major: [
      [{ deg: 1, type: "maj7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "maj7" }, { deg: 5, type: "dom7" }],
      [{ deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj7" }, { deg: 6, type: "dom7" }],
      [{ deg: 1, type: "maj7" }, { deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "6" }],
      [{ deg: 1, type: "6" }, { deg: 4, type: "maj7" }, { deg: 2, type: "min7" }, { deg: 5, type: "dom7" }],
    ],
    minor: [
      [{ deg: 1, type: "min7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "min7" }, { deg: 5, type: "dom7" }],
      [{ deg: 2, type: "m7b5" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min9" }, { deg: 1, type: "min7" }],
      [{ deg: 1, type: "min7" }, { deg: 4, type: "min7" }, { deg: 7, type: "dom7" }, { deg: 3, type: "maj7" }],
      [{ deg: 1, type: "min6" }, { deg: 4, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min7" }],
    ],
  },
  afrobeat: {
    major: [
      [{ deg: 1, type: "dom7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "dom7" }, { deg: 4, type: "dom7" }],
      [{ deg: 1, type: "maj7" }, { deg: 5, type: "dom7" }, { deg: 4, type: "maj7" }, { deg: 1, type: "maj7" }],
      [{ deg: 1, type: "dom7" }, { deg: 1, type: "dom7" }, { deg: 4, type: "dom7" }, { deg: 5, type: "dom7" }],
      [{ deg: 2, type: "min7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "maj7" }, { deg: 4, type: "dom7" }],
    ],
    minor: [
      [{ deg: 1, type: "min7" }, { deg: 4, type: "dom7" }, { deg: 1, type: "min7" }, { deg: 4, type: "dom7" }],
      [{ deg: 1, type: "min7" }, { deg: 7, type: "dom7" }, { deg: 6, type: "maj7" }, { deg: 5, type: "dom7" }],
      [{ deg: 1, type: "min7" }, { deg: 1, type: "min7" }, { deg: 4, type: "min7" }, { deg: 5, type: "dom7" }],
      [{ deg: 6, type: "maj7" }, { deg: 5, type: "dom7" }, { deg: 1, type: "min7" }, { deg: 4, type: "min7" }],
    ],
  },
}

// Drum patterns by style
const DRUM_STYLE_PATTERNS: Record<string, Record<string, Record<string, number[]>>> = {
  basic: {
    "4": {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  basic1: {
    "4": {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  basic2: {
    "4": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  basic3: {
    "4": {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      openHat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      openHat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      openHat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    },
  },
  hiphop: {
    "4": {
      kick: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  house: {
    "4": {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    },
    "3": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      openHat: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      openHat: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    },
  },
  trap: {
    "4": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  dnb: {
    "4": {
      kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  reggae: {
    "4": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    },
    "3": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      openHat: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    },
    "6": {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      openHat: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    },
  },
  shuffle: {
    "4": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  bossa: {
    "4": {
      kick: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  reggaeton: {
    "4": {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      snare: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  click: {
    "4": {
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  none: {
    "4": {
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "3": {
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    "6": {
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
}

// Synth rhythm patterns - expanded with arpeggios that work properly
const SYNTH_RHYTHMS: Record<string, { pattern: number[]; name: string; isArp?: boolean; arpDirection?: string }> = {
  sustained: { pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], name: "Sustained" },
  pulse: { pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], name: "Pulse" },
  offbeat: { pattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], name: "Offbeat" },
  staccato: { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Staccato" },
  syncopated: { pattern: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0], name: "Syncopated" },
  triplet: { pattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0], name: "Triplet" },
  dotted: { pattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0], name: "Dotted" },
  driving: { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0], name: "Driving" },
  sparse: { pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], name: "Sparse" },
  // Arpeggio patterns - these trigger individual notes of the chord
  arpUp: { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp Up", isArp: true, arpDirection: "up" },
  arpDown: { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp Down", isArp: true, arpDirection: "down" },
  arpUpDown: { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp U/D", isArp: true, arpDirection: "updown" },
  arpRandom: { pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], name: "Arp Rand", isArp: true, arpDirection: "random" },
}

type Chord = {
  root: string
  type: string
  name: string
  frequencies: number[]
}

type Settings = {
  bpm: number
  timeSignature: number
  barsPerChord: number
  drumsEnabled: boolean
  drumStyle: string
  chordVolume: number
  drumVolume: number
  reverbAmount: number
  synthType: string
  synthRhythm: string
}

const DEFAULT_SETTINGS: Settings = {
  bpm: 90,
  timeSignature: 4,
  barsPerChord: 2,
  drumsEnabled: true,
  drumStyle: "basic",
  chordVolume: 0.7,
  drumVolume: 0.6,
  reverbAmount: 0.4,
  synthType: "pad",
  synthRhythm: "sustained",
}

function formatChordType(type: string): string {
  const formats: Record<string, string> = {
    maj: "",
    min: "m",
    maj7: "maj7",
    min7: "m7",
    dom7: "7",
    "7sus4": "7sus4",
    add9: "add9",
    madd9: "madd9",
    maj9: "maj9",
    min9: "m9",
    sus2: "sus2",
    sus4: "sus4",
    "6": "6",
    min6: "m6",
    dim: "dim",
    dim7: "dim7",
    m7b5: "m7b5",
    aug: "aug",
    "11": "11",
    min11: "m11",
    "13": "13",
    "7#9": "7#9",
    "7b9": "7b9",
  }
  return formats[type] || type
}

function getChordTypeName(type: string): string {
  const names: Record<string, string> = {
    maj: "Major",
    min: "Minor",
    maj7: "Major 7",
    min7: "Minor 7",
    dom7: "Dominant 7",
    "7sus4": "Dom 7sus4",
    add9: "Add 9",
    madd9: "Minor add9",
    maj9: "Major 9",
    min9: "Minor 9",
    sus2: "Sus 2",
    sus4: "Sus 4",
    "6": "Major 6",
    min6: "Minor 6",
    dim: "Diminished",
    dim7: "Dim 7",
    m7b5: "Half-dim",
    aug: "Augmented",
    "11": "Dominant 11",
    min11: "Minor 11",
    "13": "Dominant 13",
    "7#9": "7 Sharp 9",
    "7b9": "7 Flat 9",
  }
  return names[type] || type
}

function getScaleNotes(rootNote: string, mode: string): string[] {
  const rootIndex = NOTES.indexOf(rootNote)
  const scale = SCALES[mode] || SCALES.major
  return scale.map((interval) => NOTES[(rootIndex + interval) % 12])
}

function getChordNotes(rootNote: string, chordType: string, octave: number = 3): number[] {
  const rootIndex = NOTES.indexOf(rootNote)
  const intervals = CHORD_TYPES[chordType] || CHORD_TYPES.maj

  return intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12
    const noteOctave = octave + Math.floor((rootIndex + interval) / 12)
    const note = NOTES[noteIndex]
    const freq = NOTE_FREQUENCIES[note] * Math.pow(2, noteOctave - 4)
    return freq
  })
}

export default function ChordGenerator() {
  const [key, setKey] = useState("C")
  const [mode, setMode] = useState("major")
  const [style, setStyle] = useState("modern")
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const [bpmInput, setBpmInput] = useState(settings.bpm.toString())

  // Keep bpmInput in sync when settings.bpm changes
  useEffect(() => {
    setBpmInput(settings.bpm.toString())
  }, [settings.bpm])

  const [progression, setProgression] = useState<Chord[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeChordIndex, setActiveChordIndex] = useState(-1)
  const [savedProgressions, setSavedProgressions] = useState<{ name: string; key: string; mode: string; chords: Chord[] }[]>([])
  const [editingChord, setEditingChord] = useState<{index: number, root: string, type: string} | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load everything from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("chord-gen-config")
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.key) setKey(config.key)
        if (config.mode) setMode(config.mode)
        if (config.style) setStyle(config.style)
        if (config.settings) setSettings(config.settings)
        if (config.progression) {
          setProgression(config.progression)
          progressionRef.current = config.progression
        }
        if (config.savedProgressions) setSavedProgressions(config.savedProgressions)
      } catch (e) {
        console.error("Failed to load config", e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save everything to local storage when state changes
  useEffect(() => {
    if (!isLoaded) return
    const config = {
      key,
      mode,
      style,
      settings,
      progression,
      savedProgressions
    }
    localStorage.setItem("chord-gen-config", JSON.stringify(config))
  }, [key, mode, style, settings, progression, savedProgressions, isLoaded])

  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const reverbNodeRef = useRef<ConvolverNode | null>(null)
  const isPlayingRef = useRef(false)
  const currentChordIndexRef = useRef(0)
  const currentBeatRef = useRef(0)
  const nextNoteTimeRef = useRef(0)
  const schedulerTimerRef = useRef<number | null>(null)
  const progressionRef = useRef<Chord[]>([])
  const settingsRef = useRef(settings)
  const activeNodesRef = useRef<Array<OscillatorNode | AudioBufferSourceNode>>([])
  const arpNoteIndexRef = useRef(0)
  const arpDirectionRef = useRef(1)

  // Keep refs in sync
  useEffect(() => {
    progressionRef.current = progression
  }, [progression])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const createReverb = useCallback(() => {
    if (!audioCtxRef.current) return null
    const convolver = audioCtxRef.current.createConvolver()
    const rate = audioCtxRef.current.sampleRate
    const length = rate * 3
    const decay = 3
    const impulse = audioCtxRef.current.createBuffer(2, length, rate)

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        // Early reflections: first 30ms are denser
        const earlyRefl = i < rate * 0.03
        const density = earlyRefl ? 0.8 : 0.4
        const reflDecay = earlyRefl ? 0.6 : Math.pow(1 - i / length, decay)
        channelData[i] = (Math.random() * 2 - 1) * reflDecay * density * (1 + (channel === 0 ? 0.1 : -0.1))
      }
    }

    convolver.buffer = impulse
    return convolver
  }, [])

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return

    audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    // Master gain
    masterGainRef.current = audioCtxRef.current.createGain()
    masterGainRef.current.gain.value = 0.75

    // Master compressor — glue the mix together
    const compressor = audioCtxRef.current.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 6
    compressor.ratio.value = 3
    compressor.attack.value = 0.003
    compressor.release.value = 0.25

    // Limiter via a gain node that acts as soft-clipper
    const limiter = audioCtxRef.current.createGain()
    limiter.gain.value = 1.0

    // Reverb
    reverbNodeRef.current = createReverb()
    if (reverbNodeRef.current) {
      reverbNodeRef.current.connect(compressor)
    }

    masterGainRef.current.connect(compressor)
    compressor.connect(limiter)
    limiter.connect(audioCtxRef.current.destination)

    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume()
    }
  }, [createReverb])

  const stopAllNodes = useCallback(() => {
    const nodes = activeNodesRef.current
    activeNodesRef.current = [] // Clear immediately to prevent stale refs
    nodes.forEach((node) => {
      try {
        node.stop()
        node.disconnect()
      } catch {
        // Node might already be stopped
      }
    })
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

    switch (synthType) {
      case "pad": {
        // 3 sawtooth + 1 triangle, wider detune, brighter filter
        const oscs = []
        const detuneAmounts = [-0.03, 0, 0.03, 1.002]
        const types = ["sawtooth", "sawtooth", "sawtooth", "triangle"]
        for (let i = 0; i < 4; i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = types[i] as OscillatorType
          osc.frequency.value = freq * detuneAmounts[i]
          oscs.push(osc)
        }

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(4000, time)
        filter.frequency.linearRampToValueAtTime(800, time + duration * 0.5)
        filter.Q.value = 1.5

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.2, time + 0.15)
        gain.gain.setValueAtTime(vol * 0.18, time + duration - 0.15)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        oscs.forEach((osc) => osc.connect(filter))
        filter.connect(gain)
        applyReverb(gain)

        oscs.forEach((osc) => {
          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })
        break
      }
      case "pluck": {
        // 2 oscillators + noise burst for attack, filter sweep
        const osc = audioCtxRef.current.createOscillator()
        const osc2 = audioCtxRef.current.createOscillator()
        osc.type = "triangle"
        osc2.type = "sine"
        osc.frequency.value = freq
        osc2.frequency.value = freq * 2.01

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(5000, time)
        filter.frequency.exponentialRampToValueAtTime(400, time + 0.3)
        filter.Q.value = 3

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(vol * 0.4, time)
        gain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration, 1.8))

        osc.connect(filter)
        osc2.connect(filter)
        filter.connect(gain)
        applyReverb(gain)

        activeNodesRef.current.push(...[osc, osc2].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
        osc.start(time)
        osc2.start(time)
        osc.stop(time + duration)
        osc2.stop(time + duration)
        break
      }
      case "keys": {
        // Electric piano style: sine + triangle with hammer noise and chorus
        const osc1 = audioCtxRef.current.createOscillator()
        const osc2 = audioCtxRef.current.createOscillator()
        const osc3 = audioCtxRef.current.createOscillator()
        osc1.type = "sine"
        osc2.type = "triangle"
        osc3.type = "sine"
        osc1.frequency.value = freq
        osc2.frequency.value = freq * 2.001
        osc3.frequency.value = freq * 3.005

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 4000

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(vol * 0.25, time)
        gain.gain.setValueAtTime(vol * 0.18, time + 0.05)
        gain.gain.linearRampToValueAtTime(0, time + duration - 0.05)

        osc1.connect(filter)
        osc2.connect(filter)
        osc3.connect(filter)
        filter.connect(gain)
        applyReverb(gain)

        activeNodesRef.current.push(...[osc1, osc2, osc3].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
        osc1.start(time)
        osc2.start(time)
        osc3.start(time)
        osc1.stop(time + duration)
        osc2.stop(time + duration)
        osc3.stop(time + duration)
        break
      }
      case "strings": {
        // 4 sawtooth with wider detune + subtle chorus via modulation
        const oscs = []
        for (let i = 0; i < 4; i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i - 1.5) * 0.004)
          oscs.push(osc)
        }

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 3000
        filter.Q.value = 0.5

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.15, time + 0.2)
        gain.gain.setValueAtTime(vol * 0.13, time + duration - 0.15)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        oscs.forEach((osc) => osc.connect(filter))
        filter.connect(gain)
        applyReverb(gain)

        oscs.forEach((osc) => {
          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })
        break
      }
      case "organ": {
        // Tonewheel organ: sine harmonics + rotating speaker simulation + key click
        const harmonics = [1, 2, 3, 4, 5, 6]
        const harmonicGains = [1, 0.6, 0.3, 0.2, 0.1, 0.05]

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 5000

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.15, time + 0.005)
        gain.gain.setValueAtTime(vol * 0.15, time + duration - 0.1)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        harmonics.forEach((harmonic, i) => {
          const osc = audioCtxRef.current!.createOscillator()
          osc.type = "sine"
          osc.frequency.value = freq * harmonic
          const hGain = audioCtxRef.current!.createGain()
          hGain.gain.value = harmonicGains[i]
          osc.connect(hGain)
          hGain.connect(filter)
          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })

        filter.connect(gain)
        applyReverb(gain)
        break
      }
      case "bell": {
        // Inharmonic partials with more body
        const partials = [1, 2.4, 3, 4.6, 5.4, 6.8]
        const gains = [1, 0.7, 0.5, 0.3, 0.2, 0.1]

        partials.forEach((partial, i) => {
          const osc = audioCtxRef.current!.createOscillator()
          const g = audioCtxRef.current!.createGain()

          osc.type = "sine"
          osc.frequency.value = freq * partial

          g.gain.setValueAtTime(vol * 0.18 * gains[i], time)
          g.gain.exponentialRampToValueAtTime(0.001, time + duration * (1 - i * 0.12))

          osc.connect(g)
          applyReverb(g)

          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })
        break
      }
      case "bass": {
        // Sub + punch + distortion character
        const sub = audioCtxRef.current.createOscillator()
        const punch = audioCtxRef.current.createOscillator()
        sub.type = "sine"
        punch.type = "square"
        sub.frequency.value = freq / 2
        punch.frequency.value = freq / 2

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(600, time)
        filter.frequency.linearRampToValueAtTime(200, time + 0.15)
        filter.Q.value = 3

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(vol * 0.35, time)
        gain.gain.setValueAtTime(vol * 0.25, time + 0.05)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        sub.connect(filter)
        punch.connect(filter)
        filter.connect(gain)

        // Slight overdrive via waveshaper
        const shaper = audioCtxRef.current.createWaveShaper()
        const curve = new Float32Array(256)
        for (let i = 0; i < 256; i++) {
          const x = (i - 128) / 128
          curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5)
        }
        shaper.curve = curve

        gain.connect(shaper)
        applyReverb(shaper)

        activeNodesRef.current.push(...[sub, punch].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
        sub.start(time)
        punch.start(time)
        sub.stop(time + duration)
        punch.stop(time + duration)
        break
      }
      case "lead": {
        // 3-osc unison lead with wider filter sweep
        const oscs = []
        for (let i = 0; i < 3; i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i - 1) * 0.008)
          oscs.push(osc)
        }

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(5000, time)
        filter.frequency.linearRampToValueAtTime(500, time + duration * 0.7)
        filter.Q.value = 5

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.25, time + 0.02)
        gain.gain.setValueAtTime(vol * 0.2, time + 0.08)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        oscs.forEach((osc) => osc.connect(filter))
        filter.connect(gain)
        applyReverb(gain)

        oscs.forEach((osc) => {
          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })
        break
      }
      case "brass": {
        // 3-osc sawstack with brass-like envelope
        const oscs = []
        for (let i = 0; i < 3; i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i - 1) * 0.005)
          oscs.push(osc)
        }

        const filter = audioCtxRef.current.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.setValueAtTime(300, time)
        filter.frequency.linearRampToValueAtTime(3000, time + 0.08)
        filter.frequency.linearRampToValueAtTime(1500, time + duration)
        filter.Q.value = 1.5

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.18, time + 0.05)
        gain.gain.setValueAtTime(vol * 0.15, time + 0.15)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        oscs.forEach((osc) => osc.connect(filter))
        filter.connect(gain)
        applyReverb(gain)

        oscs.forEach((osc) => {
          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })
        break
      }
      case "fm": {
        // 2-op FM with feedback, more complex harmonics
        const carrier = audioCtxRef.current.createOscillator()
        const modulator = audioCtxRef.current.createOscillator()
        const modGain = audioCtxRef.current.createGain()
        const gain = audioCtxRef.current.createGain()
        const filter = audioCtxRef.current.createBiquadFilter()

        carrier.type = "sine"
        modulator.type = "sine"
        carrier.frequency.value = freq
        modulator.frequency.value = freq * 3

        // FM depth with envelope
        modGain.gain.setValueAtTime(freq * 0.5, time)
        modGain.gain.linearRampToValueAtTime(freq * 0.05, time + duration * 0.5)
        modulator.connect(modGain)
        modGain.connect(carrier.frequency)

        filter.type = "lowpass"
        filter.frequency.value = 6000

        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.25, time + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration)

        carrier.connect(filter)
        filter.connect(gain)
        applyReverb(gain)

        activeNodesRef.current.push(...[carrier, modulator].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
        carrier.start(time)
        modulator.start(time)
        carrier.stop(time + duration)
        modulator.stop(time + duration)
        break
      }
      case "supersaw": {
        // 9 sawtooth oscillators, wider spread, higher volume, better filter
        const oscs: OscillatorNode[] = []
        const filter = audioCtxRef.current.createBiquadFilter()

        for (let i = 0; i < 9; i++) {
          const osc = audioCtxRef.current.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = freq * (1 + (i - 4) * 0.008)
          osc.connect(filter)
          oscs.push(osc)
        }

        filter.type = "lowpass"
        filter.frequency.setValueAtTime(5000, time)
        filter.frequency.linearRampToValueAtTime(2000, time + duration * 0.5)
        filter.Q.value = 1.5

        const gain = audioCtxRef.current.createGain()
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(vol * 0.12, time + 0.05)
        gain.gain.setValueAtTime(vol * 0.12, time + duration - 0.1)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        filter.connect(gain)
        applyReverb(gain)

        oscs.forEach((osc) => {
          activeNodesRef.current.push(...[osc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
          osc.start(time)
          osc.stop(time + duration)
        })
        break
      }
      case "wobble": {
        // Dual LFO on filter + volume for classic wobble
        const osc = audioCtxRef.current.createOscillator()
        const osc2 = audioCtxRef.current.createOscillator()
        const lfo = audioCtxRef.current.createOscillator()
        const lfoGain = audioCtxRef.current.createGain()
        const gain = audioCtxRef.current.createGain()
        const filter = audioCtxRef.current.createBiquadFilter()
        const filter2 = audioCtxRef.current.createBiquadFilter()

        osc.type = "sawtooth"
        osc2.type = "square"
        osc.frequency.value = freq
        osc2.frequency.value = freq * 1.005

        // Tempo-synced wobble rate
        const bpm = settingsRef.current.bpm
        const wobbleRate = (bpm / 60) * 2
        lfo.type = "sine"
        lfo.frequency.value = wobbleRate
        lfoGain.gain.value = 2000

        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)

        filter.type = "lowpass"
        filter.frequency.value = 2000
        filter.Q.value = 8

        filter2.type = "highpass"
        filter2.frequency.value = 200

        gain.gain.setValueAtTime(vol * 0.25, time)
        gain.gain.setValueAtTime(vol * 0.25, time + duration - 0.1)
        gain.gain.linearRampToValueAtTime(0, time + duration)

        osc.connect(filter)
        osc2.connect(filter)
        filter.connect(filter2)
        filter2.connect(gain)
        applyReverb(gain)

        activeNodesRef.current.push(...[osc, osc2, lfo].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
        osc.start(time)
        osc2.start(time)
        lfo.start(time)
        osc.stop(time + duration)
        osc2.stop(time + duration)
        lfo.stop(time + duration)
        break
      }
    }
  }, [])

  const playChord = useCallback(
    (frequencies: number[], time: number, duration: number) => {
      const synthType = settingsRef.current.synthType
      frequencies.forEach((freq) => {
        playSingleNote(freq, time, duration, synthType)
      })
    },
    [playSingleNote]
  )

  const playArpNote = useCallback(
    (frequencies: number[], time: number, duration: number, direction: string) => {
      if (frequencies.length === 0) return

      let noteIndex: number

      switch (direction) {
        case "up":
          noteIndex = arpNoteIndexRef.current % frequencies.length
          arpNoteIndexRef.current++
          break
        case "down":
          noteIndex = (frequencies.length - 1) - (arpNoteIndexRef.current % frequencies.length)
          arpNoteIndexRef.current++
          break
        case "updown":
          const totalCycle = frequencies.length * 2 - 2
          const pos = arpNoteIndexRef.current % totalCycle
          if (pos < frequencies.length) {
            noteIndex = pos
          } else {
            noteIndex = totalCycle - pos
          }
          arpNoteIndexRef.current++
          break
        case "random":
          noteIndex = Math.floor(Math.random() * frequencies.length)
          break
        default:
          noteIndex = 0
      }

      const freq = frequencies[noteIndex]
      playSingleNote(freq, time, duration, settingsRef.current.synthType)
    },
    [playSingleNote]
  )

  const playKick = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return

    const vol = settingsRef.current.drumVolume * 1.0

    // Layer 1: Drum head attack — noise burst shaped like a beater hit
    const attackLen = audioCtxRef.current.sampleRate * 0.03
    const attackBuffer = audioCtxRef.current.createBuffer(1, attackLen, audioCtxRef.current.sampleRate)
    const attackData = attackBuffer.getChannelData(0)
    for (let i = 0; i < attackLen; i++) {
      attackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / attackLen, 6)
    }
    const attackSource = audioCtxRef.current.createBufferSource()
    attackSource.buffer = attackBuffer
    const attackFilter = audioCtxRef.current.createBiquadFilter()
    attackFilter.type = "bandpass"
    attackFilter.frequency.value = 500
    attackFilter.Q.value = 2.0
    const attackGain = audioCtxRef.current.createGain()
    attackGain.gain.setValueAtTime(vol * 0.5, time)
    attackGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03)
    attackSource.connect(attackFilter)
    attackFilter.connect(attackGain)

    // Layer 2: Drum body — low sine with boxy resonance
    const bodyOsc = audioCtxRef.current.createOscillator()
    const bodyGain = audioCtxRef.current.createGain()
    bodyOsc.type = "sine"
    bodyOsc.frequency.setValueAtTime(120, time)
    bodyOsc.frequency.exponentialRampToValueAtTime(45, time + 0.15)
    bodyGain.gain.setValueAtTime(vol * 0.8, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35)
    bodyOsc.connect(bodyGain)

    // Layer 3: Low boom — sub rumble
    const boomOsc = audioCtxRef.current.createOscillator()
    const boomGain = audioCtxRef.current.createGain()
    boomOsc.type = "sine"
    boomOsc.frequency.setValueAtTime(60, time)
    boomOsc.frequency.exponentialRampToValueAtTime(25, time + 0.25)
    boomGain.gain.setValueAtTime(vol * 0.6, time)
    boomGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5)
    boomOsc.connect(boomGain)

    // Sum layers
    const sumGain = audioCtxRef.current.createGain()
    attackGain.connect(sumGain)
    bodyGain.connect(sumGain)
    boomGain.connect(sumGain)

    // Gentle lowpass to keep it warm
    const filter = audioCtxRef.current.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 400

    sumGain.connect(filter)

    const dryGain = audioCtxRef.current.createGain()
    const wetGain = audioCtxRef.current.createGain()
    const reverbAmount = settingsRef.current.reverbAmount * 0.2

    dryGain.gain.value = 1 - reverbAmount
    wetGain.gain.value = reverbAmount

    filter.connect(dryGain)
    filter.connect(wetGain)
    dryGain.connect(masterGainRef.current)
    wetGain.connect(reverbNodeRef.current)

    activeNodesRef.current.push(...[attackSource, bodyOsc, boomOsc].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
    attackSource.start(time)
    bodyOsc.start(time)
    boomOsc.start(time)
    attackSource.stop(time + 0.04)
    bodyOsc.stop(time + 0.4)
    boomOsc.stop(time + 0.55)
  }, [])

  const playSnare = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return

    const vol = settingsRef.current.drumVolume * 0.9

    // Layer 1: Stick attack — sharp transient
    const attackLen = audioCtxRef.current.sampleRate * 0.005
    const attackBuffer = audioCtxRef.current.createBuffer(1, attackLen, audioCtxRef.current.sampleRate)
    const attackData = attackBuffer.getChannelData(0)
    for (let i = 0; i < attackLen; i++) {
      attackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / attackLen, 8)
    }
    const attackSource = audioCtxRef.current.createBufferSource()
    attackSource.buffer = attackBuffer
    const attackGain = audioCtxRef.current.createGain()
    attackGain.gain.setValueAtTime(vol * 0.4, time)
    attackGain.gain.exponentialRampToValueAtTime(0.001, time + 0.006)
    attackSource.connect(attackGain)

    // Layer 2: Snare wires — bandpass noise with rattle
    const wireLen = audioCtxRef.current.sampleRate * 0.12
    const wireBuffer = audioCtxRef.current.createBuffer(1, wireLen, audioCtxRef.current.sampleRate)
    const wireData = wireBuffer.getChannelData(0)
    for (let i = 0; i < wireLen; i++) {
      wireData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wireLen, 3)
    }
    const wireSource = audioCtxRef.current.createBufferSource()
    wireSource.buffer = wireBuffer
    const wireFilter = audioCtxRef.current.createBiquadFilter()
    wireFilter.type = "highpass"
    wireFilter.frequency.value = 2000
    const wireGain = audioCtxRef.current.createGain()
    wireGain.gain.setValueAtTime(vol * 0.5, time)
    wireGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    wireSource.connect(wireFilter)
    wireFilter.connect(wireGain)

    // Layer 3: Drum body noise — low-mid warmth from the shell
    const bodyLen = audioCtxRef.current.sampleRate * 0.2
    const bodyBuffer = audioCtxRef.current.createBuffer(1, bodyLen, audioCtxRef.current.sampleRate)
    const bodyData = bodyBuffer.getChannelData(0)
    for (let i = 0; i < bodyLen; i++) {
      bodyData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bodyLen, 1.5)
    }
    const bodySource = audioCtxRef.current.createBufferSource()
    bodySource.buffer = bodyBuffer
    const bodyFilter = audioCtxRef.current.createBiquadFilter()
    bodyFilter.type = "lowpass"
    bodyFilter.frequency.value = 1000
    const bodyGain = audioCtxRef.current.createGain()
    bodyGain.gain.setValueAtTime(vol * 0.6, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
    bodySource.connect(bodyFilter)
    bodyFilter.connect(bodyGain)

    // Sum layers
    const sumGain = audioCtxRef.current.createGain()
    attackGain.connect(sumGain)
    wireGain.connect(sumGain)
    bodyGain.connect(sumGain)

    const dryGain = audioCtxRef.current.createGain()
    const wetGain = audioCtxRef.current.createGain()
    const reverbAmount = settingsRef.current.reverbAmount * 0.35

    dryGain.gain.value = 1 - reverbAmount
    wetGain.gain.value = reverbAmount

    sumGain.connect(dryGain)
    sumGain.connect(wetGain)
    dryGain.connect(masterGainRef.current)
    wetGain.connect(reverbNodeRef.current)

    activeNodesRef.current.push(...[attackSource, wireSource, bodySource].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
    attackSource.start(time)
    wireSource.start(time)
    bodySource.start(time)
    attackSource.stop(time + 0.008)
    wireSource.stop(time + 0.14)
    bodySource.stop(time + 0.22)
  }, [])

  const playHiHat = useCallback((time: number, open: boolean = false) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return

    const vol = settingsRef.current.drumVolume * (open ? 0.3 : 0.35)
    const hiLen = open ? 0.35 : 0.05

    // Layer 1: Cymbal wash — dense noise with slow decay
    const washLen = audioCtxRef.current.sampleRate * hiLen
    const washBuffer = audioCtxRef.current.createBuffer(2, washLen, audioCtxRef.current.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const channelData = washBuffer.getChannelData(ch)
      for (let i = 0; i < washLen; i++) {
        const env = Math.pow(1 - i / washLen, open ? 1.0 : 6)
        channelData[i] = (Math.random() * 2 - 1) * env
      }
    }
    const washSource = audioCtxRef.current.createBufferSource()
    washSource.buffer = washBuffer

    // Highpass for bright cymbal sizzle
    const hpFilter = audioCtxRef.current.createBiquadFilter()
    hpFilter.type = "highpass"
    hpFilter.frequency.value = open ? 3000 : 5000

    const washGain = audioCtxRef.current.createGain()
    washGain.gain.setValueAtTime(vol * 0.8, time)
    washGain.gain.exponentialRampToValueAtTime(0.001, time + hiLen)

    washSource.connect(hpFilter)
    hpFilter.connect(washGain)

    // Layer 2: Sizzle layer — metallic ring via comb-filtered noise
    const sizzleLen = audioCtxRef.current.sampleRate * (open ? 0.2 : 0.03)
    const sizzleBuffer = audioCtxRef.current.createBuffer(1, sizzleLen, audioCtxRef.current.sampleRate)
    const sizzleData = sizzleBuffer.getChannelData(0)
    for (let i = 0; i < sizzleLen; i++) {
      sizzleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sizzleLen, open ? 1.5 : 10)
    }
    const sizzleSource = audioCtxRef.current.createBufferSource()
    sizzleSource.buffer = sizzleBuffer
    const sizzleBP = audioCtxRef.current.createBiquadFilter()
    sizzleBP.type = "bandpass"
    sizzleBP.frequency.value = open ? 5000 : 8000
    sizzleBP.Q.value = open ? 0.5 : 0.3
    const sizzleGain = audioCtxRef.current.createGain()
    sizzleGain.gain.setValueAtTime(vol * 0.5, time)
    sizzleGain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.15 : 0.02))
    sizzleSource.connect(sizzleBP)
    sizzleBP.connect(sizzleGain)

    const sumGain = audioCtxRef.current.createGain()
    washGain.connect(sumGain)
    sizzleGain.connect(sumGain)

    const dryGain = audioCtxRef.current.createGain()
    const wetGain = audioCtxRef.current.createGain()
    const reverbAmount = settingsRef.current.reverbAmount * 0.25

    dryGain.gain.value = 1 - reverbAmount
    wetGain.gain.value = reverbAmount

    sumGain.connect(dryGain)
    sumGain.connect(wetGain)
    dryGain.connect(masterGainRef.current)
    wetGain.connect(reverbNodeRef.current)

    activeNodesRef.current.push(...[washSource, sizzleSource].map(n => { n.onended = () => { const i = activeNodesRef.current.indexOf(n); if(i>=0) activeNodesRef.current.splice(i,1) }; return n }))
    washSource.start(time)
    sizzleSource.start(time)
    washSource.stop(time + hiLen + 0.01)
    sizzleSource.stop(time + (open ? 0.22 : 0.04))
  }, [])

  
  const scheduleNote = useCallback(
    (time: number) => {
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



      // Synth rhythm handling
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

      // Reset arp index at start of new chord
      if (chordStepInBar === 0) {
        arpNoteIndexRef.current = 0
        const audioCtx = audioCtxRef.current
        if (audioCtx) {
          setTimeout(() => {
            setActiveChordIndex(currentChordIndexRef.current)
          }, (time - audioCtx.currentTime) * 1000)
        }
      }

      // For sustained, play at beginning of chord only
      if (settingsRef.current.synthRhythm === "sustained") {
        if (chordStepInBar === 0) {
          const chordDuration = (60 / settingsRef.current.bpm) * beatsPerBar * settingsRef.current.barsPerChord
          playChord(chord.frequencies, time, chordDuration)
        }
      } else if (synthRhythm.isArp) {
        // For arpeggio patterns - play single notes
        if (synthRhythm.pattern[synthPatternStep]) {
          const noteDuration = (60 / settingsRef.current.bpm) / 4 * 1.5
          playArpNote(chord.frequencies, time, noteDuration, synthRhythm.arpDirection || "up")
        }
      } else {
        // For rhythmic patterns, play shorter chords based on pattern
        if (synthRhythm.pattern[synthPatternStep]) {
          const noteDuration = (60 / settingsRef.current.bpm) / 4 * 1.5
          playChord(chord.frequencies, time, noteDuration)
        }
      }

      currentBeatRef.current++
      if (currentBeatRef.current >= totalSteps) {
        currentBeatRef.current = 0
        currentChordIndexRef.current = (currentChordIndexRef.current + 1) % progressionRef.current.length
        arpNoteIndexRef.current = 0
      }
    },
    [playKick, playSnare, playHiHat, playChord, playArpNote]
  )

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioCtxRef.current) return

    const secondsPerBeat = 60 / settingsRef.current.bpm
    const scheduleAheadTime = 0.2

    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
      if (!isPlayingRef.current) break
      scheduleNote(nextNoteTimeRef.current)
      nextNoteTimeRef.current += secondsPerBeat / 4
    }

    if (isPlayingRef.current) {
      schedulerTimerRef.current = window.setTimeout(scheduler, 50)
    }
  }, [scheduleNote])

  const generateProgression = useCallback(() => {
    const modeFamily =
      mode === "minor" || mode === "dorian" || mode === "phrygian" || mode === "locrian" || mode === "aeolian" || mode === "harmonicMinor" || mode === "melodicMinor" || mode === "hungarian" || mode === "persian"
        ? "minor"
        : "major"
    const styleProgs = STYLE_PROGRESSIONS[style] || STYLE_PROGRESSIONS.modern
    const progressions = styleProgs[modeFamily]
    const selectedProg = progressions[Math.floor(Math.random() * progressions.length)]
    const scaleNotes = getScaleNotes(key, mode)

    const newProgression = selectedProg.map((chord) => {
      const rootNote = scaleNotes[(chord.deg - 1) % scaleNotes.length]
      return {
        root: rootNote,
        type: chord.type,
        name: rootNote + formatChordType(chord.type),
        frequencies: getChordNotes(rootNote, chord.type, 3),
      }
    })

    setProgression(newProgression)
    progressionRef.current = newProgression

    // Auto-save to history
    setSavedProgressions((prev) => {
      const name = `${key} ${mode} - ${new Date().toLocaleTimeString()}`
      return [...prev, { name, key, mode, chords: newProgression }]
    })

    if (isPlayingRef.current) {
      currentChordIndexRef.current = 0
      currentBeatRef.current = 0
      arpNoteIndexRef.current = 0
    }
  }, [key, mode, style])

  const updateChord = useCallback((index: number, root: string, type: string) => {
    const frequencies = getChordNotes(root, type, 3)
    const name = root + formatChordType(type)
    const newChord = {
      root,
      type,
      name,
      frequencies,
    }

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

    if (progressionRef.current.length === 0) {
      generateProgression()
    }

    isPlayingRef.current = true
    setIsPlaying(true)
    currentChordIndexRef.current = 0
    currentBeatRef.current = 0
    arpNoteIndexRef.current = 0

    if (audioCtxRef.current) {
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1
    }

    scheduler()
  }, [initAudio, generateProgression, scheduler])

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setActiveChordIndex(-1)

    if (schedulerTimerRef.current) {
      clearTimeout(schedulerTimerRef.current)
      schedulerTimerRef.current = null
    }

    // Stop all active audio nodes
    stopAllNodes()

    // Reset and re-initialize audio context for clean state
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
      masterGainRef.current = null
      reverbNodeRef.current = null
    }
  }, [stopAllNodes])

  const playChordPreview = useCallback(
    (index: number) => {
      initAudio()
      const chord = progressionRef.current[index]
      if (chord && audioCtxRef.current) {
        playChord(chord.frequencies, audioCtxRef.current.currentTime, 1.5)
      }
    },
    [initAudio, playChord]
  )

  const saveProgression = useCallback(() => {
    if (progression.length === 0) return
    const name = `${key} ${mode} - ${new Date().toLocaleTimeString()}`
    setSavedProgressions((prev) => [...prev, { name, key, mode, chords: progression }])
  }, [progression, key, mode])

  const loadProgression = useCallback((saved: { name: string; key: string; mode: string; chords: Chord[] }) => {
    setProgression(saved.chords)
    progressionRef.current = saved.chords
    setKey(saved.key)
    setMode(saved.mode)
  }, [])

  const deleteSavedProgression = useCallback((index: number) => {
    setSavedProgressions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const exportProgression = useCallback(() => {
    const text = progression.map((c) => c.name).join(" - ")
    navigator.clipboard.writeText(text)
  }, [progression])

  // Generate MIDI file (bonus feature)
  const exportMidi = useCallback(() => {
    // Simple MIDI file generation
    const chordNames = progression.map((c) => c.name).join(" | ")
    const midiText = `CHORD PROGRESSION EXPORT\n========================\nKey: ${key} ${mode}\nStyle: ${style}\nBPM: ${settings.bpm}\nTime: ${settings.timeSignature}/4\n\nProgression:\n${chordNames}\n\nChord Details:\n${progression.map((c, i) => `${i + 1}. ${c.name} (${c.type})`).join("\n")}`
    
    const blob = new Blob([midiText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `progression-${key}-${mode}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [progression, key, mode, style, settings.bpm, settings.timeSignature])

  // Generate initial progression
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (!isLoaded) return

    if (isFirstRender.current) {
      isFirstRender.current = false
      // Only generate if we don't have a progression (i.e. nothing was in storage)
      if (progressionRef.current.length === 0) {
        generateProgression()
      }
      return
    }

    generateProgression()
  }, [generateProgression, isLoaded])



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault()
        if (isPlayingRef.current) {
          stopPlayback()
        } else {
          startPlayback()
        }
      }
      if (e.code === "KeyR" && (e.target as HTMLElement).tagName !== "INPUT") {
        generateProgression()
      }
      if (e.code === "KeyS" && (e.target as HTMLElement).tagName !== "INPUT") {
        saveProgression()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [stopPlayback, startPlayback, generateProgression, saveProgression])

  return (
    <div className="min-h-screen bg-[#EBEBEB] text-[#111111] font-sans selection:bg-[#F04E23] selection:text-[#111111]">
      <div className="max-w-7xl mx-auto p-1 md:p-4 lg:p-8 min-h-screen flex flex-col">
        {/* Device Frame */}
        <div className="bg-[#F5F5F3] border border-[#CCCCCC] overflow-hidden">
          
          {/* Top Bar — CHORD.GEN + Status + Actions */}
          <div className="bg-[#111111] dark-panel px-2 md:px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 md:gap-3 min-w-0">
              <div className="flex items-baseline gap-1 md:gap-2">
                <span className="text-base md:text-xl font-[800] tracking-tight text-[#F5F5F3] whitespace-nowrap">CHORD.GEN</span>
                <span className="brand-stamp text-[9px] md:text-[11px]">v.02</span>
              </div>
              <span className="text-[#333] mx-0.5 hidden sm:inline">|</span>
              <span className={`w-2 h-2 shrink-0 ${isPlaying ? "bg-[#F04E23]" : "bg-[#666]"}`} />
              <span className="mono-label text-[10px] md:text-[11px] text-[#666] hidden sm:inline">{isPlaying ? "PLAYING" : "STOPPED"}</span>
              
            </div>
            <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
              <button
                onClick={exportProgression}
                className="p-1.5 md:p-2 text-[#F5F5F3] hover:text-[#F04E23] hover:bg-[#1A1A1A] transition-all border border-transparent hover:border-[#F04E23]"
                title="Copy progression"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
              <button
                onClick={saveProgression}
                className="p-1.5 md:p-2 text-[#F5F5F3] hover:text-[#F04E23] hover:bg-[#1A1A1A] transition-all border border-transparent hover:border-[#F04E23]"
                title="Save progression"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </button>
              <button
                onClick={exportMidi}
                className="p-1.5 md:p-2 text-[#F5F5F3] hover:text-[#F04E23] hover:bg-[#1A1A1A] transition-all border border-transparent hover:border-[#F04E23]"
                title="Export MIDI"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button
                onClick={resetSettings}
                className="p-1.5 md:p-2 text-[#F5F5F3] hover:text-[#F04E23] hover:bg-[#1A1A1A] transition-all border border-transparent hover:border-[#F04E23]"
                title="Reset all settings"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Display Area */}
          <div className="bg-[#111111] dark-panel m-1 mt-1 p-2 md:m-3 md:mt-2 md:p-6 border border-[#CCCCCC]">


            {/* Chord Display — larger, more prominent */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-2 md:mb-4">
              {progression.map((chord, i) => (
                <button
                  key={i}
                  onClick={() => playChordPreview(i)}
                  className={`relative p-3 md:p-6 transition-all cursor-pointer text-left border min-h-[80px] md:min-h-0
                    ${activeChordIndex === i 
                      ? "bg-[#F04E23] orange-panel text-[#111111] border-[#F04E23]" 
                      : "bg-[#111111] border-[#1A1A1A] text-[#F5F5F3] hover:border-[#F04E23]"
                    }`}
                >
                  <div className="text-2xl md:text-3xl font-[700] tracking-tight">
                    {chord.root}
                    <span className="text-xs font-normal opacity-70 ml-0.5">{formatChordType(chord.type)}</span>
                  </div>
                  <div className={`mono-label text-[10px] md:text-[12px] mt-0.5 ${activeChordIndex === i ? "text-[#111111]" : "text-[#666]"}`}>
                    {getChordTypeName(chord.type)}
                  </div>
                  {activeChordIndex === i && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#111111]" />
                  )}
                  <div 
                    className={`absolute top-1 right-5 p-1 transition-colors cursor-pointer z-10 ${activeChordIndex === i ? "text-[#111111] hover:text-[#111111]/70" : "text-[#666] hover:text-[#F04E23]"}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingChord({ index: i, root: chord.root, type: chord.type })
                    }}
                  >
                    <Pencil size={10} />
                  </div>
                </button>
              ))}
            </div>

            {/* Transport — Play + Generate */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className={`flex items-center justify-center gap-2 py-4 md:py-5 font-[800] uppercase text-sm md:text-lg tracking-widest transition-all border-2 min-h-[48px]
                  ${isPlaying 
                    ? "bg-[#F04E23] border-[#F04E23] text-[#111111]" 
                    : "bg-[#F04E23] border-[#F04E23] text-[#111111]"
                  }`}
              >
                {isPlaying ? (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    STOP
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    PLAY
                  </>
                )}
              </button>
              <button
                onClick={generateProgression}
                className="flex items-center justify-center gap-2 py-4 md:py-5 bg-[#F04E23] border-2 border-[#F04E23] text-[#111111] font-[800] uppercase text-sm md:text-lg tracking-widest transition-all hover:bg-[#d04010] min-h-[48px]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                GENERATE
              </button>
            </div>
          </div>

          {/* Controls Section — Boxed Panels */}
          <div className="p-3 pt-2 space-y-3">

            {/* PANEL: CHORD CONFIG */}
            <div className="border-2 border-[#CCCCCC] bg-[#F5F5F3]">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#EBEBEB] border-b-2 border-[#CCCCCC]">
                <span className="w-2 h-2 bg-[#F04E23]" />
                <span className="mono-label text-[14px] text-[#111111] font-[700] tracking-wider">CHORD CONFIG</span>
                <span className="slash-divider text-[#666]">////</span>
                <span className="mono-label text-[11px] text-[#666] uppercase hidden sm:inline">Key &middot; Mode &middot; Style &middot; Meter</span>
              </div>
              <div className="p-1 md:p-3">
                <div className="hidden md:grid grid-cols-6 gap-2 mb-1 mono-label text-[12px] text-[#666] px-0.5">
                  <span>KEY</span>
                  <span>MODE</span>
                  <span>STYLE</span>
                  <span>BPM</span>
                  <span>TIME</span>
                  <span>BARS</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-1 md:gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">KEY</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="ctrl-select"
                      >
                        {NOTES.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">MODE</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="ctrl-select"
                      >
                        <option value="major">Maj</option>
                        <option value="minor">Min</option>
                        <option value="dorian">Dor</option>
                        <option value="mixolydian">Mix</option>
                        <option value="lydian">Lyd</option>
                        <option value="phrygian">Phr</option>
                        <option value="locrian">Loc</option>
                        <option value="aeolian">Aeo</option>
                        <option value="harmonicMinor">Hrm</option>
                        <option value="melodicMinor">Mel</option>
                        <option value="wholeTone">Whl</option>
                        <option value="blues">Blu</option>
                        <option value="pentatonicMajor">Pn+</option>
                        <option value="pentatonicMinor">Pn-</option>
                        <option value="hungarian">Hun</option>
                        <option value="japanese">Jpn</option>
                        <option value="arabian">Arb</option>
                        <option value="persian">Per</option>
                        <option value="bebop">Bop</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">STYLE</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="ctrl-select"
                      >
                        <option value="modern">Pop</option>
                        <option value="electronic">Elec</option>
                        <option value="ambient">Amb</option>
                        <option value="jazzy">Jazz</option>
                        <option value="lofi">Lofi</option>
                        <option value="cinematic">Cine</option>
                        <option value="rnb">R&amp;B</option>
                        <option value="gospel">Gosp</option>
                        <option value="funk">Funk</option>
                        <option value="indie">Indi</option>
                        <option value="bossa">Boss</option>
                        <option value="reggaeton">Regt</option>
                        <option value="country">Ctry</option>
                        <option value="metal">Metl</option>
                        <option value="classical">Clsc</option>
                        <option value="disco">Disc</option>
                        <option value="synthwave">Synw</option>
                        <option value="edm">EDM</option>
                        <option value="latin">Latn</option>
                        <option value="afrobeat">Afro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">BPM</span>
                    <div className="ctrl-wrapper">
                      <input
                        type="number"
                        value={bpmInput}
                        onChange={(e) => {
                          const val = e.target.value
                          setBpmInput(val)
                          const num = parseInt(val)
                          if (!isNaN(num)) {
                            if (num >= 1 && num <= 999) {
                              setSettings((s) => ({ ...s, bpm: num }))
                            }
                          }
                        }}
                        onBlur={() => {
                          const num = parseInt(bpmInput)
                          const clamped = Math.max(40, Math.min(200, num || 90))
                          setSettings((s) => ({ ...s, bpm: clamped }))
                          setBpmInput(clamped.toString())
                        }}
                        min={40}
                        max={200}
                        className="ctrl-input"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">TIME</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={settings.timeSignature}
                        onChange={(e) => setSettings((s) => ({ ...s, timeSignature: parseInt(e.target.value) }))}
                        className="ctrl-select"
                      >
                        <option value="4">4/4</option>
                        <option value="3">3/4</option>
                        <option value="6">6/8</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">BARS</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={settings.barsPerChord}
                        onChange={(e) => setSettings((s) => ({ ...s, barsPerChord: parseInt(e.target.value) }))}
                        className="ctrl-select"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL: SYNTH CONFIG */}
            <div className="border-2 border-[#CCCCCC] bg-[#F5F5F3]">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#EBEBEB] border-b-2 border-[#CCCCCC]">
                <span className="w-2 h-2 bg-[#F04E23]" />
                <span className="mono-label text-[14px] text-[#111111] font-[700] tracking-wider">SYNTH CONFIG</span>
                <span className="slash-divider text-[#666]">////</span>
                <span className="mono-label text-[11px] text-[#666] uppercase hidden sm:inline">Osc &middot; Pattern &middot; Reverb &middot; Level</span>
              </div>
              <div className="p-1 md:p-3">
                <div className="hidden md:grid grid-cols-4 gap-2 mb-1 mono-label text-[12px] text-[#666] px-0.5">
                  <span>SYNTH</span>
                  <span>RHYTHM</span>
                  <span>REVERB</span>
                  <span>CH VOL</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">SYNTH</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={settings.synthType}
                        onChange={(e) => setSettings((s) => ({ ...s, synthType: e.target.value }))}
                        className="ctrl-select"
                      >
                        <option value="pad">Pad</option>
                        <option value="pluck">Pluck</option>
                        <option value="keys">Keys</option>
                        <option value="strings">Strng</option>
                        <option value="organ">Organ</option>
                        <option value="bell">Bell</option>
                        <option value="bass">Bass</option>
                        <option value="lead">Lead</option>
                        <option value="brass">Brass</option>
                        <option value="fm">FM</option>
                        <option value="supersaw">Super</option>
                        <option value="wobble">Wobb</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">RHYTHM</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={settings.synthRhythm}
                        onChange={(e) => setSettings((s) => ({ ...s, synthRhythm: e.target.value }))}
                        className="ctrl-select"
                      >
                        {Object.entries(SYNTH_RHYTHMS).map(([k, { name }]) => (
                          <option key={k} value={k}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">REVERB</span>
                    <div className="ctrl-range-wrapper">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.reverbAmount * 100}
                        onChange={(e) => setSettings((s) => ({ ...s, reverbAmount: parseInt(e.target.value) / 100 }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">CH VOL</span>
                    <div className="ctrl-range-wrapper">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.chordVolume * 100}
                        onChange={(e) => setSettings((s) => ({ ...s, chordVolume: parseInt(e.target.value) / 100 }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL: DRUM CONFIG */}
            <div className="border-2 border-[#CCCCCC] bg-[#F5F5F3]">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#EBEBEB] border-b-2 border-[#CCCCCC]">
                <span className="w-2 h-2 bg-[#F04E23]" />
                <span className="mono-label text-[14px] text-[#111111] font-[700] tracking-wider">DRUM CONFIG</span>
                <span className="slash-divider text-[#666]">////</span>
                <span className="mono-label text-[11px] text-[#666] uppercase hidden sm:inline">Pattern &middot; Level &middot; Toggle</span>
              </div>
              <div className="p-1 md:p-3">
                <div className="hidden md:grid grid-cols-3 gap-2 mb-1 mono-label text-[12px] text-[#666] px-0.5">
                  <span>STYLE</span>
                  <span>VOLUME</span>
                  <span>ENABLE</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">STYLE</span>
                    <div className="ctrl-wrapper">
                      <select
                        value={settings.drumStyle}
                        onChange={(e) => setSettings((s) => ({ ...s, drumStyle: e.target.value }))}
                        className="ctrl-select"
                      >
                        <option value="basic">Basic</option>
                        <option value="basic1">Basic-1</option>
                        <option value="basic2">Basic-2</option>
                        <option value="basic3">Basic-3</option>
                        <option value="hiphop">HpHop</option>
                        <option value="house">House</option>
                        <option value="trap">Trap</option>
                        <option value="dnb">DnB</option>
                        <option value="reggae">Regg</option>
                        <option value="shuffle">Shuf</option>
                        <option value="bossa">Bossa</option>
                        <option value="reggaeton">Rgtn</option>
                        <option value="click">Click</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">VOLUME</span>
                    <div className="ctrl-range-wrapper">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.drumVolume * 100}
                        onChange={(e) => setSettings((s) => ({ ...s, drumVolume: parseInt(e.target.value) / 100 }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-label text-[10px] md:hidden text-[#666] px-0.5">ENABLE</span>
                    <button
                      onClick={() => setSettings((s) => ({ ...s, drumsEnabled: !s.drumsEnabled }))}
                      className={`ctrl-toggle ${settings.drumsEnabled ? 'active' : 'inactive'}`}
                    >
                      DRUMS {settings.drumsEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            </div>



            {/* Saved Progressions */}
            {savedProgressions.length > 0 && (
              <div className="pt-1 md:pt-2 border-t border-[#CCCCCC]">
                <div className="mono-label text-[12px] text-[#666] mb-1.5">HISTORY ///</div>
                <div className="flex flex-col gap-1">
                  {savedProgressions.map((saved, i) => (
                    <div key={i} className="group relative flex items-center bg-white border border-[#CCCCCC] hover:border-[#F04E23] transition-colors">
                      <button
                        onClick={() => loadProgression(saved)}
                        className="flex-1 text-left pl-3 pr-8 py-2 min-w-0"
                      >
                        <span className="mono-label text-[10px] text-[#666]">{saved.key} {saved.mode}</span>
                        <span className="block text-[12px] font-[700] font-mono text-[#111111] truncate mt-0.5">
                          {saved.chords.map((c) => c.name).join(" ")}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSavedProgression(i)
                        }}
                        className="absolute right-1 p-1 text-[#666] hover:text-[#F04E23] transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="bg-[#111111] dark-panel px-2 md:px-6 py-2 md:py-3 text-center mono-label text-[12px] text-[#666]">
            SPACE = PLAY/STOP / S = SAVE
          </div>
        </div>
      </div>

      <Dialog open={!!editingChord} onOpenChange={(open) => !open && setEditingChord(null)}>
        <DialogContent className="bg-[#111111] border-[#CCCCCC] text-[#F5F5F3] max-w-[90vw] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F04E23] mono-label">EDIT CHORD</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mono-label text-[14px] text-[#666] mb-2 block">ROOT NOTE</label>
                <select
                  className="w-full bg-[#1A1A1A] border border-[#666] px-4 py-3 text-base font-[700] focus:outline-none focus:border-[#F04E23] text-[#F5F5F3] appearance-none font-mono min-h-[44px]"
                  value={editingChord?.root}
                  onChange={(e) => setEditingChord(prev => prev ? { ...prev, root: e.target.value } : null)}
                >
                  {NOTES.map(note => (
                    <option key={note} value={note}>{note}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono-label text-[14px] text-[#666] mb-2 block">CHORD TYPE</label>
                <select
                  className="w-full bg-[#1A1A1A] border border-[#666] px-4 py-3 text-base font-[700] focus:outline-none focus:border-[#F04E23] text-[#F5F5F3] appearance-none font-mono min-h-[44px]"
                  value={editingChord?.type}
                  onChange={(e) => setEditingChord(prev => prev ? { ...prev, type: e.target.value } : null)}
                >
                  {Object.keys(CHORD_TYPES).map(type => (
                    <option key={type} value={type}>{getChordTypeName(type)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <button
              onClick={() => editingChord && updateChord(editingChord.index, editingChord.root, editingChord.type)}
              className="w-full bg-[#F04E23] orange-panel text-[#111111] py-3 font-[700] uppercase text-sm tracking-widest transition-all min-h-[44px]"
            >
              UPDATE CHORD
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
