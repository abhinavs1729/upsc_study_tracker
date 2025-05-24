import { Request, Response } from 'express';
import { StudySession } from '../models/StudySession';
import { Analytics } from '../models/Analytics';
import { startOfDay, endOfDay } from 'date-fns';

export const createSession = async (req: Request, res: Response) => {
  try {
    const { subject, topic, notes } = req.body;
    const userId = req.user._id;

    const session = new StudySession({
      user: userId,
      startTime: new Date(),
      subject,
      topic,
      notes,
      duration: 0,
      status: 'active',
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Error creating study session' });
  }
};

export const endSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user._id;

    const session = await StudySession.findOne({ _id: id, user: userId });
    if (!session) {
      return res.status(404).json({ error: 'Study session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - session.startTime.getTime()) / (1000 * 60));

    session.endTime = endTime;
    session.duration = duration;
    session.status = 'completed';
    if (notes) session.notes = notes;

    await session.save();

    // Update analytics
    await updateAnalytics(userId, session);

    res.json(session);
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Error ending study session' });
  }
};

export const pauseSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await StudySession.findOne({ _id: id, user: userId });
    if (!session) {
      return res.status(404).json({ error: 'Study session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    session.status = 'paused';
    await session.save();

    res.json(session);
  } catch (error) {
    console.error('Pause session error:', error);
    res.status(500).json({ error: 'Error pausing study session' });
  }
};

export const resumeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await StudySession.findOne({ _id: id, user: userId });
    if (!session) {
      return res.status(404).json({ error: 'Study session not found' });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ error: 'Session is not paused' });
    }

    session.status = 'active';
    await session.save();

    res.json(session);
  } catch (error) {
    console.error('Resume session error:', error);
    res.status(500).json({ error: 'Error resuming study session' });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, subject, status } = req.query;

    const query: any = { user: userId };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (subject) {
      query.subject = subject;
    }

    if (status) {
      query.status = status;
    }

    const sessions = await StudySession.find(query)
      .sort({ startTime: -1 })
      .limit(100);

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Error fetching study sessions' });
  }
};

export const getTodaySessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const today = new Date();

    const sessions = await StudySession.find({
      user: userId,
      startTime: {
        $gte: startOfDay(today),
        $lte: endOfDay(today),
      },
    }).sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    console.error('Get today sessions error:', error);
    res.status(500).json({ error: 'Error fetching today\'s study sessions' });
  }
};

// Helper function to update analytics
async function updateAnalytics(userId: string, session: any) {
  const today = new Date();
  const analytics = await Analytics.findOne({
    user: userId,
    date: startOfDay(today),
  });

  if (!analytics) {
    // Create new analytics entry for today
    const newAnalytics = new Analytics({
      user: userId,
      date: startOfDay(today),
      totalStudyTime: session.duration,
      subjects: [{
        name: session.subject,
        timeSpent: session.duration,
        topics: [{
          name: session.topic,
          timeSpent: session.duration,
        }],
      }],
    });
    await newAnalytics.save();
  } else {
    // Update existing analytics
    analytics.totalStudyTime += session.duration;

    const subjectIndex = analytics.subjects.findIndex(s => s.name === session.subject);
    if (subjectIndex === -1) {
      analytics.subjects.push({
        name: session.subject,
        timeSpent: session.duration,
        topics: [{
          name: session.topic,
          timeSpent: session.duration,
        }],
      });
    } else {
      analytics.subjects[subjectIndex].timeSpent += session.duration;

      const topicIndex = analytics.subjects[subjectIndex].topics.findIndex(
        t => t.name === session.topic
      );
      if (topicIndex === -1) {
        analytics.subjects[subjectIndex].topics.push({
          name: session.topic,
          timeSpent: session.duration,
        });
      } else {
        analytics.subjects[subjectIndex].topics[topicIndex].timeSpent += session.duration;
      }
    }

    await analytics.save();
  }
} 