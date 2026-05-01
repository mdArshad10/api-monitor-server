import { IngestController } from "../controller/ingest.controller.js";
import { IngestService } from "../services/ingest.service.js";
import { createEventProducer } from "../../../shared/events/producers/createEventProducer.js";

class Container {
  static init() {
    const eventProducer = createEventProducer();
    const repositories = {};
    const services = {
      ingestService: new IngestService(eventProducer),
    };
    const controllers = {
      ingestController: new IngestController(services.ingestService),
    };

    return { repositories, services, controllers };
  }
}

const initialized = Container.init();
export { Container };
export default initialized;
