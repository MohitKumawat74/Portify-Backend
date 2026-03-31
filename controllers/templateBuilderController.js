const {
  createTemplate,
  updateTemplate,
  reorderTemplateSections,
  addTemplateSection,
  removeTemplateSection,
} = require('../services/templateService');

const createAdminTemplate = async (req, res, next) => {
  try {
    const template = await createTemplate(req.body || {}, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Template created',
      data: template,
    });
  } catch (error) {
    return next(error);
  }
};

const updateAdminTemplate = async (req, res, next) => {
  try {
    const template = await updateTemplate(req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Template updated',
      data: template,
    });
  } catch (error) {
    return next(error);
  }
};

const reorderAdminTemplateSections = async (req, res, next) => {
  try {
    const template = await reorderTemplateSections(req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Template sections reordered',
      data: template,
    });
  } catch (error) {
    return next(error);
  }
};

const addAdminTemplateSection = async (req, res, next) => {
  try {
    const template = await addTemplateSection(req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Template section added',
      data: template,
    });
  } catch (error) {
    return next(error);
  }
};

const removeAdminTemplateSection = async (req, res, next) => {
  try {
    const template = await removeTemplateSection({ sectionId: req.params.id });
    return res.status(200).json({
      success: true,
      message: 'Template section removed',
      data: template,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createAdminTemplate,
  updateAdminTemplate,
  reorderAdminTemplateSections,
  addAdminTemplateSection,
  removeAdminTemplateSection,
};
