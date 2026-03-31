const test = require('node:test');
const assert = require('node:assert/strict');

const { generatePortfolioSchema } = require('../utils/schemas');

test('AI generate schema accepts empty-string form payload and normalizes values', () => {
  const payload = {
    name: '',
    role: '',
    skills: '',
    experience: '',
  };

  const { error, value } = generatePortfolioSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  assert.equal(error, undefined);
  assert.equal(value.name, 'Developer');
  assert.equal(value.role, 'Software Developer');
  assert.deepEqual(value.skills, []);
  assert.equal(value.experience, '');
  assert.deepEqual(value.projects, []);
});

test('AI generate schema converts comma-separated skills string into array', () => {
  const payload = {
    name: 'John',
    role: 'Engineer',
    skills: 'Node.js, Express, MongoDB',
    experience: 'Built APIs',
  };

  const { error, value } = generatePortfolioSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  assert.equal(error, undefined);
  assert.deepEqual(value.skills, ['Node.js', 'Express', 'MongoDB']);
});
