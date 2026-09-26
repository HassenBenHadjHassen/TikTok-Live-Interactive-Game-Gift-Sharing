# Audio Assets Directory

This directory holds optional soundtrack music and sound effect files.

## Supported Soundtracks (Background Loops)
- `normal.mp3`: Ambient cyber synth during normal gameplay (PLAYING phase).
- `danger.mp3`: Tense rhythmic synth when Danger Level exceeds 40%.
- `chaos.mp3`: Fast, high-energy synth when Danger Level exceeds 70%.
- `apocalypse.mp3`: Urgent alarm / apocalyptic sirens during Universe mode.
- `death.mp3`: Dramatic sting played upon Snake death.

## Supported Sound Effects
- `gift.wav`: Played when a viewer gift arrives.
- `obstacle.wav`: Thud / cyber drop sound when an obstacle spawns.
- `bomb.wav`: High-pitched countdown beeps for bombs.
- `explosion.wav`: Deep punchy explosion boom.
- `lion.wav`: Hunter roar / threat sound.
- `universe.wav`: Cosmic warp / universe blast sound.
- `death.wav`: Snake destruction crunch / game over blast.
- `eat.wav`: Chomp / coin pickup sound.
- `speed_up.wav`: Turbo engine rev / acceleration sweep.

> **Note:** The game includes a built-in **Web Audio API Procedural Synthesizer** that automatically generates high-quality sound effects if these audio files are absent! Any audio files placed here will automatically take precedence.
