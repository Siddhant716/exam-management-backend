const Exam = require('../models/exam');
const User = require('../models/User');

// Returns exams where the current judge is assigned
const getAssignedExams = async (req, res, next) => {
  try {
    if (req.user.role !== 'judge') return res.status(403).json({ message: 'Forbidden' });

    const exams = await Exam.find({ judges: req.user.userId })
      .populate('participants', 'name email');

    res.json({ exams, count: exams.length });
  } catch (err) {
    next(err);
  }
};

// Returns participants for a specific level of an assigned exam
const getLevelParticipants = async (req, res, next) => {
  try {
    const { examId, levelId } = req.params;
    const exam = await Exam.findOne({ _id: examId, judges: req.user.userId })
      .populate('participants', 'name email');

    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const level = exam.levels.id(levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    res.json({ level, participants: exam.participants });
  } catch (err) {
    next(err);
  }
};

// Persists a judge's score for a participant at a level (locked after publish)
const scoreParticipant = async (req, res, next) => {
  try {
    const { examId, levelId, participantId } = req.params;
    const { scores } = req.body;

    const exam = await Exam.findOne({ _id: examId, judges: req.user.userId });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.status === 'published') {
      return res.status(403).json({ message: 'Exam is published. Scores are locked.' });
    }

    const level = exam.levels.id(levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    // Normalize and compute based on scoring method
    const method = level.scoringMethod || 'percentage';
    let computed = {};
    if (method === 'boolean') {
      // Expect { components: [{ name, pass: boolean }], total }
      const components = Array.isArray(scores?.components) ? scores.components : [];
      const passed = components.filter(c => Boolean(c.pass)).length;
      const total = components.length || 1;
      const percent = Math.round((passed / total) * 10000) / 100; // 2 decimals
      computed = { method, components, passed, total, percent };
    } else if (method === 'dressage') {
      // Expect criteria 0-10 with half points allowed; plus optional collective marks
      // Example payload: { criteria: { gait: 7.5, suppleness: 7, obedience: 6.5, responsiveness: 7, balance: 7 }, collectives: { harmony: 7 }, maxPer: 10 }
      const criteria = scores?.criteria && typeof scores.criteria === 'object' ? scores.criteria : {};
      const collectives = scores?.collectives && typeof scores.collectives === 'object' ? scores.collectives : {};
      const allValues = [
        ...Object.values(criteria).map(Number),
        ...Object.values(collectives).map(Number)
      ].filter(v => Number.isFinite(v));
      const maxPer = 10;
      const obtained = allValues.reduce((a, b) => a + b, 0);
      const maxTotal = (Object.keys(criteria).length + Object.keys(collectives).length) * maxPer || 1;
      const percent = Math.round((obtained / maxTotal) * 10000) / 100;
      computed = { method, criteria, collectives, obtained, maxTotal, percent };
    } else {
      // percentage (fallback): expect { total: number (0-100) }
      const total = Number(scores?.total);
      const percent = Number.isFinite(total) ? Math.max(0, Math.min(100, total)) : 0;
      computed = { method, percent };
    }

    if (!level.scores) level.scores = {};
    level.scores.set(String(participantId), computed);

    await exam.save();
    res.json({ message: 'Score saved', scores: computed });
  } catch (err) {
    next(err);
  }
};

// List all judges (for academy and exam_manager)
const listJudges = async (req, res, next) => {
  try {
    if (!['academy', 'exam_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const judges = await User.find({ role: 'judge' }).select('name email role');
    const result = judges.map(j => ({ id: j._id, name: j.name, email: j.email }));
    res.json({ judges: result, count: result.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAssignedExams,
  getLevelParticipants,
  scoreParticipant,
  listJudges,
};
