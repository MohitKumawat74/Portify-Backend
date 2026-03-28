const express = require('express');

const { getOwnProfile, updateOwnProfile } = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');
const { updateProfileSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/profile', isAuthenticated, getOwnProfile);
router.put('/profile', isAuthenticated, validate(updateProfileSchema), updateOwnProfile);

module.exports = router;
