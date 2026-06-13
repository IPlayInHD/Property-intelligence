/**
 * Maison Scorpius promotional video generator.
 * Run locally: node gen-maison-scorpius.mjs
 * Requires: OPENAI_API_KEY and ELEVENLABS_API_KEY in .env or environment.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load from env (set in .env or pass via CLI)
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

if (!OPENAI_KEY || !ELEVEN_KEY) {
  console.error('Missing OPENAI_API_KEY or ELEVENLABS_API_KEY in environment.');
  process.exit(1);
}

const SLUG = 'maison-scorpius';
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1792;

const slides = [
  {
    text: "Maison Scorpius was born in Montreal with a single belief: luxury should never come at a cost to the earth.",
    imageDescription: "An elegant Montreal cityscape at twilight reflected in a perfectly cut diamond held between two fingers, warm golden light refracting through its facets against a dark velvet background, ultra-luxurious product photography style."
  },
  {
    text: "We create lab-grown diamonds that are chemically, physically, and optically identical to mined stones — crafted by science, not excavation.",
    imageDescription: "A stunning macro photograph inside a high-tech diamond growth chamber, brilliant crystal formations emerging under blue-white plasma light, clean futuristic lab environment, science meets luxury aesthetic."
  },
  {
    text: "Every diamond we offer carries the same breathtaking fire and brilliance you'd find in nature, without a single gram of earth disturbed.",
    imageDescription: "An extraordinary close-up of a flawless round-cut lab-grown diamond on a white marble surface, rainbow light dispersion fanning across the frame, crystal clarity, editorial jewelry photography."
  },
  {
    text: "Our stones are certified conflict-free and ethically sourced, because true beauty should never carry a hidden price.",
    imageDescription: "A pristine white certificate of diamond authenticity beside a sparkling loose diamond on a velvet tray, soft natural light, minimalist luxury backdrop with a subtle green leaf symbolizing ethical sourcing."
  },
  {
    text: "From classic solitaire engagement rings to bold statement pieces, our collections are designed for those who refuse to compromise.",
    imageDescription: "A flat-lay of three exquisite Maison Scorpius jewelry pieces — a solitaire engagement ring, a tennis bracelet, and a pendant — on dark navy velvet, dramatic side lighting creating depth and sparkle."
  },
  {
    text: "Born in Montreal, Maison Scorpius ships internationally — bringing Canadian elegance to jewelry lovers across the globe.",
    imageDescription: "An aerial view of Montreal's iconic skyline at golden hour, overlaid with a subtle glowing world map showing shipping routes, blended with a diamond-bright overlay, cinematic and aspirational."
  },
  {
    text: "Each purchase comes with full certification, ensuring your stone's origin, quality, and cut grade.",
    imageDescription: "An open luxury gift box revealing a stunning diamond ring nestled in white silk, accompanied by a grading certificate and a handwritten note, warm natural light, premium unboxing experience aesthetic."
  },
  {
    text: "The most brilliant choice is one you can feel proud of. Discover Maison Scorpius — luxury, reimagined.",
    imageDescription: "A confident woman wearing a Maison Scorpius diamond ring and necklace in a sophisticated Montreal setting, soft bokeh background, the jewelry catching the light brilliantly, aspirational lifestyle photography."
  }
];

function getDir(...segments) {
  const p = path.join(__dirname, 'public', 'content', SLUG, ...segments);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

async function generateImage(prompt, outPath, attempt = 0) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, size: `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`, response_format: 'b64_json' }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); return generateImage(prompt, outPath, attempt + 1); }
    throw new Error(`DALL-E error: ${err}`);
  }
  const data = await res.json();
  fs.writeFileSync(outPath, Buffer.from(data.data[0].b64_json, 'base64'));
}

async function generateVoice(text, outPath) {
  const client = new ElevenLabsClient({ environment: 'https://api.elevenlabs.io', apiKey: ELEVEN_KEY });
  const data = await client.textToSpeech.convertWithTimestamps(VOICE_ID, { text });
  if (!data.alignment || !data.alignment.characterEndTimesSeconds.length) throw new Error('ElevenLabs missing timestamps');
  fs.writeFileSync(outPath, Buffer.from(data.audioBase64, 'base64'));
  return data.alignment;
}

function createTimeline(content) {
  const timeline = { shortTitle: 'Maison Scorpius', elements: [], text: [], audio: [] };
  let durationMs = 0;
  let zoomIn = true;

  for (const item of content) {
    const ends = item.audioTimestamps.characterEndTimesSeconds;
    const starts = item.audioTimestamps.characterStartTimesSeconds;
    const lenMs = Math.ceil(ends[ends.length - 1] * 1000);

    timeline.elements.push({ startMs: durationMs, endMs: durationMs + lenMs, imageUrl: item.uid, enterTransition: 'blur', exitTransition: 'blur', animations: [{ type: 'scale', from: zoomIn ? 1.5 : 1, to: zoomIn ? 1 : 1.5, startMs: 0, endMs: lenMs }] });
    timeline.audio.push({ startMs: durationMs, endMs: durationMs + lenMs, audioUrl: item.uid });

    const MaxChars = 14;
    let currentText = '';
    let currentStartMs = starts[0] * 1000 + durationMs;
    let currentEndMs = durationMs;
    let charIdx = 0;

    for (const word of item.text.split(' ')) {
      if ((currentText + word).length > MaxChars) {
        if (currentText.trim()) timeline.text.push({ startMs: currentStartMs, endMs: currentEndMs, text: currentText.trim(), position: 'center', animations: [{ type: 'scale', from: 0.8, to: 1, startMs: 0, endMs: 300 }] });
        currentText = '';
        currentStartMs = currentEndMs;
      }
      currentText += `${word} `;
      for (let i = 0; i < word.length; i++) { currentEndMs = ends[charIdx] * 1000 + durationMs; charIdx++; }
      if (charIdx < ends.length) { currentEndMs = ends[charIdx] * 1000 + durationMs; charIdx++; }
    }
    if (currentText.trim()) timeline.text.push({ startMs: currentStartMs, endMs: ends[ends.length - 1] * 1000 + durationMs, text: currentText.trim(), position: 'center', animations: [{ type: 'scale', from: 0.8, to: 1, startMs: 0, endMs: 300 }] });

    durationMs += lenMs;
    zoomIn = !zoomIn;
  }
  return timeline;
}

async function main() {
  console.log('🔷 Generating Maison Scorpius promotional video...\n');
  const contentDir = getDir();
  const imagesDir = getDir('images');
  const audioDir = getDir('audio');
  const content = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const uid = `ms-slide-${String(i + 1).padStart(2, '0')}`;
    console.log(`[${i + 1}/${slides.length}] Generating image...`);
    await generateImage(slide.imageDescription, path.join(imagesDir, `${uid}.png`));
    console.log(`[${i + 1}/${slides.length}] Generating voice...`);
    const audioTimestamps = await generateVoice(slide.text, path.join(audioDir, `${uid}.mp3`));
    content.push({ text: slide.text, imageDescription: slide.imageDescription, uid, audioTimestamps });
    console.log(`[${i + 1}/${slides.length}] ✓\n`);
  }

  const timeline = createTimeline(content);
  fs.writeFileSync(path.join(contentDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(contentDir, 'descriptor.json'), JSON.stringify({ shortTitle: 'Maison Scorpius', content }, null, 2));

  console.log('✅ Done! Now run:\n   npm run dev\n   # then: npx remotion render');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
