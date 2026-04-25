import * as cheerio from 'cheerio';

const ACTION_VERBS = [
  'start',
  'try',
  'demo',
  'sign up',
  'signup',
  'get started',
  'launch',
  'run',
  'install',
  'join',
  'book',
  'contact',
  'begin',
  'explore',
];

const CLICKABLE_SELECTOR = 'a[href], button, input[type="submit"], input[type="button"], [role="button"], [onclick]';

export function identifyPrimaryCta(html) {
  const $ = cheerio.load(html, { withStartIndices: true });
  const ctas = extractCtas($);

  if (ctas.length === 0) {
    return {
      method: 'none',
      reason: 'no actionable CTA found',
      primary_cta_text: null,
      primary_cta_href: null,
      primary_cta_selector: null,
      total_ctas_detected: 0,
      all_cta_texts: [],
    };
  }

  const repeated = firstRepeatedText(ctas);
  if (repeated) {
    const cta = ctas.find((candidate) => candidate.text === repeated);
    return resultFor('repeated_text', 'CTA text appears 2+ times', cta, ctas);
  }

  const aboveFold = ctas.find((candidate) => candidate.aboveFold);
  if (aboveFold) {
    return resultFor('above_fold', 'first CTA in source-order above-fold heuristic', aboveFold, ctas);
  }

  const actionVerb = ctas.find((candidate) => hasActionVerb(candidate.text));
  if (actionVerb) {
    return resultFor('action_verb', 'CTA text contains action verb', actionVerb, ctas);
  }

  return resultFor('first_clickable', 'first clickable element in DOM', ctas[0], ctas);
}

export async function validateCtaTarget(cta, options = {}) {
  if (!cta || cta.method === 'none') {
    return {
      status: 'fail',
      message: 'no actionable CTA found',
      evidence: 'CTA parser returned zero candidates.',
    };
  }

  if (cta.primary_cta_href) {
    return validateHref(cta.primary_cta_href, options.baseUrl, options.fetchImpl ?? fetch);
  }

  if (cta.onclick) {
    if (isEmptyHandler(cta.onclick)) {
      return {
        status: 'fail',
        message: 'onclick handler is missing or empty',
        evidence: cta.onclick,
      };
    }

    return {
      status: 'pass',
      message: 'onclick handler is defined',
      evidence: cta.onclick,
    };
  }

  return {
    status: 'fail',
    message: 'CTA has no href or onclick handler',
    evidence: cta.primary_cta_selector,
  };
}

export function extractCtas($) {
  const candidates = [];

  $(CLICKABLE_SELECTOR).each((index, element) => {
    const node = $(element);
    const text = normalizeText(node.text() || node.attr('value') || node.attr('aria-label') || node.attr('title') || '');
    const href = node.attr('href') || null;
    const onclick = node.attr('onclick') || null;
    const startIndex = element.startIndex ?? Number.MAX_SAFE_INTEGER;

    candidates.push({
      text: text || fallbackText(element, href, onclick),
      href,
      onclick,
      selector: selectorFor(element, node, index),
      startIndex,
      aboveFold: startIndex < 5_000 || hasAboveFoldAncestor(node),
    });
  });

  return candidates;
}

async function validateHref(href, baseUrl, fetchImpl) {
  if (href.startsWith('#')) {
    return {
      status: 'pass',
      message: `${href} points to an in-page anchor`,
      evidence: href,
      targetStatus: 200,
    };
  }

  if (/^(mailto|tel):/i.test(href)) {
    return {
      status: 'pass',
      message: `${href} uses a supported external action`,
      evidence: href,
      targetStatus: 200,
    };
  }

  if (!baseUrl && !/^https?:\/\//i.test(href)) {
    return {
      status: 'fail',
      message: `${href} could not be resolved without a base URL`,
      evidence: href,
    };
  }

  const target = new URL(href, baseUrl).toString();

  try {
    const response = await fetchImpl(target, { method: 'GET', redirect: 'follow' });
    if (response.status >= 400) {
      return {
        status: 'fail',
        message: `${new URL(target).pathname || target} returned ${response.status}`,
        evidence: target,
        targetStatus: response.status,
      };
    }

    return {
      status: 'pass',
      message: `"${href}" returned HTTP ${response.status}`,
      evidence: target,
      targetStatus: response.status,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `${href} could not be reached`,
      evidence: error.message,
    };
  }
}

function resultFor(method, reason, cta, ctas) {
  return {
    method,
    reason,
    primary_cta_text: cta.text,
    primary_cta_href: cta.href,
    primary_cta_selector: cta.selector,
    onclick: cta.onclick,
    total_ctas_detected: ctas.length,
    all_cta_texts: ctas.map((candidate) => candidate.text),
  };
}

function firstRepeatedText(ctas) {
  const counts = new Map();
  for (const cta of ctas) {
    if (!cta.text) continue;
    counts.set(cta.text, (counts.get(cta.text) ?? 0) + 1);
  }
  return ctas.find((cta) => counts.get(cta.text) >= 2)?.text ?? null;
}

function hasActionVerb(text = '') {
  const lower = text.toLowerCase();
  return ACTION_VERBS.some((verb) => lower.includes(verb));
}

function isEmptyHandler(value = '') {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === 'void(0)' || normalized === 'javascript:void(0)' || normalized === 'return false;';
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function fallbackText(element, href, onclick) {
  if (href) return href;
  if (onclick) return 'onclick';
  return element.tagName ?? 'clickable';
}

function selectorFor(element, node, index) {
  const tag = element.tagName ?? 'element';
  const id = node.attr('id');
  const className = node.attr('class')?.trim().split(/\s+/).filter(Boolean).join('.');
  if (id) return `${tag}#${id}`;
  if (className) return `${tag}.${className}`;
  return `${tag}:eq(${index})`;
}

function hasAboveFoldAncestor(node) {
  return node.parents('header, nav, main, [class*="hero"], [id*="hero"]').length > 0;
}
