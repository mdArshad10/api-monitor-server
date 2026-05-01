import { AuthController } from "../controller/auth.controller.js";
import { MongoUserRepository } from "../repository/user.repository.js";
import { AuthService } from "../service/auth.service.js";

class Container {
  static init() {
    const repositories = {
      userRepository: new MongoUserRepository(),
    };
    const services = {
      userService: new AuthService(repositories.userRepository),
    };
    const controllers = {
      userController: new AuthController(services.userService),
    };

    return {
      repositories,
      controllers,
      services,
    };
  }
}

const initialized = Container.init();
export { Container };
export default initialized;
