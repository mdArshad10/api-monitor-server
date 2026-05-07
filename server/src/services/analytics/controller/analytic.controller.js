import { ApiResponse } from "../../../shared/utils/apiResponse";
import { AppError } from "../../../shared/utils/AppError";

class AnalyticController {
  constructor({
    analyticsService: analyticsSvc
  } = {}) {
    if (!analyticsSvc) {
      throw new Error(
        "AnalyticController required analyticsService",
      );
    }

    this.analyticsService = analyticsSvc;
  }

  async getStats(req, res, next) {
    try {
      const { startTime, endTime } = req.query;
      const isAdmin = await this.ensureCanViewAnalytic(req);
      const finalClientId = await this.resolveFinalClientId(req,isAdmin);
      const timeRange = this.validateTimeRange(startTime,endTime);
      const stats = await this.analyticsService.getOverallStats(finalClientId,timeRange);
      res
        .status(200)
        .json(
          ApiResponse.success(stats, 200, "Statistics retrieved successfully"),
        );
    } catch (error) {
      next(error)
    }
  }

  async getDashboard(req,res,next){
    try {
      const {startTime,endTime} = req.query;
      const isAdmin = await this.analyticsService.ensureCanViewAnalytic(req);
      const finalClientId = await this.analyticsService.resolveFinalClientId(
        req,
        isAdmin,
      );
      const timeRange = this.analyticsService.validateTimeRange(startTime, endTime);

      const result = await Promise.allSettled([
        this.analyticsService.getOverallStats(finalClientId, timeRange),
        this.analyticsService.getTopEndpoints(finalClientId, {
          limit: 5,
          startTime: timeRange.startTime,
        }),
        this.analyticsService.getTimeSeries(finalClientId, {
          ...timeRange,
          limit: 24,
        }),
      ]);

        const [stats, topEndpoints, recentTimeSeries] = result.map((item) =>
          item.status === "fulfilled" ? item.value : null,
        );

         const dashboard = {
           stats,
           topEndpoints,
           recentActivity: recentTimeSeries,
         };

         res
           .status(200)
           .json(
             ApiResponse.success(
               dashboard,
               200,
               "Dashboard data retrieved successfully",
             ),
           );

    } catch (error) {
      next(error)
    }
  }

  

  
}

export { AnalyticController };
