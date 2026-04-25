import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identifyPrimaryCta, validateCtaTarget } from '../src/cta.js';

test('identifyPrimaryCta prefers repeated CTA text', () => {
  const html = `
    <main>
      <a href="/demo">Watch demo</a>
      <a class="primary" href="/start">Get Started</a>
      <footer><a href="/join">Get Started</a></footer>
    </main>
  `;

  const result = identifyPrimaryCta(html);

  assert.equal(result.method, 'repeated_text');
  assert.equal(result.primary_cta_text, 'Get Started');
  assert.equal(result.primary_cta_href, '/start');
});

test('identifyPrimaryCta uses first above-fold CTA when no text repeats', () => {
  const html = `
    <header><a href="/contact">Contact</a></header>
    <main><a href="/start">Get Started</a></main>
  `;

  const result = identifyPrimaryCta(html);

  assert.equal(result.method, 'above_fold');
  assert.equal(result.primary_cta_text, 'Contact');
});

test('validateCtaTarget marks empty onclick handlers as failures', async () => {
  const cta = {
    primary_cta_text: 'Start',
    primary_cta_href: null,
    onclick: 'void(0)',
  };

  const result = await validateCtaTarget(cta, { baseUrl: 'http://127.0.0.1:3000' });

  assert.equal(result.status, 'fail');
  assert.match(result.message, /handler/i);
});
