class ProcessorService {
  constructor({ apiHitRepository, metricsRepository }) {
    if (!apiHitRepository || !metricsRepository)
      throw new Error(
        "ProcessorService requires apiHitRepository and metricsRepository",
      );
      this.apiHitRepository = apiHitRepository;
      this.metricsRepository = metricsRepository;
  }

  async processEvent(data) {
    
  }
}

export { ProcessorService };
