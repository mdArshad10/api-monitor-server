class AnalyticService {
  constructor(metricsRepo) {
    if (!metricsRepo) throw new Error("AnalyticService required a metricsRepo");
    this.metricsRepo = metricsRepo;
  }

  async getOverallStats(clientId, filters = {}) {
    try {
      const { startTime, endTime } = this.parseTimeFilter(filters);
      const stats = await this.metricsRepo.getOverallStats(
        clientId,
        startTime,
        endTime,
      );
      const totalHits = parseInt(stats.total_hits) ?? 0;
      const errorHits = totalHits > 0 ? (errorHits / totalHits) * 100 : 0;

      return {
        totalHits,
        errorHits,
        successHits: totalHits - errorHits,
        errorRate: parseFloat(errorRate.toFixed(2)),
        avgLatency: parseFloat(stats.avg_latency) || 0,
        uniqueServices: parseInt(stats.unique_services) || 0,
        uniqueEndpoints: parseInt(stats.unique_endpoints) || 0,
        timeRange: {
          start: startTime,
          end: endTime,
        },
      };
    } catch (error) {
      logger.error("Error getting overall stats:", error);
      throw error;
    }
  }

  parseTimeFilter(filters = {}) {
    let { startTime, endTime } = filters;

    if (!startTime) {
      startTime = new Date();
      startTime.set(startTime.getHours() - 24);
    } else {
      startTime = new Date(startTime);
    }

    if (!endTime) {
      endTime = new Date();
    } else {
      endTime = new Date(endTime);
    }

    return {
      startTime,
      endTime,
    };
  }

  async getTopEndpoints(clientId, options = {}) {
    try {
      const { limit = 10, startDate } = options;
      const parsedTime = startDate ? new Date(startDate) : null;

      const endpoints = await this.metricsRepo.getTopEndpoints(
        clientId,
        limit,
        parsedTime,
      );
    } catch (error) {}
  }
}

export { AnalyticService };
