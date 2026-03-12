const {
  createTheme,
  updateTheme,
  deleteTheme,
  getAllThemes,
} = require('../services/templateService');

const create = async (req, res, next) => {
  try {
    const theme = await createTheme(req.body, req.user._id);
    res.status(201).json({
      success: true,
      message: 'Theme created successfully.',
      data: theme,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const theme = await updateTheme(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Theme updated successfully.',
      data: theme,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deleteTheme(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Theme deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const themes = await getAllThemes();
    res.status(200).json({ success: true, data: themes });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, update, remove, getAll };
