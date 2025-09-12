const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const examController = require('../controllers/examController');

// Create exam
router.post(
  '/',
  auth,
  requireRole('academy', 'exam_manager'),
  [
    body('title').notEmpty().withMessage('Title required'),
    body('levels').optional().isArray(),
  ],
  examController.createExam
);

// List exams
router.get('/', auth, examController.getExams);

// Get single exam
router.get('/:id', auth, examController.getExamById);

// Update exam (judges allowed; controller enforces assignment and publish status)
router.put('/:id', auth, requireRole('academy', 'exam_manager', 'judge'), examController.updateExam);

// Delete exam (judges allowed; controller enforces assignment and publish status)
router.delete('/:id', auth, requireRole('academy', 'exam_manager', 'judge'), examController.deleteExam);

// Assign judges
router.post('/:id/assign-judges', auth, requireRole('academy', 'exam_manager'), examController.assignJudges);

// Publish exam
router.put('/:id/publish', auth, requireRole('academy', 'exam_manager'), examController.publishExam);

// Register participant
router.post('/:examId/register', auth, requireRole('academy', 'exam_manager', 'participant'), examController.registerParticipant);

// Add a new level to an exam
router.post(
  '/:examId/levels',
  auth,
  requireRole('academy', 'exam_manager'),
  [
    body('name').notEmpty().withMessage('Level name required'),
    body('description').optional(),
  ],
  examController.addLevel
);

// get level participants
router.get(
  '/:examId/levels/:levelId/participants',
  auth,
  requireRole('academy', 'exam_manager'),
  examController.getLevelParticipants
);

// Get leaderboard for a level
router.get(
  '/:examId/levels/:levelId/leaderboard',
  auth,
  examController.getLeaderboard
);

// Update an existing level
router.put(
  '/:examId/levels/:levelId',
  auth,
  requireRole('academy', 'exam_manager'),
  examController.updateLevel
);

// Delete a level
router.delete(
  '/:examId/levels/:levelId',
  auth,
  requireRole('academy', 'exam_manager'),
  examController.deleteLevel
);

module.exports = router;
