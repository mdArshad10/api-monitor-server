export default class baseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    throw new Error("Mention not implemented");
  }
  async findById(id) {
    throw new Error("Mention not implemented");
  }
  async findByUserName(name) {
    throw new Error("Mention not implemented");
  }
  async findByEmail(email) {
    throw new Error("Mention not implemented");
  }
  async findAll() {
    throw new Error("Mention not implemented");
  }
}
