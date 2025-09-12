
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const judgeController = require('../controllers/judgeController');

// List all judges (for academy and exam_manager)
router.get('/', auth, judgeController.listJudges);

// Get exams assigned to judge
router.get('/assigned-exams', auth, judgeController.getAssignedExams);

// Get participants for a level
router.get('/:examId/levels/:levelId/participants', auth, judgeController.getLevelParticipants);

// Score participant
router.post('/:examId/levels/:levelId/participants/:participantId/score', auth, judgeController.scoreParticipant);

module.exports = router;
