import {MetricsRepository} from '../../processor/repository/metricsRepository.js'
import { AnalyticService } from '../services/analytic.service.js';

class Container {
  static init() {
    const services = {
      analyticsService: new AnalyticService(),
    };
    const controllers = {
      
    };
    return { services, controllers };
  }
}

const initialized = Container.init();
export { Container };
export default initialized;
