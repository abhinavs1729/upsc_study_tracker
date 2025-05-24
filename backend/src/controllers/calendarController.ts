import { Request, Response } from 'express';
import { CalendarEvent } from '../models/Calendar';
import { addDays, addWeeks, addMonths, startOfDay, endOfDay } from 'date-fns';

export const createEvent = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      type,
      subject,
      topic,
      location,
      isRecurring,
      recurrencePattern,
    } = req.body;
    const userId = req.user._id;

    const event = new CalendarEvent({
      user: userId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      type,
      subject,
      topic,
      location,
      isRecurring,
      recurrencePattern,
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Error creating calendar event' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      type,
      subject,
      topic,
      location,
      isRecurring,
      recurrencePattern,
      status,
    } = req.body;
    const userId = req.user._id;

    const event = await CalendarEvent.findOne({ _id: id, user: userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (startTime) event.startTime = new Date(startTime);
    if (endTime) event.endTime = new Date(endTime);
    if (type) event.type = type;
    if (subject) event.subject = subject;
    if (topic) event.topic = topic;
    if (location) event.location = location;
    if (isRecurring !== undefined) event.isRecurring = isRecurring;
    if (recurrencePattern) event.recurrencePattern = recurrencePattern;
    if (status) event.status = status;

    await event.save();
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Error updating calendar event' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await CalendarEvent.findOneAndDelete({ _id: id, user: userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Error deleting calendar event' });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, type } = req.query;

    const query: any = { user: userId };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (type) {
      query.type = type;
    }

    const events = await CalendarEvent.find(query)
      .sort({ startTime: 1 });

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Error fetching calendar events' });
  }
};

export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { days = 7 } = req.query;
    const today = new Date();
    const endDate = addDays(today, Number(days));

    const events = await CalendarEvent.find({
      user: userId,
      startTime: {
        $gte: startOfDay(today),
        $lte: endOfDay(endDate),
      },
      status: 'scheduled',
    }).sort({ startTime: 1 });

    res.json(events);
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: 'Error fetching upcoming events' });
  }
};

export const generateRecurringEvents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;
    const userId = req.user._id;

    const baseEvent = await CalendarEvent.findOne({ _id: id, user: userId });
    if (!baseEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!baseEvent.isRecurring || !baseEvent.recurrencePattern) {
      return res.status(400).json({ error: 'Event is not recurring' });
    }

    const { frequency, interval } = baseEvent.recurrencePattern;
    const events = [];
    let currentDate = new Date(baseEvent.startTime);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      if (currentDate > baseEvent.startTime) {
        const event = new CalendarEvent({
          ...baseEvent.toObject(),
          _id: undefined,
          startTime: currentDate,
          endTime: new Date(currentDate.getTime() + (baseEvent.endTime.getTime() - baseEvent.startTime.getTime())),
        });
        events.push(event);
      }

      switch (frequency) {
        case 'daily':
          currentDate = addDays(currentDate, interval);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, interval);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, interval);
          break;
      }
    }

    await CalendarEvent.insertMany(events);
    res.json(events);
  } catch (error) {
    console.error('Generate recurring events error:', error);
    res.status(500).json({ error: 'Error generating recurring events' });
  }
}; 