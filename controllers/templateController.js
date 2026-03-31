const {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllTemplates,
  getTemplateBySlug,
  toggleTemplate,
} = require('../services/templateService');
const { resolveUserPlan } = require('../config/planLimits');

const create = async (req, res, next) => {
  try {
    const template = await createTemplate(req.body, req.user._id);
    res.status(201).json({
      success: true,
      message: 'Template created',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const template = await updateTemplate(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Template updated',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deleteTemplate(req.params.id);
    res.status(200).json({ success: true, message: 'Template deleted', data: null });
  } catch (error) {
    next(error);
  }
};

// GET /templates — Public, paginated
const getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const { templates, total, totalPages } = await getAllTemplates({ page, limit });
    res.status(200).json({ data: templates, total, page, limit, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /templates/:slug — Public
const getBySlug = async (req, res, next) => {
  try {
    const plan = req.user ? resolveUserPlan(req.user) : 'free';
    const template = await getTemplateBySlug(req.params.slug, plan);
    res.status(200).json({ success: true, message: 'Template fetched', data: template });
  } catch (error) {
    next(error);
  }
};

// PATCH /templates/:id/toggle — Admin Only
const toggleStatus = async (req, res, next) => {
  try {
    const template = await toggleTemplate(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Template status toggled',
      data: { id: template._id, isActive: template.isActive },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, update, remove, getAll, getBySlug, toggleStatus };

