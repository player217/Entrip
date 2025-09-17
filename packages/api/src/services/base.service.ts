import { ApiError } from '../middlewares/error.middleware';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FilterOptions {
  [key: string]: any;
}

/**
 * Base service class with multi-tenancy support
 * All services should extend this class for consistent CRUD operations
 */
export abstract class BaseService<T> {
  protected model: any;

  constructor(model: any) {
    this.model = model;
  }

  /**
   * Add company filter to any query
   */
  protected withCompanyFilter(companyCode: string, filter: FilterOptions = {}): FilterOptions {
    return {
      ...filter,
      companyCode,
      deletedAt: null // Support soft delete
    };
  }

  /**
   * Build pagination options
   */
  protected buildPagination(options: PaginationOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));

    return {
      skip: (page - 1) * limit,
      take: limit
    };
  }

  /**
   * Find all records with pagination and company filtering
   */
  async findAll(
    companyCode: string,
    filter: FilterOptions = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const whereClause = this.withCompanyFilter(companyCode, filter);
    const pagination = this.buildPagination(options);

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        ...pagination,
        orderBy: {
          [options.orderBy || 'createdAt']: options.order || 'desc'
        }
      }),
      this.model.count({ where: whereClause })
    ]);

    return {
      data,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        total,
        pages: Math.ceil(total / (options.limit || 20))
      }
    };
  }

  /**
   * Find single record by ID with company validation
   */
  async findById(id: string, companyCode: string): Promise<T> {
    const item = await this.model.findFirst({
      where: {
        id,
        companyCode,
        deletedAt: null
      }
    });

    if (!item) {
      throw new ApiError(404, 'Resource not found or access denied');
    }

    return item;
  }

  /**
   * Create new record with company code
   */
  async create(companyCode: string, userId: string, data: any): Promise<T> {
    return this.model.create({
      data: {
        ...data,
        companyCode,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update record with company validation
   */
  async update(id: string, companyCode: string, data: any): Promise<T> {
    // First check if record exists and user has access
    await this.findById(id, companyCode);

    return this.model.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Soft delete record with company validation
   */
  async delete(id: string, companyCode: string): Promise<void> {
    // First check if record exists and user has access
    await this.findById(id, companyCode);

    // Soft delete by setting deletedAt
    await this.model.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }

  /**
   * Hard delete record (use with caution)
   */
  async hardDelete(id: string, companyCode: string): Promise<void> {
    // First check if record exists and user has access
    await this.findById(id, companyCode);

    await this.model.delete({
      where: { id }
    });
  }

  /**
   * Bulk create records
   */
  async bulkCreate(companyCode: string, userId: string, items: any[]): Promise<number> {
    const data = items.map(item => ({
      ...item,
      companyCode,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await this.model.createMany({
      data,
      skipDuplicates: true
    });

    return result.count;
  }

  /**
   * Bulk soft delete records
   */
  async bulkDelete(ids: string[], companyCode: string): Promise<number> {
    const result = await this.model.updateMany({
      where: {
        id: { in: ids },
        companyCode,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Check if record exists
   */
  async exists(id: string, companyCode: string): Promise<boolean> {
    const count = await this.model.count({
      where: {
        id,
        companyCode,
        deletedAt: null
      }
    });

    return count > 0;
  }

  /**
   * Get count of records
   */
  async count(companyCode: string, filter: FilterOptions = {}): Promise<number> {
    const whereClause = this.withCompanyFilter(companyCode, filter);
    return this.model.count({ where: whereClause });
  }
}