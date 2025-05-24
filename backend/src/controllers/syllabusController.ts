import { Request, Response } from 'express';
import { SyllabusItem } from '../models/Syllabus';
import { StudySession } from '../models/StudySession';

export const createSyllabusItem = async (req: Request, res: Response) => {
  try {
    const { subject, topic, subtopics, priority, targetDate } = req.body;
    const userId = req.user._id;

    const syllabusItem = new SyllabusItem({
      user: userId,
      subject,
      topic,
      subtopics: subtopics.map((name: string) => ({ name })),
      priority,
      targetDate,
    });

    await syllabusItem.save();
    res.status(201).json(syllabusItem);
  } catch (error) {
    console.error('Create syllabus item error:', error);
    res.status(500).json({ error: 'Error creating syllabus item' });
  }
};

export const updateSyllabusItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, topic, subtopics, priority, targetDate, status } = req.body;
    const userId = req.user._id;

    const syllabusItem = await SyllabusItem.findOne({ _id: id, user: userId });
    if (!syllabusItem) {
      return res.status(404).json({ error: 'Syllabus item not found' });
    }

    if (subject) syllabusItem.subject = subject;
    if (topic) syllabusItem.topic = topic;
    if (subtopics) syllabusItem.subtopics = subtopics;
    if (priority) syllabusItem.priority = priority;
    if (targetDate) syllabusItem.targetDate = targetDate;
    if (status) {
      syllabusItem.status = status;
      if (status === 'completed') {
        syllabusItem.completedAt = new Date();
      }
    }

    await syllabusItem.save();
    res.json(syllabusItem);
  } catch (error) {
    console.error('Update syllabus item error:', error);
    res.status(500).json({ error: 'Error updating syllabus item' });
  }
};

export const updateSubtopicStatus = async (req: Request, res: Response) => {
  try {
    const { id, subtopicId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user._id;

    const syllabusItem = await SyllabusItem.findOne({ _id: id, user: userId });
    if (!syllabusItem) {
      return res.status(404).json({ error: 'Syllabus item not found' });
    }

    const subtopic = syllabusItem.subtopics.id(subtopicId);
    if (!subtopic) {
      return res.status(404).json({ error: 'Subtopic not found' });
    }

    subtopic.status = status;
    if (notes) subtopic.notes = notes;
    if (status === 'completed') {
      subtopic.completedAt = new Date();
    }

    // Update overall status if all subtopics are completed
    const allCompleted = syllabusItem.subtopics.every(
      (st) => st.status === 'completed'
    );
    if (allCompleted) {
      syllabusItem.status = 'completed';
      syllabusItem.completedAt = new Date();
    } else if (syllabusItem.subtopics.some((st) => st.status === 'in_progress')) {
      syllabusItem.status = 'in_progress';
    }

    await syllabusItem.save();
    res.json(syllabusItem);
  } catch (error) {
    console.error('Update subtopic status error:', error);
    res.status(500).json({ error: 'Error updating subtopic status' });
  }
};

export const getSyllabusItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { subject, status, priority } = req.query;

    const query: any = { user: userId };

    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const syllabusItems = await SyllabusItem.find(query)
      .sort({ priority: 1, createdAt: -1 });

    res.json(syllabusItems);
  } catch (error) {
    console.error('Get syllabus items error:', error);
    res.status(500).json({ error: 'Error fetching syllabus items' });
  }
};

export const getSyllabusProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { subject } = req.query;

    const query: any = { user: userId };
    if (subject) query.subject = subject;

    const syllabusItems = await SyllabusItem.find(query);
    const studySessions = await StudySession.find({
      user: userId,
      status: 'completed',
    });

    const progress = {
      totalTopics: syllabusItems.length,
      completedTopics: syllabusItems.filter((item) => item.status === 'completed').length,
      totalSubtopics: syllabusItems.reduce((acc, item) => acc + item.subtopics.length, 0),
      completedSubtopics: syllabusItems.reduce(
        (acc, item) =>
          acc + item.subtopics.filter((st) => st.status === 'completed').length,
        0
      ),
      totalStudyTime: studySessions.reduce((acc, session) => acc + session.duration, 0),
      subjectBreakdown: {},
    };

    // Calculate subject breakdown
    syllabusItems.forEach((item) => {
      if (!progress.subjectBreakdown[item.subject]) {
        progress.subjectBreakdown[item.subject] = {
          total: 0,
          completed: 0,
          studyTime: 0,
        };
      }
      progress.subjectBreakdown[item.subject].total++;
      if (item.status === 'completed') {
        progress.subjectBreakdown[item.subject].completed++;
      }
    });

    // Add study time per subject
    studySessions.forEach((session) => {
      if (progress.subjectBreakdown[session.subject]) {
        progress.subjectBreakdown[session.subject].studyTime += session.duration;
      }
    });

    res.json(progress);
  } catch (error) {
    console.error('Get syllabus progress error:', error);
    res.status(500).json({ error: 'Error fetching syllabus progress' });
  }
}; 