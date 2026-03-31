const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTemplateSections,
  normalizeAnimationConfig,
  normalizeGlobalStyles,
} = require('../services/templateService');

test('normalizeTemplateSections keeps unique ordered supported sections', () => {
  const sections = normalizeTemplateSections([
    { type: 'hero', order: 2 },
    { type: 'about', order: 0 },
    { type: 'hero', order: 1 },
    { type: 'unsupported', order: 3 },
  ]);

  assert.equal(sections.length, 2);
  assert.equal(sections[0].type, 'about');
  assert.equal(sections[1].type, 'hero');
  assert.equal(sections[0].order, 0);
  assert.equal(sections[1].order, 1);
});

test('normalizeAnimationConfig applies safe defaults', () => {
  const animation = normalizeAnimationConfig({ type: 'zoom', duration: -1 });

  assert.equal(animation.type, 'fade');
  assert.equal(animation.trigger, 'load');
  assert.equal(animation.duration, 0);
  assert.equal(animation.delay, 0);
});

test('normalizeGlobalStyles falls back to config theme when missing', () => {
  const normalized = normalizeGlobalStyles(
    {},
    {
      theme: {
        colors: { primary: '#123456', secondary: '#654321', background: '#ffffff' },
        fonts: { heading: 'Poppins', body: 'Lato' },
      },
    }
  );

  assert.equal(normalized.colors.primary, '#123456');
  assert.equal(normalized.fonts.heading, 'Poppins');
});
