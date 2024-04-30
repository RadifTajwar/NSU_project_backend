const express = require('express');
const router = express.Router();

// Import your user model

const {promptGenerate, sotryBeginingFromUser} = require('../controller/promptController')

// Define routes

router.route('/story/promptGenerate').post(promptGenerate);
router.route('/story/generate').get(sotryBeginingFromUser);

module.exports = router;
