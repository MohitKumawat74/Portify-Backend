const extractArrayCount = (value) => {
  if (Array.isArray(value)) {
    return value.length;
  }
  return 0;
};

const countProjectsFromContent = (content) => {
  if (!content || typeof content !== 'object') return 0;

  const directProjectsCount = extractArrayCount(content.projects);
  if (directProjectsCount > 0) return directProjectsCount;

  const sectionProjectsCount = extractArrayCount(content.items) || extractArrayCount(content.list);
  if (sectionProjectsCount > 0) return sectionProjectsCount;

  return 0;
};

const countProjectsFromSections = (sections = []) => {
  if (!Array.isArray(sections)) return 0;

  const projectsSection = sections.find(
    (section) => section && String(section.type || '').toLowerCase() === 'projects'
  );

  if (!projectsSection) return 0;

  if (Array.isArray(projectsSection.content)) {
    return projectsSection.content.length;
  }

  return countProjectsFromContent(projectsSection.content || {});
};

const getPortfolioProjectCount = (portfolioLike = {}) => {
  const contentCount = countProjectsFromContent(portfolioLike.content);
  const sectionsCount = countProjectsFromSections(portfolioLike.sections);
  return Math.max(contentCount, sectionsCount);
};

const buildEffectivePortfolioPayload = (existingPortfolio, incomingPayload = {}) => {
  return {
    content:
      incomingPayload.content !== undefined
        ? incomingPayload.content
        : existingPortfolio
          ? existingPortfolio.content
          : {},
    sections:
      incomingPayload.sections !== undefined
        ? incomingPayload.sections
        : existingPortfolio
          ? existingPortfolio.sections
          : [],
    templateId:
      incomingPayload.templateId !== undefined
        ? incomingPayload.templateId
        : existingPortfolio
          ? existingPortfolio.templateId
          : null,
  };
};

module.exports = {
  getPortfolioProjectCount,
  buildEffectivePortfolioPayload,
};
