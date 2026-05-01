import { BaseRepository } from "./baseRepository.js";

class ApiHitRepository extends BaseRepository {
  constructor({ logger: l = console }) {
    super({ logger: l });
  }

    async save(data){
        this.logger.info("Saving API hit", data);
    }

    async find(query){
        this.logger.info("Finding API hit", query);
    }

    async count(query){
        this.logger.info("Counting API hits", query);
    }

    async deleteOldHits(query){
        this.logger.info("Deleting old API hits", query);
    }
}
