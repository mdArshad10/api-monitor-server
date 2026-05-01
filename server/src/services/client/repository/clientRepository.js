import { BaseClientRepository } from "./baseClientRepository.js";
import { logger } from "../../../shared/config/logger.js";
import { Client } from "../../../shared/models/client.model.js";
import mongoose from "mongoose";

class MongoClientRepository extends BaseClientRepository {
  constructor() {
    super(Client);
  }

  async create(data) {
    try {
      const client = new this.model(data);
      await client.save();
      logger.info("Client in MongoDB", {
        mongoId: client._id,
        slug: client.slug,
      });
      return client;
    } catch (error) {
      logger.error("Error in creating client", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      logger.info("find the client in MongoDB", {
        id,
      });
      const client = await this.model.findById(id);
      if (!client) {
        throw new Error(`Client not found with id: ${id}`);
      }
      return client;
    } catch (error) {
      logger.error("Error in finding client by id", error);
      throw error;
    }
  }

  async findBySlug(slug) {
    try {
      const client = await this.model.findOne({ slug });
      return client;
    } catch (error) {
      logger.error("Error in finding client by slug", error);
      throw error;
    }
  }

  async find(filter, option) {
    try {
      const { limit = 50, skip = 0, sort = { createdAt: -1 } } = option;
      const clients = await this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-__v");
      logger.info("get the clients in MongoDB", {
        mongoId: clients._id,
        slug: clients.slug,
      });
      return clients;
    } catch (error) {
      logger.error("Error in finding clients", error);
      throw error;
    }
  }

  async count(filter) {
    try {
      const count = await this.model.countDocuments(filter);
      logger.info("count the clients in MongoDB", {
        count,
      });
      return count;
    } catch (error) {
      logger.error("Error in counting clients", error);
      throw error;
    }
  }
}

export { MongoClientRepository };
