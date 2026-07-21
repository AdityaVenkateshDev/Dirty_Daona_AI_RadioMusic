import { NextRequest } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/music/compose';
const FALLBACK_AUDIO = '/sfx/knob-tick.mp3';

async function getFallbackAudio(request: NextRequest) {
  const fallbackUrl = new URL(FALLBACK_AUDIO, request.url).toString();
  const fallbackResponse = await fetch(fallbackUrl, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!fallbackResponse.ok) {
    return new Response('Fallback audio unavailable', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const arrayBuffer = await fallbackResponse.arrayBuffer();
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': fallbackResponse.headers.get('content-type') || 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.warn('ELEVENLABS_API_KEY is not configured, using fallback audio');
    return getFallbackAudio(request);
  }

  try {
    const url = new URL(request.url);
    const station = url.searchParams.get('station') ?? '102';
    const prompt = station === '100'
      ? 'Dark epic symphony with cinematic strings, low brass, and a slow dramatic build.'
      : 'Epic symphony with cinematic strings, percussion, and dramatic orchestral builds.';
    const response = await fetch(ELEVENLABS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt,
        musicLengthMs: 30000,
        modelId: 'music_v2',
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.error('ElevenLabs compose failed:', response.status, bodyText);
      return getFallbackAudio(request);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('ElevenLabs compose error:', error);
    return getFallbackAudio(request);
  }
}
