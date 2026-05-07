import { isValidObjectId } from "../../../shared/utils/common.js";

class AnalyticService {
  constructor({
    metricsRepo,
    authService: authSvc,
    clientRepository: clientRepo,
  }) {
    if (!metricsRepo) throw new Error("AnalyticService required a metricsRepo");
    this.metricsRepo = metricsRepo;
    this.authService = authSvc;
    this.clientRepository = clientRepo;
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

  validateTimeRange(startTime, endTime) {
    const parseValue = (v) => {
      if (v === undefined || v === null || v === "") return null;
      if (/^\d+$/.test(String(v))) return Number(v);
      const parsed = Date.parse(String(v));
      return Number.isNaN(parsed) ? NaN : parsed;
    };

    const start = parseValue(startTime);
    const end = parseValue(endTime);

    if ((startTime && Number.isNaN(start)) || (endTime && Number.isNaN(end))) {
      throw new AppError("Invalid time format", 400);
    }

    if (start !== null && end !== null && start > end) {
      throw new AppError("Invalid time range: start > end", 400);
    }

    return { startTime: start, endTime: end };
  }

  // where we check user is admin or have clientAdmin or have permission to view
  async ensureCanViewAnalytic(req) {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError("Authentication required", 401);
      }
      const isSuperAdmin = await this.authService.checkSuperAdminPermission(
        req.user.userId,
      );
      if (isSuperAdmin) {
        return true;
      }

      const userProfile = await this.authService.getProfile(req.user.userId);
      if (
        !userProfile ||
        !userProfile.permissions ||
        !userProfile.permissions.canViewAnalytics
      ) {
        throw new AppError("Insufficient Permissions to view the analytic");
      }

      return false;
    } catch (error) {}
  }

  async resolveFinalClientId(req, isSuperAdmin) {
    const queryClientId = req.query?.clientId;
    const userClientId = req.user?.clientId;

    if (isSuperAdmin) {
      if (queryClientId) {
        if (!isValidObjectId(queryClientId)) {
          throw new AppError("Invalid clientId formate", 400);
        }
        const clientId = await this.clientRepository.findById(queryClientId);
        if (clientId) {
          throw new AppError("invalid clientId formate");
        }
        return queryClientId;
      }
      return null;
    }

    if (!userClientId) {
      throw new AppError("Access denied - no client association", 403);
    }
    if (!isValidObjectId(userClientId)) {
      throw new AppError("Invalid client association", 400);
    }

    const client = await this.clientRepository.findById(userClientId);
    if (!client) throw new AppError("Client not found", 404);
    return userClientId;
  }
}

export { AnalyticService };
