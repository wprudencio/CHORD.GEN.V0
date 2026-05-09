<img width="1902" height="875" alt="image" src="https://github.com/user-attachments/assets/e8384d91-599e-4895-ad4e-9fc516fd035e" />

# CHORD.GEN.v0 /// Progression Composer

128 chord progression generator — hybrid instrument / terminal workstation. Dark cyberpunk UI, real‑time audio, MIDI export.

## Features

- **20+ musical styles** — Pop, Jazz, Lo‑Fi, Afrobeat, Synthwave, Bossanova, Metal, Classical, and more
- **12 synth engines** — Pad, Pluck, Keys, Strings, Organ, Bell, Bass, Lead, Brass, FM, Supersaw, Wobble
- **14 arpeggio/rhythm patterns** — Sustained, Pulse, Staccato, Arp Up/Down, Random, and more
- **14 drum patterns** — Basic, Hip‑Hop, House, Trap, DnB, Reggaeton, Shuffle, Click, None
- **17 scale modes** — Major, Minor, Dorian, Phrygian, Harmonic Minor, Blues, Chromatic, Hungarian, Japanese, Arabian, Persian, Bebop…
- **26 chord types** — maj7, min9, dom7, dim7, sus2, 7#9, 13th, m7b5, aug, and more
- **Real‑time audio engine** — Web Audio API with per‑voice envelopes, filter sweeps, chorus, FM, reverb convolution
- **MIDI export** — Download generated progression as standard MIDI file
- **Dark / Light theme** — Toggle button in header, persists across sessions
- **Save progressions** — LocalStorage‑backed library with load/delete
- **Edit chords** — Tap any chord to change root note or type
- **Keyboard shortcuts** — Space (play/stop), R (re‑generate), S (save)

## Tech Stack

- **Next.js 16** (App Router, static export)
- **React 19**
- **Tailwind CSS v4**
- **Web Audio API**
- **TypeScript**
- **cloudflare workers ready **

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Static output in `./out/`.

## License

MIT
