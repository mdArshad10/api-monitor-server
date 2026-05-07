import {MetricsRepository} from '../../processor/repository/metricsRepository.js'

class Container {
  static init() {
    const controllers = {};
    const services = new MetricsRepository();
    return { services, controllers };
  }
}

const initialized = Container.init();
export { Container };
export default initialized;
