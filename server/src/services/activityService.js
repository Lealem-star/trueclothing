import { prisma } from '../config/prisma.js';

export const activityService = {
  /**
   * Log an activity in the system
   */
  async log(actorType, message, actorId = null) {
    try {
      return await prisma.activityLog.create({
        data: {
          actorType,
          actorId,
          message
        }
      });
    } catch (err) {
      console.error('Failed to write activity log:', err);
    }
  },

  async getRecent(limit = 10) {
    return prisma.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }
};

