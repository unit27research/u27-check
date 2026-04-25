import * as cheerio from 'cheerio';
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
    const $ = cheerio.load(html, { withStartIndices: true });
    const ctas = extractCtas($);
    const uniqueCtaTexts = unique(ctas.map((cta) => cta.text).filter(Boolean));

    if (uniqueCtaTexts.length >= 5) {
      observations.push(`${uniqueCtaTexts.length} different CTAs detected (no dominant action)`);
    }

    const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
    if (h1 && !CONCRETE_NOUNS.some((noun) => h1.toLowerCase().includes(noun))) {
      observations.push('Homepage H1 may not include a concrete product noun');
    }

    if (ctas.length > 0 && ctaIdentification?.method !== 'above_fold' && !ctas.some((cta) => cta.aboveFold)) {
      observations.push('No primary action appears above the fold heuristic');
    }

    if (!hasProofSurface($, readme)) {
      observations.push('No screenshot, demo link, metrics, video, or GitHub proof surface found');
    }
  }

  if (readme && !/(usage|example|getting started)/i.test(readme)) {
    observations.push('README is missing usage examples or a Getting Started section');
  }

  return observations;
}

function hasProofSurface($, readme) {
  const pageText = $.root().text();
  const combined = `${pageText}\n${readme}`;
  return Boolean(
    $('img, video').length > 0 ||
      /demo|github\.com|screenshot|metric|customers?|users?|case study|video/i.test(combined),
  );
}
