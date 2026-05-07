import { ApiHitRepository } from "../repository/apiHitRepository.js";
import { MetricsRepository } from "../repository/metricsRepository.js";

import ApiHit from '../../../shared/models/apiKey.model.js'
import logger from '../../../shared/config/logger.js'
import postgres from '../../../shared/config/postgres.js'

class Container {
  static init() {
    const controllers = {};
    const repositories = {
      apiHitRepository: new ApiHitRepository({ model: ApiHit, logger }),
      metricsRepository: new MetricsRepository({ logger, postgres }),
    };
    const services = {
      processorService: new ProcessorService(repositories),
    };

    return { controllers, services, repositories };
  }
}

const container = Container.init();
export default container;
export { Container };
