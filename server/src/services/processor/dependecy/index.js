class Container {
  static init() {
    const controllers = {};
    const services = {};
    const repositories = {};

    return { controllers, services, repositories };
  }
}

const container = Container.init();
export default container;
export { Container };
