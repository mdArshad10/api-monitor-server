class Container {
  static init() {
    const services = {};
    const controllers = {};
    return { services, controllers };
  }
}

const initialized = Container.init();
export { Container };
export default initialized;
