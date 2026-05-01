import { join } from 'node:path';
import { extractCtas } from './cta.js';
import { readTextFileIfExists, unique } from './utils.js';

const CONCRETE_NOUNS = [
  'tool',
  'app',
  'cli',
  'dashboard',
  'library',
  'platform',
  'service',
  'system',
  'assistant',
  'workflow',
  'template',
  'starter',
];

export async function collectObservations(repoPath, html, ctaIdentification) {
  const observations = [];
  const readme = await readTextFileIfExists(join(repoPath, 'README.md'));

  if (html) {
    const ctas = extractCtas(html);
    const uniqueCtaTexts = unique(ctas.map((cta) => cta.text).filter(Boolean));

    if (uniqueCtaTexts.length >= 5) {
      observations.push(`${uniqueCtaTexts.length} different CTAs detected (no dominant action)`);
    }

    const h1 = firstHeading(html);
    if (h1 && !CONCRETE_NOUNS.some((noun) => h1.toLowerCase().includes(noun))) {
      observations.push('Homepage H1 may not include a concrete product noun');
    }

    if (ctas.length > 0 && ctaIdentification?.method !== 'above_fold' && !ctas.some((cta) => cta.aboveFold)) {
      observations.push('No primary action appears above the fold heuristic');
    }

    if (!hasProofSurface(html, readme)) {
      observations.push('No screenshot, demo link, metrics, video, or GitHub proof surface found');
    }
  }

  if (readme && !/(usage|example|getting started)/i.test(readme)) {
    observations.push('README is missing usage examples or a Getting Started section');
  }

  return observations;
}

function firstHeading(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function hasProofSurface(html, readme) {
  const pageText = html.replace(/<[^>]+>/g, ' ');
  const combined = `${pageText}\n${readme}`;
  return Boolean(
    /<(img|video)\b/i.test(html) ||
      /demo|github\.com|screenshot|metric|customers?|users?|case study|video/i.test(combined),
  );
}
