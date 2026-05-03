import { BaseRepository } from "./baseRepository.js";

class MetricsRepository extends BaseRepository {
  constructor({ logger: l, postgres: pg } = {}) {
    super({ logger: l });
    this.postgres = pg;
  }

  async getTopEndpoints(clientId, limit = 10, startTime = null) {
    try {
      const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

      let query = `
        SELECT
          service_name,
          endpoint,
          method,
          SUM(total_hits) as total_hits,
          SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
          SUM(error_hits) as error_hits
        FROM endpoint_metrics
      `;

      const params = [];
      let paramIndex = 1;

      // Add client filter only if clientId is provided
      if (clientId != null) {
        query += ` WHERE client_id = $${paramIndex}`;
        params.push(clientId);
        paramIndex++;
      }

      if (startTime) {
        query += clientId != null ? ` AND` : ` WHERE`;
        query += ` time_bucket >= $${paramIndex}`;
        params.push(startTime);
        paramIndex++;
      }

      query += `
        GROUP BY service_name, endpoint, method
        ORDER BY total_hits DESC
        LIMIT $${paramIndex}
      `;
      params.push(safeLimit);

      const result = await this._query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error("Error getting top endpoints:", error);
      throw error;
    }
  }
}
