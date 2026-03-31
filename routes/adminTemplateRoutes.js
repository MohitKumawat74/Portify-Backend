const express = require('express');

const {
  createAdminTemplate,
  updateAdminTemplate,
  reorderAdminTemplateSections,
  addAdminTemplateSection,
  removeAdminTemplateSection,
} = require('../controllers/templateBuilderController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { validate } = require('../utils/validation');
const {
  createTemplateBuilderSchema,
  updateTemplateBuilderSchema,
  templateSectionReorderSchema,
  addTemplateSectionSchema,
  removeTemplateSectionParamsSchema,
} = require('../utils/schemas');

const router = express.Router();

router.use(protect, isAdmin);

router.post('/', validate(createTemplateBuilderSchema), createAdminTemplate);
router.put('/reorder', validate(templateSectionReorderSchema), reorderAdminTemplateSections);
router.post('/section', validate(addTemplateSectionSchema), addAdminTemplateSection);
router.delete('/section/:id', validate(removeTemplateSectionParamsSchema, 'params'), removeAdminTemplateSection);
router.put('/:id', validate(updateTemplateBuilderSchema), updateAdminTemplate);

module.exports = router;
