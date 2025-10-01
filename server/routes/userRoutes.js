const express = require('express');
const router = express.Router();

// Routes mẫu
router.get('/', (req, res) => {
  res.json({ message: 'User routes working' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create user endpoint' });
});

module.exports = router;