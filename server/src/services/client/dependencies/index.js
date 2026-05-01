import { MongoUserRepository } from "../../auth/repository/user.repository.js";
import AuthService from "../../auth/dependencies/index.js";
import { ClientController } from "../controller/clientController.js";
import { MongoApiKeyRepository } from "../repository/apiKeyRepository.js";
import { MongoClientRepository } from "../repository/clientRepository.js";
import { ClientService } from "../service/clientService.js";

class ClientDependencies {
  static init() {
    const repositories = {
      clientRepository: new MongoClientRepository(),
      apiKeyRepository: new MongoApiKeyRepository(),
      userRepository: new MongoUserRepository(),
    };
    const services = {
      clientService: new ClientService({
        clientRepository: repositories.clientRepository,
        apiKeyRepository: repositories.apiKeyRepository,
        userRepository: repositories.userRepository,
      }),
    };
    const controllers = {
      clientController: new ClientController(
        services.clientService,
        AuthService.services.userService,
      ),
    };

    return {
      repositories,
      controllers,
      services,
    };
  }
}

const initialized = ClientDependencies.init();
export { ClientDependencies };
export default initialized;
