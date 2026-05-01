class BaseClientRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    throw new Error("Method 'create' must be implemented.");
  }

  async findById(id) {
    throw new Error("Method 'findById' must be implemented.");
  }

  async findBySlug(slug) {
    throw new Error("Method 'findBySlug' must be implemented.");
  }

  async find(query, option) {
    throw new Error("Method 'find' must be implemented.");
  }

  async update(filter) {
    throw new Error("Method 'filter' must be implemented.");
  }
}
export { BaseClientRepository };
