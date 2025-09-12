const Exam = require('../models/exam');
const User = require('../models/User');
const { validateRequest } = require('../controllers/utils');



// Create Exam
const createExam = async (req, res, next) => {
  try {
    const errors = validateRequest(req);
    if (errors) return res.status(400).json({ errors });

    const payload = { ...req.body, createdBy: req.user.userId };
    const exam = await Exam.create(payload);
    res.status(201).json({ exam });
  } catch (err) {
    next(err);
  }
};

// Get all exams
const getExams = async (req, res, next) => {
  try {
    const exams = await Exam.find()
      .populate('createdBy', 'name email role')
      .populate('judges', 'name email role');
    res.json({ exams, count: exams.length });
  } catch (err) {
    next(err);
  }
};

// Get exam by ID
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id)
      .populate('createdBy', 'name email role')
      .populate('judges', 'name email')
      .populate('participants', 'name email');

    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

// Update exam (only meta fields). Academy/Exam Manager always; Assigned judges only if not published
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const isAcademyOrManager = ['academy', 'exam_manager'].includes(req.user.role);
    const isAssignedJudge = req.user.role === 'judge' && (exam.judges || []).map(String).includes(String(req.user.userId));

    if (!isAcademyOrManager && !isAssignedJudge) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (isAssignedJudge) {
      if (exam.status === 'published') {
        return res.status(403).json({ message: 'Exam is published. Editing is locked.' });
      }
    }

    // Whitelist editable fields (meta only)
    const editableFields = ['title', 'description', 'center', 'venue', 'startAt', 'endAt', 'imageUrl'];
    for (const key of editableFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        exam[key] = req.body[key];
      }
    }

    await exam.save();
    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

// Delete exam
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const isOwner = String(exam.createdBy) === req.user.userId;
    const isAcademyOrManager = ['academy', 'exam_manager'].includes(req.user.role);
    const isAssignedJudge = req.user.role === 'judge' && (exam.judges || []).map(String).includes(String(req.user.userId));

    if (!(isOwner || isAcademyOrManager || isAssignedJudge)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Assigned judges can only delete if not published
    if (isAssignedJudge && exam.status === 'published') {
      return res.status(403).json({ message: 'Exam is published. Deletion is locked.' });
    }

    await exam.deleteOne();

    res.json({ message: 'Exam removed' });
  } catch (err) {
    next(err);
  }
};

// Assign judges
const assignJudges = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { judgeIds = [] } = req.body;

    if (!Array.isArray(judgeIds)) return res.status(400).json({ message: 'judgeIds must be an array' });

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // validate judges
    const judges = await User.find({ _id: { $in: judgeIds }, role: 'judge' });
    const judgeIdsFound = judges.map(j => j._id.toString());

    // assign judges (max 2 total)
    const current = (exam.judges || []).map(String);
    const merged = Array.from(new Set([...current, ...judgeIdsFound]));
    if (merged.length > 2) {
      return res.status(400).json({ message: 'You can assign at most 2 judges' });
    }

    exam.judges = merged;
    await exam.save();

    // populate judges properly
    const populatedExam = await Exam.findById(exam._id).populate('judges', 'name email role');

    res.json({
      message: 'Judges assigned',
      judges: populatedExam.judges
    });
  } catch (err) {
    next(err);
  }
};

// Publish exam (locks leaderboard edits from judges)
const publishExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (!['academy', 'exam_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    exam.status = 'published';
    await exam.save();
    res.json({ message: 'Exam published', status: exam.status });
  } catch (err) {
    next(err);
  }
};

// Get leaderboard for an exam level with role-based visibility
const getLeaderboard = async (req, res, next) => {
  try {
    const { examId, levelId } = req.params;
    const exam = await Exam.findById(examId).populate('participants', 'name email role');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const level = exam.levels.id(levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    // Visibility
    const isPublished = exam.status === 'published';
    const role = req.user.role;
    const isJudge = role === 'judge';
    const isAcademyOrManager = ['academy', 'exam_manager'].includes(role);
    const isParticipant = role === 'participant';

    if (!isPublished && !(isJudge || isAcademyOrManager)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Build leaderboard from level.scores
    // Convert Map to array if needed
    const rawScores = level.scores instanceof Map ? Array.from(level.scores.entries()) : Object.entries(level.scores || {});
    const entries = rawScores.map(([participantId, scores]) => {
      const p = exam.participants.find((x) => String(x._id) === String(participantId));
      const name = p ? p.name : participantId;
      // Determine value by scoring method
      let value = 0;
      if (scores && typeof scores === 'object') {
        if ('percent' in scores) value = Number(scores.percent);
        else if ('total' in scores) value = Number(scores.total);
      } else {
        value = Number(scores);
      }
      return { participantId, name, value: Number.isFinite(value) ? value : 0 };
    });

    // Sort descending by value
    entries.sort((a, b) => b.value - a.value);

    res.json({ published: isPublished, leaderboard: entries });
  } catch (err) {
    next(err);
  }
};
// ---------- LEVEL CONTROLLERS ----------


// Add level
const addLevel = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { name, description, scoringMethod } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    exam.levels.push({ name, description, scoringMethod, components: [] });

    await exam.save();

    res.status(201).json({ message: 'Level added', levels: exam.levels });
  } catch (err) {
    next(err);
  }
};


const getLevelParticipants = async (req, res, next) => {
  try {
    const { examId, levelId } = req.params;

    const exam = await Exam.findById(examId).populate({
      path: 'levels.participants',
      select: 'name email role',
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const level = exam.levels.id(levelId);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    res.json({ participants: level.participants });
  } catch (err) {
    next(err);
  }
};


// Update level
const updateLevel = async (req, res, next) => {
  try {
    const { examId, levelId } = req.params;
    const { name, description } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const level = exam.levels.id(levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    if (name) level.name = name;
    if (description) level.description = description;

    await exam.save();
    res.json({ message: 'Level updated', level });
  } catch (err) {
    next(err);
  }
};

// Delete level
const deleteLevel = async (req, res, next) => {
  try {
    const { examId, levelId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const level = exam.levels.id(levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    level.deleteOne();
    await exam.save();

    res.json({ message: 'Level removed', levels: exam.levels });
  } catch (err) {
    next(err);
  }
};

// Register participant to exam
const registerParticipant = async (req, res, next) => {
  try {
    const { examId } = req.params;
    let { participantId } = req.body || {};

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // Block registrations when exam is published
    if (exam.status === 'published') {
      return res.status(400).json({ message: 'Registration for the exam is closed' });
    }

    // Default participantId to logged-in user if not provided
    if (!participantId) {
      participantId = req.user?.userId;
    }

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    // Prevent duplicate
    if (exam.participants.map(String).includes(String(participantId))) {
      return res.status(400).json({ message: "Participant already registered" });
    }

    exam.participants.push(participantId);
    await exam.save();

    // Fetch participant for name/email
    let participant = null;
    try {
      const u = await User.findById(participantId).select('name email');
      if (u) participant = { id: u._id, name: u.name, email: u.email };
    } catch (_) {}

    res.status(200).json({
      message: "Participant registered",
      participant: participant || { id: participantId },
      examId: exam._id,
    });
  } catch (err) {
    next(err);
  }
};
module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  assignJudges,
  publishExam,
  getLeaderboard,
  addLevel,
  updateLevel,
  deleteLevel,
  registerParticipant,
  getLevelParticipants
};
