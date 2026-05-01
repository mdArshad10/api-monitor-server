class BaseApiKeyRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    throw new Error("Method 'create' must be implemented.");
  }

  async findByApiKeyValue(KeyValue, includeInactive) {
    throw new Error("Method 'findByApiKeyValue' must be implemented.");
  }

  async findByClientId(clientId, filter) {
    throw new Error("Method 'findByClientId' must be implemented.");
  }

  async countByClientId(clientId, filter) {
    throw new Error("Method 'countByClientId' must be implemented.");
  }
}

export { BaseApiKeyRepository };
