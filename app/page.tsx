"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { DRUM_STYLE_PATTERNS } from "@/lib/audio/drum-patterns"
import { SYNTH_RHYTHMS } from "@/lib/audio/synth-rhythms"
import {
  playSynthNote,
  playKick as enginePlayKick,
  playSnare as enginePlaySnare,
  playHiHat as enginePlayHiHat,
  playRim as enginePlayRim,
  playClap as enginePlayClap,
  invalidateNoiseBuffer,
} from "@/lib/audio/synth-engine"
import { Pencil, X, Plus, Trash2, GripVertical, Settings, Copy, Save, Download, Music, RotateCcw, Sun, Moon } from "lucide-react"
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

const CHORD_COLOR_CYCLE = [
  { active: "bg-[#C0FC14] text-[#0D1117] border-[#C0FC14] chord-active-green shadow-[0_0_20px_rgba(192,252,20,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#C0FC14]/80 hover:shadow-[0_0_12px_rgba(192,252,20,0.15)]" },
  { active: "bg-[#FF2D7C] text-[#0D1117] border-[#FF2D7C] chord-active-pink shadow-[0_0_20px_rgba(255,45,124,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#FF2D7C]/80 hover:shadow-[0_0_12px_rgba(255,45,124,0.15)]" },
  { active: "bg-[#2B7FFF] text-[#0D1117] border-[#2B7FFF] chord-active-blue shadow-[0_0_20px_rgba(43,127,255,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#2B7FFF]/80 hover:shadow-[0_0_12px_rgba(43,127,255,0.15)]" },
  { active: "bg-[#FCEB14] text-[#0D1117] border-[#FCEB14] chord-active-yellow shadow-[0_0_20px_rgba(252,235,20,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#FCEB14]/80 hover:shadow-[0_0_12px_rgba(252,235,20,0.15)]" },
  { active: "bg-[#FF6B2B] text-[#0D1117] border-[#FF6B2B] chord-active-orange shadow-[0_0_20px_rgba(255,107,43,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#FF6B2B]/80 hover:shadow-[0_0_12px_rgba(255,107,43,0.15)]" },
  { active: "bg-[#B829FF] text-[#0D1117] border-[#B829FF] chord-active-purple shadow-[0_0_20px_rgba(184,41,255,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#B829FF]/80 hover:shadow-[0_0_12px_rgba(184,41,255,0.15)]" },
  { active: "bg-[#14FCEB] text-[#0D1117] border-[#14FCEB] chord-active-cyan shadow-[0_0_20px_rgba(20,252,235,0.3)]", inactive: "bg-[var(--base-panel)] border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#14FCEB]/80 hover:shadow-[0_0_12px_rgba(20,252,235,0.15)]" },
]

function getChordColorClasses(index: number, isActive: boolean): string {
  const c = CHORD_COLOR_CYCLE[index % CHORD_COLOR_CYCLE.length]
  return isActive ? c.active : c.inactive
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
  const [savedProgressions, setSavedProgressions] = useState<{ name: string; key: string; mode: string; style: string; settings: Settings; chords: Chord[] }[]>([])
  const [editingChord, setEditingChord] = useState<{index: number, root: string, type: string} | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportLoopCount, setExportLoopCount] = useState(1)
  const [exportStatus, setExportStatus] = useState<"idle" | "rendering" | "done">("idle")
  const [configModalOpen, setConfigModalOpen] = useState(false)
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

    // Invalidate cached noise buffer (sample rate may differ)
    invalidateNoiseBuffer()

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
      playSynthNote(
        audioCtxRef.current, masterGainRef.current, reverbNodeRef.current,
        freq, time, duration, synthType,
        settingsRef.current.chordVolume, settingsRef.current.reverbAmount,
        settingsRef.current.bpm
      )
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
    enginePlayKick(audioCtxRef.current, masterGainRef.current, time, settingsRef.current.drumVolume * 1.0, reverbNodeRef.current, settingsRef.current.reverbAmount)
  }, [])

  const playSnare = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    enginePlaySnare(audioCtxRef.current, masterGainRef.current, time, settingsRef.current.drumVolume * 0.9, reverbNodeRef.current, settingsRef.current.reverbAmount)
  }, [])

  const playHiHat = useCallback((time: number, open: boolean = false) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    enginePlayHiHat(audioCtxRef.current, masterGainRef.current, time, settingsRef.current.drumVolume * (open ? 0.3 : 0.35), reverbNodeRef.current, settingsRef.current.reverbAmount, open)
  }, [])
  const playRim = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    enginePlayRim(audioCtxRef.current, masterGainRef.current, time, settingsRef.current.drumVolume * 0.5, reverbNodeRef.current, settingsRef.current.reverbAmount)
  }, [])
  const playClap = useCallback((time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current || !reverbNodeRef.current) return
    enginePlayClap(audioCtxRef.current, masterGainRef.current, time, settingsRef.current.drumVolume * 0.7, reverbNodeRef.current, settingsRef.current.reverbAmount)
  }, [])

  const scheduleNote = useCallback(
    (time: number) => {
      if (!isPlayingRef.current) return

      const beatsPerBar = settingsRef.current.timeSignature
      // 6/8 is compound meter: 6 eighth notes = 12 sixteenths per bar
      const stepsPerBar = beatsPerBar === 6 ? 12 : beatsPerBar * 4
      const totalSteps = stepsPerBar * settingsRef.current.barsPerChord

      const drumPatterns = DRUM_STYLE_PATTERNS[settingsRef.current.drumStyle] || DRUM_STYLE_PATTERNS.basic
      const pattern = drumPatterns[String(settingsRef.current.timeSignature)] || drumPatterns["4"]
      const patternStep = currentBeatRef.current % pattern.kick.length

      if (settingsRef.current.drumsEnabled) {
        if (pattern.kick[patternStep]) playKick(time)
        if (pattern.snare[patternStep]) playSnare(time)
        if (pattern.hihat[patternStep]) playHiHat(time)
        if (pattern.openHat[patternStep]) playHiHat(time, true)
        if (pattern.rim && pattern.rim[patternStep]) playRim(time)
        if (pattern.clap && pattern.clap[patternStep]) playClap(time)
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
          // 6/8 bar = 3 quarter-note beats worth of time
          const quarterNotesPerBar = beatsPerBar === 6 ? 3 : beatsPerBar
          const chordDuration = (60 / settingsRef.current.bpm) * quarterNotesPerBar * settingsRef.current.barsPerChord
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
    [playKick, playSnare, playHiHat, playRim, playClap, playChord, playArpNote]
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

    const targetLength = Math.max(1, progressionRef.current.length || 4)

    const newProgression: Chord[] = []
    for (let i = 0; i < targetLength; i++) {
      const template = selectedProg[i % selectedProg.length]
      const rootNote = scaleNotes[(template.deg - 1 + Math.floor(i / selectedProg.length)) % scaleNotes.length]
      const type = template.type
      newProgression.push({
        root: rootNote,
        type,
        name: rootNote + formatChordType(type),
        frequencies: getChordNotes(rootNote, type, 3),
      })
    }

    setProgression(newProgression)
    progressionRef.current = newProgression

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

  const addChord = useCallback(() => {
    const modeFamily =
      mode === "minor" || mode === "dorian" || mode === "phrygian" || mode === "locrian" || mode === "aeolian" || mode === "harmonicMinor" || mode === "melodicMinor" || mode === "hungarian" || mode === "persian"
        ? "minor"
        : "major"
    const scaleNotes = getScaleNotes(key, mode)
    const randomDegree = Math.floor(Math.random() * scaleNotes.length)
    const randomType = modeFamily === "minor" ? (Math.random() > 0.5 ? "min" : "min7") : (Math.random() > 0.5 ? "maj" : "maj7")
    const rootNote = scaleNotes[randomDegree]
    const newChord: Chord = {
      root: rootNote,
      type: randomType,
      name: rootNote + formatChordType(randomType),
      frequencies: getChordNotes(rootNote, randomType, 3),
    }
    const newProgression = [...progressionRef.current, newChord]
    setProgression(newProgression)
    progressionRef.current = newProgression
  }, [key, mode])

  const removeChord = useCallback((index: number) => {
    if (progressionRef.current.length <= 1) return
    const newProgression = progressionRef.current.filter((_, i) => i !== index)
    setProgression(newProgression)
    progressionRef.current = newProgression
    if (activeChordIndex >= newProgression.length) {
      setActiveChordIndex(-1)
    }
    if (currentChordIndexRef.current >= newProgression.length) {
      currentChordIndexRef.current = 0
    }
  }, [activeChordIndex])

  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      dragIndexRef.current = null
      setDragOverIndex(null)
      return
    }
    const newProgression = [...progressionRef.current]
    const [moved] = newProgression.splice(dragIndex, 1)
    newProgression.splice(dropIndex, 0, moved)
    setProgression(newProgression)
    progressionRef.current = newProgression
    if (activeChordIndex === dragIndex) {
      setActiveChordIndex(dropIndex)
    } else if (activeChordIndex > dragIndex && activeChordIndex <= dropIndex) {
      setActiveChordIndex(activeChordIndex - 1)
    } else if (activeChordIndex < dragIndex && activeChordIndex >= dropIndex) {
      setActiveChordIndex(activeChordIndex + 1)
    }
    if (currentChordIndexRef.current === dragIndex) {
      currentChordIndexRef.current = dropIndex
    }
    dragIndexRef.current = null
    setDragOverIndex(null)
  }, [activeChordIndex])

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null
    setDragOverIndex(null)
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
    setSavedProgressions((prev) => [...prev, { name, key, mode, style, settings, chords: progression }])
  }, [progression, key, mode, style, settings])

  const loadProgression = useCallback((saved: { key: string; mode: string; style?: string; settings?: Settings; chords: Chord[] }) => {
    setKey(saved.key)
    setMode(saved.mode)
    if (saved.style) setStyle(saved.style)
    if (saved.settings) setSettings(saved.settings)
    setProgression(saved.chords)
    progressionRef.current = saved.chords
  }, [])

  const deleteSavedProgression = useCallback((index: number) => {
    setSavedProgressions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const exportProgression = useCallback(() => {
    const text = progression.map((c) => c.name).join(" - ")
    navigator.clipboard.writeText(text)
  }, [progression])

  // Generate MIDI file (Standard MIDI File Format 0)
  const exportMidi = useCallback(() => {
    if (progression.length === 0) return

    const ticksPerBeat = 480
    const beatsPerBar = settings.timeSignature
    const stepsPerBar = beatsPerBar === 6 ? 12 : beatsPerBar * 4
    const ticksPerStep = ticksPerBeat / 4
    const stepsPerChord = stepsPerBar * settings.barsPerChord
    const chordDurationTicks = stepsPerChord * ticksPerStep
    const tempo = Math.round(60000000 / settings.bpm)

    const freqToMidi = (freq: number): number => Math.round(69 + 12 * Math.log2(freq / 440))

    const varLen = (val: number): number[] => {
      const bytes: number[] = [val & 0x7F]
      val >>= 7
      while (val > 0) { bytes.unshift((val & 0x7F) | 0x80); val >>= 7 }
      return bytes
    }

    type MidiEvent = { tick: number; data: number[] }
    const events: MidiEvent[] = []

    // Tempo meta
    events.push({ tick: 0, data: [0xFF, 0x51, 0x03, (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF] })

    // Track name meta
    const trackName = `CHORD.GEN ${key} ${mode} ${style} ${settings.bpm}bpm`
    const nameBytes = [...trackName].map(c => c.charCodeAt(0))
    events.push({ tick: 0, data: [0xFF, 0x03, ...varLen(nameBytes.length), ...nameBytes] })

    // Program change: Acoustic Grand Piano ch.0
    events.push({ tick: 0, data: [0xC0, 0x00] })

    let absoluteTick = 0
    for (let ci = 0; ci < progression.length; ci++) {
      const chord = progression[ci]
      const noteLen = Math.round(chordDurationTicks * 0.85)

      for (const freq of chord.frequencies) {
        const n = freqToMidi(freq)
        if (n < 0 || n > 127) continue
        events.push({ tick: absoluteTick, data: [0x90, n, 0x64] })
      }
      for (const freq of chord.frequencies) {
        const n = freqToMidi(freq)
        if (n < 0 || n > 127) continue
        events.push({ tick: absoluteTick + noteLen, data: [0x80, n, 0x40] })
      }
      absoluteTick += chordDurationTicks
    }

    // End of track
    events.push({ tick: absoluteTick, data: [0xFF, 0x2F, 0x00] })

    // Sort by absolute tick
    events.sort((a, b) => a.tick - b.tick)

    // Convert to delta-time track bytes
    const trackBytes: number[] = []
    let prev = 0
    for (const ev of events) {
      trackBytes.push(...varLen(ev.tick - prev), ...ev.data)
      prev = ev.tick
    }

    // Build complete MIDI file with DataView (WAV exporter pattern)
    const headerSize = 14
    const trackHeaderSize = 8
    const totalSize = headerSize + trackHeaderSize + trackBytes.length
    const buf = new ArrayBuffer(totalSize)
    const view = new DataView(buf)

    // MThd header
    view.setUint8(0, 0x4D); view.setUint8(1, 0x54); view.setUint8(2, 0x68); view.setUint8(3, 0x64)
    view.setUint32(4, 6, false)     // chunk length (big-endian: false param in DataView means big-endian)
    view.setUint16(8, 0, false)     // format 0
    view.setUint16(10, 1, false)    // ntrks = 1
    view.setUint16(12, ticksPerBeat, false) // ticks per quarter note

    // MTrk header
    view.setUint8(14, 0x4D); view.setUint8(15, 0x54); view.setUint8(16, 0x72); view.setUint8(17, 0x6B)
    view.setUint32(18, trackBytes.length, false)

    // Track data
    const base = 22
    for (let i = 0; i < trackBytes.length; i++) {
      view.setUint8(base + i, trackBytes[i])
    }

    const blob = new Blob([buf], { type: "audio/midi" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `progression-${key}-${mode}-${settings.bpm}bpm.mid`
    a.click()
    URL.revokeObjectURL(url)
  }, [progression, key, mode, style, settings.bpm, settings.timeSignature, settings.barsPerChord])

  // Export WAV via OfflineAudioContext
  const exportWav = useCallback(async () => {
    if (progression.length === 0) return

    setExportStatus("rendering")

    const sampleRate = 44100
    const bpm = settings.bpm
    const beatsPerBar = settings.timeSignature
    const stepsPerBar = beatsPerBar === 6 ? 12 : beatsPerBar * 4
    const totalStepsPerChord = stepsPerBar * settings.barsPerChord
    const stepDuration = 60 / bpm / 4
    const totalSteps = progression.length * totalStepsPerChord * exportLoopCount
    const totalDuration = totalSteps * stepDuration + 2.5 // tail for reverb

    const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate)

    // --- Signal chain (mirrors initAudio) ---
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.75

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 6
    compressor.ratio.value = 3
    compressor.attack.value = 0.003
    compressor.release.value = 0.25

    const limiter = ctx.createGain()
    limiter.gain.value = 1.0

    // Reverb (mirrors createReverb)
    const convolver = ctx.createConvolver()
    const rate = ctx.sampleRate
    const reverbLen = rate * 3
    const reverbDecay = 3
    const impulse = ctx.createBuffer(2, reverbLen, rate)
    for (let channel = 0; channel < 2; channel++) {
      const cd = impulse.getChannelData(channel)
      for (let i = 0; i < reverbLen; i++) {
        const earlyRefl = i < rate * 0.03
        const density = earlyRefl ? 0.8 : 0.4
        const refDecay = earlyRefl ? 0.6 : Math.pow(1 - i / reverbLen, reverbDecay)
        cd[i] = (Math.random() * 2 - 1) * refDecay * density * (1 + (channel === 0 ? 0.1 : -0.1))
      }
    }
    convolver.buffer = impulse

    masterGain.connect(compressor)
    convolver.connect(compressor)
    compressor.connect(limiter)
    limiter.connect(ctx.destination)

    // --- Helper: apply reverb dry/wet ---
    const applyReverb = (node: AudioNode, revAmt: number) => {
      const dryGain = ctx.createGain()
      const wetGain = ctx.createGain()
      dryGain.gain.value = 1 - revAmt
      wetGain.gain.value = revAmt
      node.connect(dryGain)
      node.connect(wetGain)
      dryGain.connect(masterGain)
      wetGain.connect(convolver)
    }

    // --- Synth note (uses shared engine) ---
    const playNote = (freq: number, time: number, duration: number, synthType: string) => {
      playSynthNote(ctx, masterGain, convolver, freq, time, duration, synthType, settings.chordVolume, settings.reverbAmount, bpm)
    }

    // --- Drum synthesis (uses shared engine) ---
    const playKick = (time: number) => {
      enginePlayKick(ctx, masterGain, time, settings.drumVolume * 1.0, convolver, settings.reverbAmount)
    }
    const playSnare = (time: number) => {
      enginePlaySnare(ctx, masterGain, time, settings.drumVolume * 0.9, convolver, settings.reverbAmount)
    }
    const playHiHat = (time: number, open = false) => {
      enginePlayHiHat(ctx, masterGain, time, settings.drumVolume * (open ? 0.3 : 0.35), convolver, settings.reverbAmount, open)
    }
    const playRim = (time: number) => {
      enginePlayRim(ctx, masterGain, time, settings.drumVolume * 0.5, convolver, settings.reverbAmount)
    }
    const playClap = (time: number) => {
      enginePlayClap(ctx, masterGain, time, settings.drumVolume * 0.7, convolver, settings.reverbAmount)
    }

    // --- Chord / arp helpers ---
    const playChord = (frequencies: number[], time: number, duration: number) => {
      frequencies.forEach((f) => playNote(f, time, duration, settings.synthType))
    }

    const playArpNote = (frequencies: number[], time: number, duration: number, direction: string, idx: number): number => {
      if (frequencies.length === 0) return idx
      let noteIndex: number
      switch (direction) {
        case "up":
          noteIndex = idx % frequencies.length
          idx++
          break
        case "down":
          noteIndex = (frequencies.length - 1) - (idx % frequencies.length)
          idx++
          break
        case "updown": {
          const totalCycle = frequencies.length * 2 - 2
          const pos = idx % totalCycle
          noteIndex = pos < frequencies.length ? pos : totalCycle - pos
          idx++
          break
        }
        case "random":
          noteIndex = Math.floor(Math.random() * frequencies.length)
          break
        default:
          noteIndex = 0
      }
      playNote(frequencies[noteIndex], time, duration, settings.synthType)
      return idx
    }

    // --- Schedule all notes ---
    const synthRhythm = SYNTH_RHYTHMS[settings.synthRhythm] || SYNTH_RHYTHMS.sustained
    const drumPatterns = DRUM_STYLE_PATTERNS[settings.drumStyle] || DRUM_STYLE_PATTERNS.basic
    const drumPat = drumPatterns[String(settings.timeSignature)] || drumPatterns["4"]

    let arpIdx = 0

    for (let loop = 0; loop < exportLoopCount; loop++) {
      for (let ci = 0; ci < progression.length; ci++) {
        const chord = progression[ci]
        for (let step = 0; step < totalStepsPerChord; step++) {
          const time = (loop * progression.length * totalStepsPerChord + ci * totalStepsPerChord + step) * stepDuration

          // Drums
          const patternStep = step % drumPat.kick.length
          if (settings.drumsEnabled) {
            if (drumPat.kick[patternStep]) playKick(time)
            if (drumPat.snare[patternStep]) playSnare(time)
            if (drumPat.hihat[patternStep]) playHiHat(time)
            if (drumPat.openHat[patternStep]) playHiHat(time, true)
            if (drumPat.rim && drumPat.rim[patternStep]) playRim(time)
            if (drumPat.clap && drumPat.clap[patternStep]) playClap(time)
          }

          // Synth
          const synthStep = step % synthRhythm.pattern.length
          if (settings.synthRhythm === "sustained") {
            if (step === 0) {
              const qnPerBar = beatsPerBar === 6 ? 3 : beatsPerBar
              const chordDur = (60 / bpm) * qnPerBar * settings.barsPerChord
              playChord(chord.frequencies, time, chordDur)
            }
          } else if (synthRhythm.isArp && synthRhythm.pattern[synthStep]) {
            const noteDur = (60 / bpm) / 4 * 1.5
            arpIdx = playArpNote(chord.frequencies, time, noteDur, synthRhythm.arpDirection || "up", arpIdx)
          } else if (synthRhythm.pattern[synthStep]) {
            const noteDur = (60 / bpm) / 4 * 1.5
            playChord(chord.frequencies, time, noteDur)
          }
        }
      }
    }

    // --- Render ---
    let buffer: AudioBuffer
    try {
      buffer = await ctx.startRendering()
    } catch (err) {
      console.error("WAV render failed", err)
      setExportStatus("idle")
      return
    }

    // --- Encode WAV ---
    const wavBuffer = (() => {
      const numChannels = buffer.numberOfChannels
      const sr = buffer.sampleRate
      const bitsPerSample = 16
      const bytesPerSample = bitsPerSample / 8
      const blockAlign = numChannels * bytesPerSample
      const dataLength = buffer.length * blockAlign
      const headerLength = 44
      const totalLen = headerLength + dataLength
      const ab = new ArrayBuffer(totalLen)
      const view = new DataView(ab)

      const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
      }

      writeStr(0, "RIFF")
      view.setUint32(4, totalLen - 8, true)
      writeStr(8, "WAVE")
      writeStr(12, "fmt ")
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numChannels, true)
      view.setUint32(24, sr, true)
      view.setUint32(28, sr * blockAlign, true)
      view.setUint16(32, blockAlign, true)
      view.setUint16(34, bitsPerSample, true)
      writeStr(36, "data")
      view.setUint32(40, dataLength, true)

      let offset = 44
      for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
          view.setInt16(offset, intSample, true)
          offset += 2
        }
      }
      return ab
    })()

    const blob = new Blob([wavBuffer], { type: "audio/wav" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `progression-${key}-${mode}-${style}.wav`
    a.click()
    URL.revokeObjectURL(url)

    setExportStatus("done")
    setExportModalOpen(false)
  }, [progression, settings, key, mode, style, exportLoopCount])

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
    <div className="min-h-screen bg-[var(--base-bg)] text-[var(--text-primary)] font-[family-name:var(--font-display)] selection:bg-[#C0FC14] selection:text-[#0D1117] cyber-grid-bg">
      <div className="max-w-7xl mx-auto p-1 md:p-4 lg:p-8 min-h-screen flex flex-col">
        {/* Device Frame */}
        <div className="bg-[var(--base-panel)] border border-[var(--base-border)] overflow-hidden">
          
          {/* Top Bar — CHORD.GEN + Status + Actions */}
          <div className="bg-[var(--base-panel)] cyber-panel px-3 md:px-5 py-2.5 flex items-center justify-between gap-3 border border-[var(--base-border)]">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <div className="flex items-baseline gap-1.5 md:gap-2">
                <span className="text-base md:text-xl font-[900] tracking-tight text-[var(--text-primary)] whitespace-nowrap">CHORD.GEN</span>
                <span className="brand-stamp text-[10px] md:text-[12px] font-[bolder]" style={{background:"#FF6B2B",boxShadow:"0 0 8px rgba(255,107,43,0.5)"}}>v.0</span>
              </div>
              <span className="text-[var(--base-border-bright)] mx-0.5 hidden sm:inline">|</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 shrink-0 ${isPlaying ? "bg-[#C0FC14] animate-pulse shadow-[0_0_8px_rgba(192,252,20,0.6)]" : "bg-[var(--text-faint)]"}`} />
                <span className="cyber-mono text-[11px] md:text-[12px] font-[bolder] text-[var(--text-dim)] hidden sm:inline">{isPlaying ? "PLAYING" : "STOPPED"}</span>
              </div>
            </div>
            <button
              onClick={() => setConfigModalOpen(true)}
              className="p-1.5 md:p-2 text-[var(--text-primary)] hover:text-[#C0FC14] hover:bg-[var(--base-card)] transition-all border border-transparent hover:border-[#C0FC14] hover:shadow-[0_0_12px_rgba(192,252,20,0.2)]"
              title="Menu"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Main Display Area */}
          <div className="cyber-panel m-2 md:m-4 md:mt-3 p-3 md:p-6 border border-[var(--base-border)] scanlines scanlines-strong">
            {/* Chord Display — larger, more prominent */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 mb-3 md:mb-5">
              {progression.map((chord, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  onClick={() => playChordPreview(i)}
                  className={`relative p-4 md:p-5 transition-all duration-200 cursor-grab active:cursor-grabbing text-left border min-h-[88px] md:min-h-[120px] group select-none ${getChordColorClasses(i, activeChordIndex === i)} ${dragOverIndex === i ? "scale-105 border-dashed border-[#C0FC14] z-10" : ""}`}
                >
                  <div className="absolute top-1.5 left-1.5 text-[var(--text-faint)] opacity-40 group-hover:opacity-70">
                    <GripVertical size={14} />
                  </div>
                  <div className="text-2xl md:text-4xl font-[800] tracking-tight leading-none">
                    {chord.root}
                    <span className="text-sm md:text-base font-normal opacity-70 ml-1 align-top">{formatChordType(chord.type)}</span>
                  </div>
                  <div className={`cyber-mono text-[11px] md:text-[12px] font-[bolder] mt-2 ${activeChordIndex === i ? "text-[#0D1117]/60" : "text-[var(--text-dim)] group-hover:text-[var(--text-muted)]"}`}>
                    {getChordTypeName(chord.type)}
                  </div>
                  {activeChordIndex === i && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--base-panel)]" />
                  )}
                  <div className={`absolute top-1.5 right-1.5 flex items-center gap-0.5 transition-opacity z-10 ${activeChordIndex === i ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <button
                      className={`p-1 transition-colors ${activeChordIndex === i ? "text-[#0D1117] hover:text-[#0D1117]/60" : "text-[var(--text-dim)] hover:text-[#C0FC14]"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingChord({ index: i, root: chord.root, type: chord.type })
                      }}
                      title="Edit chord"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      className={`p-1 transition-colors ${activeChordIndex === i ? "text-[#0D1117] hover:text-[#FF2D7C]" : "text-[var(--text-dim)] hover:text-[#FF2D7C]"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeChord(i)
                      }}
                      title="Remove chord"
                      disabled={progression.length <= 1}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
              <div
                onClick={addChord}
                className="relative p-4 md:p-5 transition-all duration-200 cursor-pointer text-left border min-h-[88px] md:min-h-[120px] group select-none bg-[var(--base-panel)] border-[var(--base-border)] border-dashed text-[var(--text-muted)] hover:border-[#C0FC14] hover:text-[#C0FC14] hover:shadow-[0_0_12px_rgba(192,252,20,0.15)] flex flex-col items-center justify-center gap-2"
              >
                <Plus size={24} />
                <span className="cyber-mono text-[11px] md:text-[12px] font-[bolder]">ADD CHORD</span>
              </div>
            </div>

            {/* Transport — Play + Generate */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className={`transport-btn flex items-center justify-center gap-2.5 py-4 md:py-5 font-[900] uppercase text-sm md:text-lg tracking-widest transition-all border-2 min-h-[52px]
                  ${isPlaying 
                    ? "bg-[#FF2D7C] border-[#FF2D7C] text-[#0D1117] hover:shadow-[0_0_24px_rgba(255,45,124,0.4)]" 
                    : "bg-[#C0FC14] border-[#C0FC14] text-[#0D1117] hover:shadow-[0_0_24px_rgba(192,252,20,0.4)]"
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
                className="transport-btn flex items-center justify-center gap-2.5 py-4 md:py-5 bg-[#2B7FFF] border-2 border-[#2B7FFF] text-[#0D1117] font-[900] uppercase text-sm md:text-lg tracking-widest transition-all min-h-[52px] hover:shadow-[0_0_24px_rgba(43,127,255,0.4)]"
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
            <div className="border border-[var(--base-border)] bg-[var(--base-panel)] cyber-corner">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--base-bg)] border-b border-[var(--base-border)]">
                <span className="w-2 h-2 bg-[#C0FC14] shrink-0" />
                <span className="cyber-mono text-[13px] text-[var(--text-primary)] font-[800] tracking-wider">CHORD CONFIG</span>
                <span className="slash-divider text-[#C0FC14] glow-green">////</span>
                <span className="cyber-mono text-[12px] text-[var(--text-muted)] uppercase hidden sm:inline font-[bolder]"><span className="text-[#C0FC14]">Key</span> &middot; <span className="text-[#C0FC14]">Mode</span> &middot; <span className="text-[#C0FC14]">Style</span> &middot; <span className="text-[#C0FC14]">Meter</span></span>
              </div>
              <div className="p-2 md:p-3">
                <div className="hidden md:grid grid-cols-6 gap-2 mb-2 cyber-mono text-[12px] font-[bolder] text-[var(--text-muted)] px-0.5">
                  <span>KEY</span>
                  <span>MODE</span>
                  <span>STYLE</span>
                  <span>BPM</span>
                  <span>TIME</span>
                  <span>BARS</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">KEY</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">MODE</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">STYLE</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">BPM</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">TIME</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">BARS</span>
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
            <div className="border border-[var(--base-border)] bg-[var(--base-panel)] cyber-corner">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--base-bg)] border-b border-[var(--base-border)]">
                <span className="w-2 h-2 bg-[#C0FC14] shrink-0" />
                <span className="cyber-mono text-[13px] text-[var(--text-primary)] font-[800] tracking-wider">SYNTH CONFIG</span>
                <span className="slash-divider text-[var(--text-muted)]">////</span>
                <span className="cyber-mono text-[12px] text-[var(--text-muted)] uppercase hidden sm:inline font-[bolder]"><span className="text-[#2B7FFF]">Osc</span> &middot; <span className="text-[#2B7FFF]">Pattern</span> &middot; <span className="text-[#2B7FFF]">Reverb</span> &middot; <span className="text-[#2B7FFF]">Level</span></span>
              </div>
              <div className="p-2 md:p-3">
                <div className="hidden md:grid grid-cols-4 gap-2 mb-2 cyber-mono text-[12px] font-[bolder] text-[var(--text-muted)] px-0.5">
                  <span>SYNTH</span>
                  <span>RHYTHM</span>
                  <span>REVERB</span>
                  <span>CH VOL</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">SYNTH</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">RHYTHM</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">REVERB</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">CH VOL</span>
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
            <div className="border border-[var(--base-border)] bg-[var(--base-panel)] cyber-corner">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--base-bg)] border-b border-[var(--base-border)]">
                <span className="w-2 h-2 bg-[#C0FC14] shrink-0" />
                <span className="cyber-mono text-[13px] text-[var(--text-primary)] font-[800] tracking-wider">DRUM CONFIG</span>
                <span className="slash-divider text-[var(--text-muted)]">////</span>
                <span className="cyber-mono text-[12px] text-[var(--text-muted)] uppercase hidden sm:inline font-[bolder]"><span className="text-[#FF2D7C]">Pattern</span> &middot; <span className="text-[#FF2D7C]">Level</span> &middot; <span className="text-[#FF2D7C]">Toggle</span></span>
              </div>
              <div className="p-2 md:p-3">
                <div className="hidden md:grid grid-cols-3 gap-2 mb-2 cyber-mono text-[12px] font-[bolder] text-[var(--text-muted)] px-0.5">
                  <span>STYLE</span>
                  <span>VOLUME</span>
                  <span>ENABLE</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">STYLE</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">VOLUME</span>
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
                    <span className="cyber-mono text-[11px] md:hidden font-[bolder] text-[var(--text-dim)] px-0.5">ENABLE</span>
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
              <div className="pt-3 md:pt-4 border-t-2 border-[var(--base-border)]">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-1.5 h-1.5 bg-[#B829FF] shadow-[0_0_6px_rgba(184,41,255,0.5)]" />
                  <span className="cyber-mono text-[12px] text-[#B829FF] glow-purple">SAVED PROGRESSIONS</span>
                </div>
                <div className="flex flex-col md:flex-row flex-wrap gap-2">
                  {savedProgressions.map((saved, i) => (
                    <div key={i} className="group relative flex items-stretch">
                      <button
                        onClick={() => loadProgression(saved)}
                        className="saved-chip w-full md:w-auto"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[var(--text-primary)]">{saved.chords.map((c) => c.name).join("  ")}</span>
                          <span className="cyber-mono text-[10px] text-[var(--text-dim)]">{saved.key} {saved.mode}{saved.style ? ` · ${saved.style}` : ''}{saved.settings ? ` · ${saved.settings.bpm}bpm · ${saved.settings.timeSignature}/4 · ${saved.settings.synthType}` : ''}</span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSavedProgression(i)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[#FF2D7C] transition-colors hover:shadow-[0_0_8px_rgba(255,45,124,0.3)]"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="bg-[var(--base-panel)] cyber-panel px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-center gap-3 cyber-mono text-[12px] text-[var(--text-dim)] border border-[var(--base-border)] font-[bolder]">
            <span className="hidden sm:inline text-[#C0FC14] glow-green">SPACE</span>
            <span className="text-[var(--base-border-bright)] hidden sm:inline">=</span>
            <span>PLAY / STOP</span>
            <span className="text-[var(--base-border-bright)]">/</span>
            <span className="hidden sm:inline text-[#2B7FFF] glow-blue">R</span>
            <span className="text-[var(--base-border-bright)] hidden sm:inline">=</span>
            <span className="hidden sm:inline text-[#2B7FFF]">REGEN</span>
            <span className="text-[var(--base-border-bright)] hidden sm:inline">/</span>
            <span className="hidden sm:inline text-[#FF2D7C] glow-pink">S</span>
            <span className="text-[var(--base-border-bright)] hidden sm:inline">=</span>
            <span>SAVE</span>
          </div>
        </div>
      </div>

      {/* Export WAV Modal */}
      <Dialog open={exportModalOpen} onOpenChange={(open) => { if (!open) setExportModalOpen(false) }}>
        <DialogContent className="bg-[var(--base-panel)] border-[#14FCEB]/30 text-[var(--text-primary)] max-w-[90vw] md:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#14FCEB] cyber-mono cyber-glow-text">EXPORT WAV</DialogTitle>
          </DialogHeader>
          <div className="py-4 font-[family-name:var(--font-mono)]">
            <label className="cyber-mono text-[14px] text-[var(--text-dim)] mb-3 block">
              HOW MANY LOOPS?
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExportLoopCount((n) => Math.max(1, n - 1))}
                className="w-10 h-10 flex items-center justify-center bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#14FCEB] hover:text-[#14FCEB] text-lg font-[800]"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={32}
                value={exportLoopCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v)) setExportLoopCount(Math.max(1, Math.min(32, v)))
                }}
                className="flex-1 bg-[var(--base-card)] border border-[var(--base-border)] px-4 py-3 text-center text-xl font-[800] focus:outline-none focus:border-[#14FCEB] focus:shadow-[0_0_8px_rgba(20,252,235,0.2)] text-[var(--text-primary)] font-[family-name:var(--font-mono)] min-h-[44px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => setExportLoopCount((n) => Math.min(32, n + 1))}
                className="w-10 h-10 flex items-center justify-center bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#14FCEB] hover:text-[#14FCEB] text-lg font-[800]"
              >
                +
              </button>
            </div>
            <div className="cyber-mono text-[11px] text-[var(--text-faint)] mt-2 text-right">
              ~{((progression.length * (settings.timeSignature === 6 ? 3 : settings.timeSignature) * settings.barsPerChord * (60 / settings.bpm) * exportLoopCount)).toFixed(1)}s total
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <button
              onClick={exportWav}
              disabled={exportStatus === "rendering" || progression.length === 0}
              className="w-full bg-[#14FCEB] text-[#0D1117] py-3 font-[800] uppercase text-sm tracking-widest transition-all min-h-[44px] hover:shadow-[0_0_20px_rgba(20,252,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exportStatus === "rendering" ? "RENDERING..." : "EXPORT WAV"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingChord} onOpenChange={(open) => !open && setEditingChord(null)}>
        <DialogContent className="bg-[var(--base-panel)] border-[#C0FC14]/30 text-[var(--text-primary)] max-w-[90vw] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#C0FC14] cyber-mono cyber-glow-text">EDIT CHORD</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 font-[family-name:var(--font-mono)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="cyber-mono text-[14px] text-[var(--text-dim)] mb-2 block">ROOT NOTE</label>
                <select
                  className="w-full bg-[var(--base-card)] border border-[var(--base-border)] px-4 py-3 text-base font-[700] focus:outline-none focus:border-[#C0FC14] focus:shadow-[0_0_8px_rgba(192,252,20,0.2)] text-[var(--text-primary)] appearance-none font-[family-name:var(--font-mono)] min-h-[44px]"
                  value={editingChord?.root}
                  onChange={(e) => setEditingChord(prev => prev ? { ...prev, root: e.target.value } : null)}
                >
                  {NOTES.map(note => (
                    <option key={note} value={note}>{note}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="cyber-mono text-[14px] text-[var(--text-dim)] mb-2 block">CHORD TYPE</label>
                <select
                  className="w-full bg-[var(--base-card)] border border-[var(--base-border)] px-4 py-3 text-base font-[700] focus:outline-none focus:border-[#C0FC14] focus:shadow-[0_0_8px_rgba(192,252,20,0.2)] text-[var(--text-primary)] appearance-none font-[family-name:var(--font-mono)] min-h-[44px]"
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
              className="w-full bg-[#FF6B2B] text-[#0D1117] py-3 font-[800] uppercase text-sm tracking-widest transition-all min-h-[44px] hover:shadow-[0_0_20px_rgba(255,107,43,0.4)]"
            >
              UPDATE CHORD
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Menu Modal */}
      <Dialog open={configModalOpen} onOpenChange={(open) => { if (!open) setConfigModalOpen(false) }}>
        <DialogContent className="bg-[var(--base-panel)] border-[#C0FC14]/30 text-[var(--text-primary)] max-w-[95vw] md:max-w-xl p-0 overflow-hidden" showCloseButton={true}>
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-[var(--base-border)]">
            <DialogTitle className="text-[#C0FC14] cyber-mono cyber-glow-text tracking-widest text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              CONFIG
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 font-[family-name:var(--font-mono)]">
            {/* Theme */}
            <button
              onClick={() => {
                setConfigModalOpen(false)
                const isLight = document.documentElement.classList.contains("light")
                const next = isLight ? "dark" : "light"
                document.documentElement.classList.toggle("light", next === "light")
                localStorage.setItem("theme", next)
              }}
              className="flex flex-col items-center justify-center gap-2 p-5 bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#C0FC14] hover:shadow-[0_0_16px_rgba(192,252,20,0.12)] hover:text-[#C0FC14] transition-all rounded min-h-[120px] group"
            >
              <Sun className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[#C0FC14] transition-colors" />
              <div className="text-sm font-[700] group-hover:text-[#C0FC14]">Theme</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Dark / Light</div>
            </button>

            {/* Copy */}
            <button
              onClick={() => { exportProgression(); setConfigModalOpen(false) }}
              className="flex flex-col items-center justify-center gap-2 p-5 bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#C0FC14] hover:shadow-[0_0_16px_rgba(192,252,20,0.12)] hover:text-[#C0FC14] transition-all rounded min-h-[120px] group"
            >
              <Copy className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[#C0FC14] transition-colors" />
              <div className="text-sm font-[700] group-hover:text-[#C0FC14]">Copy</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Progression as text</div>
            </button>

            {/* Save */}
            <button
              onClick={() => { saveProgression(); setConfigModalOpen(false) }}
              className="flex flex-col items-center justify-center gap-2 p-5 bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#C0FC14] hover:shadow-[0_0_16px_rgba(192,252,20,0.12)] hover:text-[#C0FC14] transition-all rounded min-h-[120px] group"
            >
              <Save className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[#C0FC14] transition-colors" />
              <div className="text-sm font-[700] group-hover:text-[#C0FC14]">Save</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Store in library</div>
            </button>

            {/* MIDI */}
            <button
              onClick={() => { exportMidi(); setConfigModalOpen(false) }}
              className="flex flex-col items-center justify-center gap-2 p-5 bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#2B7FFF] hover:shadow-[0_0_16px_rgba(43,127,255,0.12)] hover:text-[#2B7FFF] transition-all rounded min-h-[120px] group"
            >
              <Download className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[#2B7FFF] transition-colors" />
              <div className="text-sm font-[700] group-hover:text-[#2B7FFF]">MIDI</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">.mid file download</div>
            </button>

            {/* WAV */}
            <button
              onClick={() => { setConfigModalOpen(false); setExportModalOpen(true) }}
              className="flex flex-col items-center justify-center gap-2 p-5 bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#14FCEB] hover:shadow-[0_0_16px_rgba(20,252,235,0.12)] hover:text-[#14FCEB] transition-all rounded min-h-[120px] group"
            >
              <Music className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[#14FCEB] transition-colors" />
              <div className="text-sm font-[700] group-hover:text-[#14FCEB]">WAV</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Audio file render</div>
            </button>

            {/* Reset */}
            <button
              onClick={() => { resetSettings(); setConfigModalOpen(false) }}
              className="flex flex-col items-center justify-center gap-2 p-5 bg-[var(--base-card)] border border-[var(--base-border)] text-[var(--text-primary)] hover:border-[#FF2D7C] hover:shadow-[0_0_16px_rgba(255,45,124,0.12)] hover:text-[#FF2D7C] transition-all rounded min-h-[120px] group"
            >
              <RotateCcw className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[#FF2D7C] transition-colors" />
              <div className="text-sm font-[700] group-hover:text-[#FF2D7C]">Reset</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Default values</div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
