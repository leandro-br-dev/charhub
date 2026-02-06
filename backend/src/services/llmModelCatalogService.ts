/**
 * LLM Model Catalog Service
 *
 * Service for managing the LLM model catalog with caching support.
 * Provides CRUD operations for LLM models used throughout the application.
 */

import { prisma } from '../config/database';
import { LLMModelCategory, LLMModelType } from '../generated/prisma';
import { logger } from '../config/logger';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface LLMModelInput {
  provider: string;
  name: string;
  displayName: string;
  category: LLMModelCategory;
  type: LLMModelType;
  contextWindow: number;
  maxOutput: number;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
  description?: string;
  version?: string;
  source?: string;
}

export interface LLMModelUpdate {
  displayName?: string;
  category?: LLMModelCategory;
  type?: LLMModelType;
  contextWindow?: number;
  maxOutput?: number;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
  description?: string;
  version?: string;
  source?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}

export interface LLMModelFilters {
  provider?: string;
  category?: LLMModelCategory;
  type?: LLMModelType;
  isActive?: boolean;
  isAvailable?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
}

export interface LLMModelResponse {
  id: string;
  provider: string;
  name: string;
  displayName: string;
  category: LLMModelCategory;
  type: LLMModelType;
  contextWindow: number;
  maxOutput: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  description: string | null;
  isActive: boolean;
  isAvailable: boolean;
  version: string;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Cache Management
// ============================================================================

class ModelCache {
  private cache: Map<string, LLMModelResponse[]> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  isValid(): boolean {
    return this.cache !== null && Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  set(data: LLMModelResponse[]): void {
    this.cache = new Map();
    this.cacheTimestamp = Date.now();

    // Group by provider for efficient filtering
    const grouped = new Map<string, LLMModelResponse[]>();
    for (const model of data) {
      if (!grouped.has(model.provider)) {
        grouped.set(model.provider, []);
      }
      grouped.get(model.provider)!.push(model);
    }

    this.cache = grouped;
  }

  get(filters?: LLMModelFilters): LLMModelResponse[] | null {
    if (!this.isValid()) {
      return null;
    }

    if (!filters || Object.keys(filters).length === 0) {
      // Return all models from cache
      const allModels: LLMModelResponse[] = [];
      for (const models of this.cache!.values()) {
        allModels.push(...models);
      }
      return allModels;
    }

    // Apply filters
    const results: LLMModelResponse[] = [];

    for (const [provider, models] of this.cache!) {
      // Provider filter
      if (filters.provider && provider !== filters.provider) {
        continue;
      }

      // Apply other filters
      const filtered = models.filter((model) => {
        if (filters.category !== undefined && model.category !== filters.category) {
          return false;
        }
        if (filters.type !== undefined && model.type !== filters.type) {
          return false;
        }
        if (filters.isActive !== undefined && model.isActive !== filters.isActive) {
          return false;
        }
        if (filters.isAvailable !== undefined && model.isAvailable !== filters.isAvailable) {
          return false;
        }
        if (filters.supportsTools !== undefined && model.supportsTools !== filters.supportsTools) {
          return false;
        }
        if (filters.supportsVision !== undefined && model.supportsVision !== filters.supportsVision) {
          return false;
        }
        if (filters.supportsReasoning !== undefined && model.supportsReasoning !== filters.supportsReasoning) {
          return false;
        }
        return true;
      });

      results.push(...filtered);
    }

    return results;
  }

  clear(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  invalidate(): void {
    this.clear();
  }
}

const cache = new ModelCache();

// ============================================================================
// Service Class
// ============================================================================

class LLMModelCatalogService {
  /**
   * Get all models with optional filtering
   */
  async getAll(filters?: LLMModelFilters, useCache = true): Promise<LLMModelResponse[]> {
    // Check cache first
    if (useCache) {
      const cached = cache.get(filters);
      if (cached) {
        return cached;
      }
    }

    // Build where clause from filters
    const where: any = {};

    if (filters?.provider) {
      where.provider = filters.provider;
    }
    if (filters?.category !== undefined) {
      where.category = filters.category;
    }
    if (filters?.type !== undefined) {
      where.type = filters.type;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
    }
    if (filters?.supportsTools !== undefined) {
      where.supportsTools = filters.supportsTools;
    }
    if (filters?.supportsVision !== undefined) {
      where.supportsVision = filters.supportsVision;
    }
    if (filters?.supportsReasoning !== undefined) {
      where.supportsReasoning = filters.supportsReasoning;
    }

    const models = await prisma.lLMModelCatalog.findMany({
      where,
      orderBy: [
        { provider: 'asc' },
        { name: 'asc' },
      ],
    });

    // Update cache
    if (!filters || Object.keys(filters).length === 0) {
      cache.set(models);
    }

    return models;
  }

  /**
   * Get model by ID
   */
  async getById(id: string): Promise<LLMModelResponse | null> {
    const model = await prisma.lLMModelCatalog.findUnique({
      where: { id },
    });

    return model;
  }

  /**
   * Get model by provider and name
   */
  async getByProviderAndName(provider: string, name: string): Promise<LLMModelResponse | null> {
    const model = await prisma.lLMModelCatalog.findFirst({
      where: {
        provider,
        name,
      },
    });

    return model;
  }

  /**
   * Create a new model
   */
  async create(data: LLMModelInput, userId?: string): Promise<LLMModelResponse> {
    const model = await prisma.lLMModelCatalog.create({
      data: {
        provider: data.provider,
        name: data.name,
        displayName: data.displayName,
        category: data.category,
        type: data.type,
        contextWindow: data.contextWindow,
        maxOutput: data.maxOutput,
        supportsTools: data.supportsTools ?? false,
        supportsVision: data.supportsVision ?? false,
        supportsReasoning: data.supportsReasoning ?? false,
        description: data.description,
        version: data.version ?? '1.0.0',
        source: data.source,
      },
    });

    // Invalidate cache
    cache.invalidate();

    logger.info(
      {
        modelId: model.id,
        provider: model.provider,
        name: model.name,
        userId,
      },
      'LLM model created'
    );

    return model;
  }

  /**
   * Update an existing model
   */
  async update(id: string, data: LLMModelUpdate, userId?: string): Promise<LLMModelResponse> {
    const model = await prisma.lLMModelCatalog.update({
      where: { id },
      data,
    });

    // Invalidate cache
    cache.invalidate();

    logger.info(
      {
        modelId: model.id,
        provider: model.provider,
        name: model.name,
        userId,
      },
      'LLM model updated'
    );

    return model;
  }

  /**
   * Delete a model (hard delete)
   */
  async delete(id: string, userId?: string): Promise<void> {
    await prisma.lLMModelCatalog.delete({
      where: { id },
    });

    // Invalidate cache
    cache.invalidate();

    logger.info(
      {
        modelId: id,
        userId,
      },
      'LLM model deleted'
    );
  }

  /**
   * Toggle model availability
   */
  async toggleAvailability(id: string, userId?: string): Promise<LLMModelResponse> {
    const current = await prisma.lLMModelCatalog.findUnique({
      where: { id },
    });

    if (!current) {
      throw new Error(`Model with ID ${id} not found`);
    }

    const updated = await prisma.lLMModelCatalog.update({
      where: { id },
      data: {
        isAvailable: !current.isAvailable,
      },
    });

    // Invalidate cache
    cache.invalidate();

    logger.info(
      {
        modelId: updated.id,
        provider: updated.provider,
        name: updated.name,
        isAvailable: updated.isAvailable,
        userId,
      },
      'LLM model availability toggled'
    );

    return updated;
  }

  /**
   * Check if a model exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.lLMModelCatalog.count({
      where: { id },
    });

    return count > 0;
  }

  /**
   * Check if a model exists by provider and name
   */
  async existsByProviderAndName(provider: string, name: string): Promise<boolean> {
    const count = await prisma.lLMModelCatalog.count({
      where: {
        provider,
        name,
      },
    });

    return count > 0;
  }

  /**
   * Get all available providers
   */
  async getProviders(): Promise<string[]> {
    const models = await prisma.lLMModelCatalog.findMany({
      where: {
        isActive: true,
      },
      select: {
        provider: true,
      },
      distinct: ['provider'],
    });

    return models.map((m) => m.provider).sort();
  }

  /**
   * Get models grouped by provider
   */
  async getByProvider(): Promise<Map<string, LLMModelResponse[]>> {
    const models = await this.getAll({ isActive: true, isAvailable: true });

    const grouped = new Map<string, LLMModelResponse[]>();

    for (const model of models) {
      if (!grouped.has(model.provider)) {
        grouped.set(model.provider, []);
      }
      grouped.get(model.provider)!.push(model);
    }

    return grouped;
  }

  /**
   * Refresh cache (called after bulk updates)
   */
  async refreshCache(): Promise<void> {
    cache.invalidate();
    await this.getAll({}, true); // Rebuild cache
  }

  /**
   * Clear cache (called for manual cache invalidation)
   */
  clearCache(): void {
    cache.invalidate();
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const llmModelCatalogService = new LLMModelCatalogService();
