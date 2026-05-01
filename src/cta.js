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

export function identifyPrimaryCta(html) {
  const ctas = extractCtas(html);

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

export function extractCtas(html = '') {
  const candidates = [];
  collectPairedElements(html, candidates, /<(a|button)([^>]*)>([\s\S]*?)<\/\1>/gi);
  collectPairedElements(html, candidates, /<([a-z0-9]+)([^>]*(?:role\s*=\s*["']button["']|onclick\s*=)[^>]*)>([\s\S]*?)<\/\1>/gi);
  collectInputElements(html, candidates);

  return candidates;
}

function collectPairedElements(html, candidates, pattern) {
  let match;
  while ((match = pattern.exec(html))) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2] || '');
    if (!isClickable(tag, attrs)) continue;
    candidates.push(candidateFor(html, tag, attrs, match[3] || '', match.index, candidates.length));
  }
}

function collectInputElements(html, candidates) {
  const inputPattern = /<input([^>]*)\/?>/gi;
  let match;
  while ((match = inputPattern.exec(html))) {
    const attrs = parseAttributes(match[1] || '');
    if (!isClickable('input', attrs)) continue;
    candidates.push(candidateFor(html, 'input', attrs, '', match.index, candidates.length));
  }
}

function isClickable(tag, attrs) {
  return Boolean(
    attrs.href ||
      attrs.onclick ||
      attrs.role === 'button' ||
      tag === 'button' ||
      (tag === 'input' && ['submit', 'button'].includes((attrs.type || '').toLowerCase())),
  );
}

function candidateFor(html, tag, attrs, body, startIndex, index) {
  return {
    text: normalizeText(stripTags(body) || attrs.value || attrs['aria-label'] || attrs.title || '') || fallbackText(tag, attrs.href, attrs.onclick),
    href: attrs.href || null,
    onclick: attrs.onclick || null,
    selector: selectorFor(tag, attrs, index),
    startIndex,
    aboveFold: startIndex < 5_000 || hasAboveFoldContext(html, startIndex),
  };
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

function parseAttributes(rawAttrs) {
  const attrs = {};
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = attrPattern.exec(rawAttrs))) {
    attrs[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attrs;
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, ' ');
}

function fallbackText(tag, href, onclick) {
  if (href) return href;
  if (onclick) return 'onclick';
  return tag || 'clickable';
}

function selectorFor(tag, attrs, index) {
  const id = attrs.id;
  const className = attrs.class?.trim().split(/\s+/).filter(Boolean).join('.');
  if (id) return `${tag}#${id}`;
  if (className) return `${tag}.${className}`;
  return `${tag}:eq(${index})`;
}

function hasAboveFoldContext(html, startIndex) {
  const prefix = html.slice(Math.max(0, startIndex - 500), startIndex).toLowerCase();
  return /<(header|nav|main)\b|class=["'][^"']*hero|id=["'][^"']*hero/.test(prefix);
}
