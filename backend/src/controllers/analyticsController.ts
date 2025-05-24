import { Request, Response } from 'express';
import { Analytics } from '../models/Analytics';
import { StudySession } from '../models/StudySession';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export const getDailyAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const analytics = await Analytics.findOne({
      user: userId,
      date: {
        $gte: startOfDay(targetDate),
        $lte: endOfDay(targetDate),
      },
    });

    if (!analytics) {
      return res.json({
        date: targetDate,
        totalStudyTime: 0,
        subjects: [],
        goals: { daily: 0, weekly: 0 },
        achievements: [],
        streak: { current: 0, longest: 0 },
      });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Get daily analytics error:', error);
    res.status(500).json({ error: 'Error fetching daily analytics' });
  }
};

export const getWeeklyAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 7);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await Analytics.find({
      user: userId,
      date: {
        $gte: startOfDay(start),
        $lte: endOfDay(end),
      },
    }).sort({ date: 1 });

    // Calculate weekly totals
    const weeklyStats = {
      totalStudyTime: 0,
      subjects: {} as Record<string, number>,
      goals: {
        daily: 0,
        weekly: 0,
      },
      streak: {
        current: 0,
        longest: 0,
      },
    };

    analytics.forEach((day) => {
      weeklyStats.totalStudyTime += day.totalStudyTime;
      day.subjects.forEach((subject) => {
        weeklyStats.subjects[subject.name] = (weeklyStats.subjects[subject.name] || 0) + subject.timeSpent;
      });
      weeklyStats.goals.daily += day.goals.daily;
      weeklyStats.goals.weekly += day.goals.weekly;
      weeklyStats.streak.current = Math.max(weeklyStats.streak.current, day.streak.current);
      weeklyStats.streak.longest = Math.max(weeklyStats.streak.longest, day.streak.longest);
    });

    res.json({
      period: { start, end },
      dailyAnalytics: analytics,
      weeklyStats,
    });
  } catch (error) {
    console.error('Get weekly analytics error:', error);
    res.status(500).json({ error: 'Error fetching weekly analytics' });
  }
};

export const updateAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { date, studyTime, subject, topic } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    let analytics = await Analytics.findOne({
      user: userId,
      date: {
        $gte: startOfDay(targetDate),
        $lte: endOfDay(targetDate),
      },
    });

    if (!analytics) {
      analytics = new Analytics({
        user: userId,
        date: targetDate,
        totalStudyTime: 0,
        subjects: [],
        goals: { daily: 0, weekly: 0 },
        achievements: [],
        streak: { current: 0, longest: 0 },
      });
    }

    // Update total study time
    analytics.totalStudyTime += studyTime;

    // Update subject-specific time
    const subjectIndex = analytics.subjects.findIndex((s) => s.name === subject);
    if (subjectIndex >= 0) {
      analytics.subjects[subjectIndex].timeSpent += studyTime;
    } else {
      analytics.subjects.push({
        name: subject,
        timeSpent: studyTime,
        topics: [{ name: topic, timeSpent: studyTime }],
      });
    }

    // Update streak
    const yesterday = subDays(targetDate, 1);
    const yesterdayAnalytics = await Analytics.findOne({
      user: userId,
      date: {
        $gte: startOfDay(yesterday),
        $lte: endOfDay(yesterday),
      },
    });

    if (yesterdayAnalytics && yesterdayAnalytics.totalStudyTime > 0) {
      analytics.streak.current = yesterdayAnalytics.streak.current + 1;
      analytics.streak.longest = Math.max(analytics.streak.current, analytics.streak.longest);
    } else {
      analytics.streak.current = 1;
      analytics.streak.longest = Math.max(1, analytics.streak.longest);
    }

    await analytics.save();
    res.json(analytics);
  } catch (error) {
    console.error('Update analytics error:', error);
    res.status(500).json({ error: 'Error updating analytics' });
  }
};

export const getStudyHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    const startDate = subDays(new Date(), Number(days));

    const sessions = await StudySession.find({
      user: userId,
      startTime: { $gte: startDate },
    }).sort({ startTime: -1 });

    const history = sessions.map((session) => ({
      id: session._id,
      date: session.startTime,
      duration: session.duration,
      subject: session.subject,
      topic: session.topic,
      status: session.status,
    }));

    res.json(history);
  } catch (error) {
    console.error('Get study history error:', error);
    res.status(500).json({ error: 'Error fetching study history' });
  }
}; 