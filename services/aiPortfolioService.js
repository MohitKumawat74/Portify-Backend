const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { getUserPlanContext } = require('./planService');

const SUPPORTED_SECTION_TYPES = ['hero', 'about', 'skills', 'projects', 'contact'];

const parseJsonPayload = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (_innerError) {
      return null;
    }
  }
};

const normalizeGeneratedSections = (payload = {}) => {
  const incomingSections = Array.isArray(payload.sections) ? payload.sections : [];
  const normalized = [];
  let order = 0;

  for (const section of incomingSections) {
    const type = String(section?.type || '').trim().toLowerCase();
    if (!SUPPORTED_SECTION_TYPES.includes(type)) {
      continue;
    }

    const content = section?.content;
    if (!content || typeof content !== 'object') {
      continue;
    }

    normalized.push({
      id: `${type}_${order + 1}`,
      type,
      order: order++,
      content,
    });
  }

  return normalized;
};

const fallbackSectionsFromInput = (input = {}) => {
  const name = String(input.name || 'Developer').trim();
  const role = String(input.role || 'Software Developer').trim();
  const experience = String(input.experience || '').trim();
  const skills = Array.isArray(input.skills) ? input.skills.filter(Boolean) : [];
  const projects = Array.isArray(input.projects) ? input.projects : [];

  const sections = [
    {
      id: 'hero_1',
      type: 'hero',
      order: 0,
      content: {
        title: `Hi, I'm ${name}`,
        subtitle: role,
        description: `I build reliable and scalable products with a focus on clean architecture and measurable business impact.`,
      },
    },
    {
      id: 'about_1',
      type: 'about',
      order: 1,
      content: {
        summary: experience || `${name} is a ${role} focused on delivering high quality software experiences.`,
      },
    },
    {
      id: 'skills_1',
      type: 'skills',
      order: 2,
      content: {
        items: skills,
      },
    },
    {
      id: 'projects_1',
      type: 'projects',
      order: 3,
      content: projects.map((project, index) => ({
        title: project.title || `Project ${index + 1}`,
        description: project.description || 'Project details coming soon.',
        link: project.link || '',
        techStack: Array.isArray(project.techStack) ? project.techStack : [],
      })),
    },
    {
      id: 'contact_1',
      type: 'contact',
      order: 4,
      content: {
        headline: `Let's build something great together`,
        cta: 'Reach out for collaboration opportunities.',
      },
    },
  ];

  return { sections };
};

const getCurrentPeriodStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const consumeAiGenerationQuota = async (userId) => {
  const user = await User.findById(userId).select('plan subscription aiUsage');
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  const { plan, limits } = getUserPlanContext(user);
  if (plan === 'pro' || !Number.isFinite(limits.maxAiGenerations)) {
    return { plan, remaining: Number.POSITIVE_INFINITY };
  }

  const currentPeriodStart = getCurrentPeriodStart();
  const usage = user.aiUsage || {};
  const periodStart = usage.periodStart ? new Date(usage.periodStart) : new Date(0);
  const currentCount = periodStart < currentPeriodStart ? 0 : Number(usage.count) || 0;

  if (currentCount >= limits.maxAiGenerations) {
    throw new ApiError(
      403,
      'AI generation limit exceeded for free plan. Upgrade to Pro for unlimited access.',
      'PLAN_LIMIT_EXCEEDED'
    );
  }

  user.aiUsage = {
    count: currentCount + 1,
    periodStart: currentPeriodStart,
  };

  await user.save();

  return {
    plan,
    remaining: Math.max(0, limits.maxAiGenerations - (currentCount + 1)),
  };
};

const extractOpenAiText = (responseJson = {}) => {
  if (typeof responseJson.output_text === 'string' && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }

  const outputItems = Array.isArray(responseJson.output) ? responseJson.output : [];
  for (const item of outputItems) {
    const contentItems = Array.isArray(item.content) ? item.content : [];
    for (const contentItem of contentItems) {
      if (contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
        return contentItem.text;
      }
    }
  }

  if (Array.isArray(responseJson.choices)) {
    const firstChoice = responseJson.choices[0];
    const content = firstChoice?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
  }

  return '';
};

const generateWithOpenAi = async (input = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = [
    'Generate a professional portfolio in strict JSON format.',
    'Output only valid JSON.',
    'Use this shape:',
    '{"sections":[{"type":"hero|about|skills|projects|contact","content":{}}]}',
    'Ensure sections array is ordered and complete when possible.',
    `Name: ${input.name}`,
    `Role: ${input.role}`,
    `Skills: ${(input.skills || []).join(', ')}`,
    `Experience: ${input.experience}`,
    `Projects: ${JSON.stringify(input.projects || [])}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text:
                'You generate structured JSON only for portfolio sections. Never output markdown. Never output prose outside JSON.',
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorPayload}`);
  }

  const json = await response.json();
  const text = extractOpenAiText(json);
  const parsed = parseJsonPayload(text);

  if (!parsed) {
    throw new Error('OpenAI returned invalid JSON payload');
  }

  const sections = normalizeGeneratedSections(parsed);
  if (!sections.length) {
    throw new Error('OpenAI returned empty structured sections');
  }

  return { sections };
};

const generatePortfolioSections = async (input = {}) => {
  try {
    return await generateWithOpenAi(input);
  } catch (_error) {
    return fallbackSectionsFromInput(input);
  }
};

module.exports = {
  SUPPORTED_SECTION_TYPES,
  consumeAiGenerationQuota,
  generatePortfolioSections,
  fallbackSectionsFromInput,
};
