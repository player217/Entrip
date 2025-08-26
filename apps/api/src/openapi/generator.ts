import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Import schemas
import {
  ErrorResponse,
  IdParams,
  CursorQuery,
  PaginationQuery,
  IfMatchHeader,
  IfNoneMatchHeader
} from '../schemas/common.schema';

import {
  Booking,
  BookingListItem,
  BookingResponse,
  BookingListResponse,
  BookingCreateResponse,
  BookingUpdateResponse,
  BookingStatusResponse,
  BookingCreateSchema,
  BookingUpdateSchema,
  BookingListSchema,
  CurrencyEnum,
  BookingStatusSchema
} from '../schemas/booking.schema';

// Extend Zod with OpenAPI
extendZodWithOpenApi(z);

// Create registry
const registry = new OpenAPIRegistry();

// Register common components with proper metadata
const errorResponseSchema = ErrorResponse.openapi({
  description: 'Standard error response format',
  example: {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          field: 'customerName',
          message: 'Customer name is required',
          code: 'required'
        }
      ],
      traceId: 'req_123456789'
    }
  }
});

registry.register('ErrorResponse', errorResponseSchema);

registry.register('CurrencyEnum', CurrencyEnum.openapi({
  description: 'Supported currencies',
  example: 'KRW'
}));

registry.register('BookingStatusEnum', BookingStatusSchema.openapi({
  description: 'Booking status values',
  example: 'CONFIRMED'
}));

// Register booking schemas
registry.register('Booking', Booking.openapi({
  description: 'Complete booking entity',
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'BK-2025-001',
    amount: '1500000.00',
    currency: 'KRW',
    status: 'CONFIRMED',
    customerName: '홍길동',
    customerPhone: '010-1234-5678',
    customerEmail: 'hong@example.com',
    itineraryFrom: 'ICN',
    itineraryTo: 'JFK',
    departAt: '2025-03-01T10:00:00.000Z',
    arriveAt: '2025-03-01T22:00:00.000Z',
    managerId: '550e8400-e29b-41d4-a716-446655440001',
    companyCode: 'ENTRIP_MAIN',
    notes: 'Business trip to New York',
    version: 1,
    createdAt: '2025-01-28T10:00:00.000Z',
    updatedAt: '2025-01-28T10:00:00.000Z'
  }
}));

registry.register('BookingListItem', BookingListItem.openapi({
  description: 'Booking list item (selected fields)',
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'BK-2025-001',
    amount: '1500000.00',
    currency: 'KRW',
    status: 'CONFIRMED',
    customerName: '홍길동',
    itineraryFrom: 'ICN',
    itineraryTo: 'JFK',
    departAt: '2025-03-01T10:00:00.000Z',
    arriveAt: '2025-03-01T22:00:00.000Z',
    createdAt: '2025-01-28T10:00:00.000Z',
    version: 1
  }
}));

registry.register('BookingResponse', BookingResponse.openapi({
  description: 'Single booking response'
}));

registry.register('BookingListResponse', BookingListResponse.openapi({
  description: 'Paginated booking list response'
}));

registry.register('BookingCreateResponse', BookingCreateResponse.openapi({
  description: 'Booking creation response'
}));

registry.register('BookingUpdateResponse', BookingUpdateResponse.openapi({
  description: 'Booking update response'
}));

registry.register('BookingStatusResponse', BookingStatusResponse.openapi({
  description: 'Booking status change response'
}));

// Register API paths

// GET /api/v1/bookings
registry.registerPath({
  method: 'get',
  path: '/api/v1/bookings',
  description: 'Get paginated list of bookings',
  summary: 'List bookings',
  tags: ['Bookings'],
  request: {
    query: BookingListSchema.query.openapi({
      description: 'Query parameters for filtering and pagination'
    })
  },
  responses: {
    200: {
      description: 'Successfully retrieved bookings',
      content: {
        'application/json': {
          schema: BookingListResponse
        }
      }
    },
    400: {
      description: 'Invalid query parameters',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    }
  }
});

// GET /api/v1/bookings/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/bookings/{id}',
  description: 'Get a single booking by ID',
  summary: 'Get booking',
  tags: ['Bookings'],
  request: {
    params: IdParams.openapi({
      description: 'Booking ID parameter'
    }),
    headers: IfNoneMatchHeader.openapi({
      description: 'Conditional request headers for caching'
    })
  },
  responses: {
    200: {
      description: 'Successfully retrieved booking',
      headers: {
        'ETag': {
          description: 'Entity tag for caching',
          schema: { type: 'string' }
        },
        'Cache-Control': {
          description: 'Cache control header',
          schema: { type: 'string' }
        }
      },
      content: {
        'application/json': {
          schema: BookingResponse
        }
      }
    },
    304: {
      description: 'Not modified (cached version is current)'
    },
    404: {
      description: 'Booking not found',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    }
  }
});

// POST /api/v1/bookings
registry.registerPath({
  method: 'post',
  path: '/api/v1/bookings',
  description: 'Create a new booking',
  summary: 'Create booking',
  tags: ['Bookings'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Booking creation data',
      content: {
        'application/json': {
          schema: BookingCreateSchema.body.openapi({
            description: 'Booking creation payload'
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Booking created successfully',
      headers: {
        'ETag': {
          description: 'Entity tag for the created resource',
          schema: { type: 'string' }
        }
      },
      content: {
        'application/json': {
          schema: BookingCreateResponse
        }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    403: {
      description: 'Insufficient permissions',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    409: {
      description: 'Booking already exists (duplicate code)',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    }
  }
});

// PATCH /api/v1/bookings/{id}
registry.registerPath({
  method: 'patch',
  path: '/api/v1/bookings/{id}',
  description: 'Update an existing booking',
  summary: 'Update booking',
  tags: ['Bookings'],
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParams,
    headers: IfMatchHeader.openapi({
      description: 'Required If-Match header for optimistic locking'
    }),
    body: {
      description: 'Booking update data',
      content: {
        'application/json': {
          schema: BookingUpdateSchema.body.openapi({
            description: 'Booking update payload (partial)'
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Booking updated successfully',
      headers: {
        'ETag': {
          description: 'New entity tag after update',
          schema: { type: 'string' }
        }
      },
      content: {
        'application/json': {
          schema: BookingUpdateResponse
        }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    404: {
      description: 'Booking not found',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    412: {
      description: 'Precondition failed (ETag mismatch)',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    428: {
      description: 'Precondition required (If-Match header missing)',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    }
  }
});

// DELETE /api/v1/bookings/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/bookings/{id}',
  description: 'Delete a booking',
  summary: 'Delete booking',
  tags: ['Bookings'],
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParams,
    headers: IfMatchHeader.openapi({
      description: 'Required If-Match header for optimistic locking'
    })
  },
  responses: {
    204: {
      description: 'Booking deleted successfully'
    },
    404: {
      description: 'Booking not found',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    412: {
      description: 'Precondition failed (ETag mismatch)',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    428: {
      description: 'Precondition required (If-Match header missing)',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponse
        }
      }
    }
  }
});

// Generate OpenAPI document
const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Entrip API',
    version: '2.0.0',
    description: `
# Entrip API v2

Enhanced API with schema-based validation and automatic OpenAPI generation.

## Features
- **Schema-driven**: All requests and responses validated with Zod
- **Optimistic Locking**: ETag/If-Match support for data consistency
- **Caching**: If-None-Match support for efficient data transfer
- **Standard Errors**: Consistent error format with trace IDs
- **Type Safety**: Full TypeScript support with generated types

## Authentication
Most endpoints require Bearer token authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Caching & Optimistic Locking
- **GET requests**: Include If-None-Match header for 304 responses
- **PUT/PATCH/DELETE**: Include If-Match header for optimistic locking
- **ETag**: All mutable resources return ETag headers

## Error Handling
All errors follow the standard format with:
- \`code\`: Error type identifier
- \`message\`: Human-readable description
- \`details\`: Additional error context (optional)
- \`traceId\`: Request trace identifier for debugging
    `.trim(),
    contact: {
      name: 'Entrip Development Team',
      email: 'dev@entrip.io',
      url: 'https://github.com/entrip/api'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:4001',
      description: 'Development server'
    },
    {
      url: 'https://api-dev.entrip.io',
      description: 'Development environment'
    },
    {
      url: 'https://api-staging.entrip.io',
      description: 'Staging environment'
    },
    {
      url: 'https://api.entrip.io',
      description: 'Production environment'
    }
  ],
  tags: [
    {
      name: 'Bookings',
      description: 'Booking management operations'
    }
  ]
});

// Add security schemes after document creation
document.components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Bearer token authentication'
    }
  }
};

// Output the JSON document
console.log(JSON.stringify(document, null, 2));