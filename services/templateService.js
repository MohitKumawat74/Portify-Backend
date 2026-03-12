const Template = require('../models/Template');
const Theme = require('../models/Theme');

// ─── Template Operations ─────────────────────────────────────────────────────

const createTemplate = async (data, adminId) => {
  return Template.create({ ...data, createdBy: adminId });
};

const updateTemplate = async (templateId, data) => {
  const template = await Template.findByIdAndUpdate(templateId, data, {
    new: true,
    runValidators: true,
  });

  if (!template) {
    const error = new Error('Template not found.');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

const deleteTemplate = async (templateId) => {
  const template = await Template.findByIdAndDelete(templateId);

  if (!template) {
    const error = new Error('Template not found.');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

const getAllTemplates = async ({ page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const [templates, total] = await Promise.all([
    Template.find({ isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Template.countDocuments({ isActive: true }),
  ]);
  return { templates, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getTemplateById = async (templateId) => {
  const template = await Template.findById(templateId);
  if (!template) {
    const error = new Error('Template not found.');
    error.statusCode = 404;
    throw error;
  }
  return template;
};

const toggleTemplate = async (templateId) => {
  const template = await Template.findById(templateId);
  if (!template) {
    const error = new Error('Template not found.');
    error.statusCode = 404;
    throw error;
  }
  template.isActive = !template.isActive;
  await template.save();
  return template;
};

// ─── Theme Operations ─────────────────────────────────────────────────────────

const createTheme = async (data, adminId) => {
  return Theme.create({ ...data, createdBy: adminId });
};

const updateTheme = async (themeId, data) => {
  const theme = await Theme.findByIdAndUpdate(themeId, data, {
    new: true,
    runValidators: true,
  });

  if (!theme) {
    const error = new Error('Theme not found.');
    error.statusCode = 404;
    throw error;
  }

  return theme;
};

const deleteTheme = async (themeId) => {
  const theme = await Theme.findByIdAndDelete(themeId);

  if (!theme) {
    const error = new Error('Theme not found.');
    error.statusCode = 404;
    throw error;
  }

  return theme;
};

const getAllThemes = async () => {
  return Theme.find({ isActive: true }).sort({ createdAt: -1 });
};

module.exports = {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllTemplates,
  getTemplateById,
  toggleTemplate,
  createTheme,
  updateTheme,
  deleteTheme,
  getAllThemes,
};
