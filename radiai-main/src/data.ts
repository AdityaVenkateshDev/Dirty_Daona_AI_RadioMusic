export interface Song {
  url: string;
  duration: number;
}

// A larger set of varied public sample tracks. These will be proxied via /api/proxy
const SAMPLE_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
];

// Map each station to a unique subset of tracks so stations sound distinct
export const stations: Record<string, { name: string; songs: Song[] }> = {
  '88': {
    name: 'Lofi Beats',
    songs: [
      { url: SAMPLE_TRACKS[0], duration: 120 },
      { url: SAMPLE_TRACKS[1], duration: 120 },
    ],
  },
  '90': {
    name: 'Chillhop',
    songs: [
      { url: SAMPLE_TRACKS[2], duration: 120 },
      { url: SAMPLE_TRACKS[3], duration: 120 },
    ],
  },
  '92': {
    name: 'Synthwave',
    songs: [
      { url: SAMPLE_TRACKS[4], duration: 120 },
      { url: SAMPLE_TRACKS[5], duration: 120 },
    ],
  },
  '94': {
    name: 'Jazz',
    songs: [
      { url: SAMPLE_TRACKS[6], duration: 92 },
      { url: SAMPLE_TRACKS[7], duration: 105 },
    ],
  },
  '96': {
    name: 'Indie',
    songs: [
      { url: SAMPLE_TRACKS[8], duration: 120 },
      { url: SAMPLE_TRACKS[9], duration: 120 },
    ],
  },
  '98': {
    name: 'Ambient',
    songs: [
      { url: SAMPLE_TRACKS[10], duration: 120 },
      { url: SAMPLE_TRACKS[11], duration: 120 },
    ],
  },
  '100': {
    name: 'Experimental',
    songs: [
      { url: '/api/elevenlabs/track?station=100', duration: 30 },
      { url: SAMPLE_TRACKS[2], duration: 96 },
    ],
  },
  '102': {
    name: 'Hypno',
    songs: [
      { url: '/api/elevenlabs/track?station=102', duration: 30 },
      { url: SAMPLE_TRACKS[4], duration: 96 },
    ],
  },
};
