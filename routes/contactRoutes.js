const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/contactController');

// POST /api/contact — Public
router.post('/', sendMessage);

module.exports = router;
