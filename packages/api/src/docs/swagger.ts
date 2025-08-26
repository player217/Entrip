import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Entrip API',
    version: '1.0.0',
    description: 'Travel agency management system API',
    contact: {
      name: 'Entrip Support',
      email: 'support@entrip.co.kr',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Development server',
    },
    {
      url: 'https://api.entrip.co.kr/v1',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Bookings', description: 'Booking management' },
    { name: 'Calendar', description: 'Calendar and scheduling' },
    { name: 'Accounts', description: 'Account management' },
    { name: 'Finance', description: 'Financial operations' },
    { name: 'Approvals', description: 'Approval workflows' },
    { name: 'Payments', description: 'Payment processing' },
    { name: 'Messaging', description: 'In-app messaging' },
    { name: 'Mail', description: 'Email operations' },
    { name: 'Notifications', description: 'Push notifications' },
  ],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', default: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          teamName: { type: 'string' },
          type: { 
            type: 'string',
            enum: ['incentive', 'golf', 'honeymoon', 'airtel', 'workshop', 'reward', 'teambuilding']
          },
          origin: { type: 'string' },
          destination: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          totalPax: { type: 'integer', minimum: 1 },
          coordinator: { type: 'string' },
          revenue: { type: 'number', nullable: true },
          notes: { type: 'string', nullable: true },
          status: { 
            type: 'string',
            enum: ['pending', 'confirmed', 'completed', 'cancelled']
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BookingCreate: {
        type: 'object',
        required: ['teamName', 'type', 'origin', 'destination', 'startDate', 'endDate', 'totalPax', 'coordinator'],
        properties: {
          teamName: { type: 'string', minLength: 1 },
          type: { 
            type: 'string',
            enum: ['incentive', 'golf', 'honeymoon', 'airtel', 'workshop', 'reward', 'teambuilding']
          },
          origin: { type: 'string', minLength: 1 },
          destination: { type: 'string', minLength: 1 },
          startDate: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          endDate: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          totalPax: { type: 'integer', minimum: 1 },
          coordinator: { type: 'string', minLength: 1 },
          revenue: { type: 'number', minimum: 0, nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },
      BookingUpdate: {
        type: 'object',
        properties: {
          teamName: { type: 'string', minLength: 1 },
          type: { 
            type: 'string',
            enum: ['incentive', 'golf', 'honeymoon', 'airtel', 'workshop', 'reward', 'teambuilding']
          },
          origin: { type: 'string', minLength: 1 },
          destination: { type: 'string', minLength: 1 },
          startDate: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          endDate: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          totalPax: { type: 'integer', minimum: 1 },
          coordinator: { type: 'string', minLength: 1 },
          revenue: { type: 'number', minimum: 0, nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },
      BookingStatusPatch: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string',
            enum: ['pending', 'confirmed', 'completed', 'cancelled']
          },
          notes: { type: 'string', nullable: true },
        },
      },
      // Auth schemas
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          role: { type: 'string', enum: ['admin', 'staff'], default: 'staff' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'staff'] },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'staff'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // Calendar schemas
      CalendarEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
          title: { type: 'string', example: 'Team Meeting' },
          start: { type: 'string', format: 'date-time', example: '2024-01-15T10:00:00Z' },
          end: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00Z' },
          allDay: { type: 'boolean', example: false },
          color: { type: 'string', pattern: '^#[0-9A-F]{6}$', example: '#3B82F6' },
          description: { type: 'string', nullable: true, example: 'Weekly team sync meeting' },
          location: { type: 'string', nullable: true, example: 'Conference Room A' },
          teamId: { type: 'string', nullable: true, example: 'team-123' },
          status: { 
            type: 'string',
            enum: ['confirmed', 'pending', 'cancelled'],
            example: 'confirmed'
          },
          createdBy: { type: 'string', example: 'user-123' },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-10T09:00:00Z' },
          updatedBy: { type: 'string', nullable: true, example: 'user-456' },
          updatedAt: { type: 'string', format: 'date-time', nullable: true, example: '2024-01-12T14:30:00Z' },
        },
      },
      CalendarCreate: {
        type: 'object',
        required: ['title', 'start', 'end'],
        properties: {
          title: { type: 'string', minLength: 2 },
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
          allDay: { type: 'boolean', default: false },
          color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          description: { type: 'string' },
          location: { type: 'string' },
          teamId: { type: 'string' },
        },
      },
      CalendarUpdate: {
        type: 'object',
        required: ['title', 'start', 'end'],
        properties: {
          title: { type: 'string', minLength: 2 },
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
          allDay: { type: 'boolean', default: false },
          color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          description: { type: 'string' },
          location: { type: 'string' },
          teamId: { type: 'string' },
          status: { 
            type: 'string',
            enum: ['confirmed', 'pending', 'cancelled'],
            default: 'confirmed'
          },
        },
      },
      CalendarStatusPatch: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string',
            enum: ['confirmed', 'pending', 'cancelled']
          },
          notes: { type: 'string', nullable: true },
        },
      },
      Account: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'acc-123' },
          name: { type: 'string', example: 'Entrip Travel Agency' },
          email: { type: 'string', format: 'email', example: 'contact@entrip.com' },
          phone: { type: 'string', nullable: true, example: '01012345678' },
          role: { 
            type: 'string',
            enum: ['admin', 'staff', 'viewer'],
            example: 'admin'
          },
          status: { 
            type: 'string',
            enum: ['active', 'suspended', 'deleted'],
            example: 'active'
          },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AccountCreate: {
        type: 'object',
        required: ['name', 'email', 'role'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', pattern: '^01[0-9]{8,9}$', nullable: true },
          role: { 
            type: 'string',
            enum: ['admin', 'staff', 'viewer']
          },
        },
      },
      AccountUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', pattern: '^01[0-9]{8,9}$', nullable: true },
          role: { 
            type: 'string',
            enum: ['admin', 'staff', 'viewer']
          },
          status: { 
            type: 'string',
            enum: ['active', 'suspended', 'deleted']
          },
        },
      },
      Finance: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'fin-123' },
          type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
          category: { type: 'string', example: 'Travel' },
          amount: { type: 'number', example: 50000 },
          currency: { type: 'string', example: 'KRW' },
          exchangeRate: { type: 'number', example: 1 },
          occurredAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:00:00Z' },
          description: { type: 'string', nullable: true, example: 'Taxi fare to airport' },
          accountId: { type: 'string', nullable: true, example: 'acc-123' },
          projectId: { type: 'string', nullable: true, example: 'proj-456' },
          status: { 
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'deleted'],
            example: 'pending'
          },
          createdBy: { type: 'string', example: 'user-123' },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
          updatedBy: { type: 'string', nullable: true },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          approvedBy: { type: 'string', nullable: true },
          approvedAt: { type: 'string', format: 'date-time', nullable: true },
          rejectedBy: { type: 'string', nullable: true },
          rejectedAt: { type: 'string', format: 'date-time', nullable: true },
          remarks: { type: 'string', nullable: true },
        },
      },
      FinanceCreate: {
        type: 'object',
        required: ['type', 'category', 'amount', 'occurredAt'],
        properties: {
          type: { type: 'string', enum: ['income', 'expense'] },
          category: { type: 'string', minLength: 1, maxLength: 50 },
          amount: { type: 'number', minimum: 0.01 },
          currency: { type: 'string', length: 3, default: 'KRW' },
          exchangeRate: { type: 'number', minimum: 0.01, default: 1 },
          occurredAt: { type: 'string', format: 'date-time' },
          description: { type: 'string', maxLength: 500, nullable: true },
          accountId: { type: 'string', nullable: true },
          projectId: { type: 'string', nullable: true },
        },
      },
      FinanceUpdate: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'expense'] },
          category: { type: 'string', minLength: 1, maxLength: 50 },
          amount: { type: 'number', minimum: 0.01 },
          currency: { type: 'string', length: 3 },
          exchangeRate: { type: 'number', minimum: 0.01 },
          occurredAt: { type: 'string', format: 'date-time' },
          description: { type: 'string', maxLength: 500, nullable: true },
          accountId: { type: 'string', nullable: true },
          projectId: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'deleted'] },
        },
      },
      FinanceStats: {
        type: 'object',
        properties: {
          income: { type: 'number', example: 1500000 },
          expense: { type: 'number', example: 350000 },
          balance: { type: 'number', example: 1150000 },
          byCategory: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                income: { type: 'number' },
                expense: { type: 'number' },
              },
            },
          },
        },
      },
      FinanceApprove: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string', 
            enum: ['approved', 'rejected'],
            description: 'Approval status' 
          },
          remarks: { 
            type: 'string', 
            maxLength: 500,
            description: 'Optional remarks for the approval decision' 
          },
        },
      },
      // Approval schemas
      Approval: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'appr-123' },
          title: { type: 'string', example: 'Travel Expense Approval' },
          content: { type: 'string', example: 'Business trip to Seoul' },
          targetType: { 
            type: 'string', 
            enum: ['finance', 'custom'],
            example: 'finance' 
          },
          targetId: { type: 'string', nullable: true, example: 'fin-456' },
          amount: { type: 'number', nullable: true, example: 500000 },
          currency: { type: 'string', example: 'KRW' },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            example: 'pending'
          },
          currentStep: { type: 'integer', example: 0 },
          steps: {
            type: 'array',
            items: { $ref: '#/components/schemas/ApprovalStep' }
          },
          requesterId: { type: 'string', example: 'user-123' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ApprovalStep: {
        type: 'object',
        properties: {
          approverId: { type: 'string', example: 'approver-123' },
          order: { type: 'integer', example: 0 },
          action: { 
            type: 'string', 
            enum: ['approve', 'reject'],
            nullable: true,
            example: 'approve'
          },
          comment: { type: 'string', nullable: true, example: 'Looks good' },
          actedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ApprovalCreate: {
        type: 'object',
        required: ['title', 'content', 'targetType', 'steps'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          content: { type: 'string', minLength: 1, maxLength: 2000 },
          targetType: { type: 'string', enum: ['finance', 'custom'] },
          targetId: { type: 'string', description: 'ID of related record' },
          amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', default: 'KRW' },
          steps: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['approverId', 'order'],
              properties: {
                approverId: { type: 'string' },
                order: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
      ApprovalUpdate: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          content: { type: 'string', minLength: 1, maxLength: 2000 },
          steps: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                approverId: { type: 'string' },
                order: { type: 'integer', minimum: 0 },
              },
            },
          },
          status: { type: 'string', enum: ['cancelled'] },
        },
      },
      ApprovalAction: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['approve', 'reject'] },
          comment: { type: 'string', maxLength: 500 },
        },
      },
      ApprovalStats: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          pending: { type: 'integer', example: 25 },
          approved: { type: 'integer', example: 60 },
          rejected: { type: 'integer', example: 10 },
          cancelled: { type: 'integer', example: 5 },
          avgApprovalTime: { 
            type: 'number', 
            description: 'Average approval time in hours',
            example: 24 
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    // Auth endpoints
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/UserResponse' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          409: {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout user',
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Booking endpoints
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List all bookings',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Booking' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Create a new booking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Booking created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Booking ID',
          },
        ],
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Booking not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Bookings'],
        summary: 'Update booking',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Booking ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingUpdate' },
            },
          },
        },
        responses: {
          200: {
            description: 'Booking updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Booking not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Bookings'],
        summary: 'Delete booking',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Booking ID',
          },
        ],
        responses: {
          204: {
            description: 'Booking deleted',
          },
          404: {
            description: 'Booking not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}/status': {
      patch: {
        tags: ['Bookings'],
        summary: 'Update booking status',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Booking ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingStatusPatch' },
            },
          },
        },
        responses: {
          200: {
            description: 'Status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Booking not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Calendar endpoints
    '/calendar': {
      get: {
        tags: ['Calendar'],
        summary: 'Get calendar events for a specific month',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'year',
            in: 'query',
            required: true,
            schema: { type: 'integer', minimum: 2000, maximum: 2100 },
            description: 'Year (2000-2100)',
          },
          {
            name: 'month',
            in: 'query',
            required: true,
            schema: { type: 'integer', minimum: 1, maximum: 12 },
            description: 'Month (1-12)',
          },
          {
            name: 'team',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by team ID',
          },
        ],
        responses: {
          200: {
            description: 'List of calendar events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CalendarEvent' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Calendar'],
        summary: 'Create a new calendar event',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CalendarCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Event created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/CalendarEvent' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/calendar/{id}': {
      get: {
        tags: ['Calendar'],
        summary: 'Get calendar event by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID',
          },
        ],
        responses: {
          200: {
            description: 'Calendar event details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/CalendarEvent' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Calendar'],
        summary: 'Update calendar event',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CalendarUpdate' },
            },
          },
        },
        responses: {
          200: {
            description: 'Event updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/CalendarEvent' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Calendar'],
        summary: 'Delete calendar event',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID',
          },
        ],
        responses: {
          200: {
            description: 'Event deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/calendar/{id}/status': {
      patch: {
        tags: ['Calendar'],
        summary: 'Update calendar event status only',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CalendarStatusPatch' },
            },
          },
        },
        responses: {
          200: {
            description: 'Status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/CalendarEvent' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Accounts endpoints
    '/accounts': {
      get: {
        tags: ['Accounts'],
        summary: 'List accounts with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'suspended', 'deleted'] } },
          { in: 'query', name: 'role', schema: { type: 'string', enum: ['admin', 'staff', 'viewer'] } },
          { in: 'query', name: 'keyword', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Accounts list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Account' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Accounts'],
        summary: 'Create new account (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AccountCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Account' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          409: {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/accounts/{id}': {
      get: {
        tags: ['Accounts'],
        summary: 'Get account by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Account details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Account' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Accounts'],
        summary: 'Update account (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AccountUpdate' },
            },
          },
        },
        responses: {
          200: {
            description: 'Account updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Account' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          409: {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Accounts'],
        summary: 'Delete account (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Account deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Finance endpoints
    '/finance': {
      get: {
        tags: ['Finance'],
        summary: 'List finance records with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { in: 'query', name: 'type', schema: { type: 'string', enum: ['income', 'expense'] } },
          { in: 'query', name: 'category', schema: { type: 'string' } },
          { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'minAmount', schema: { type: 'number', minimum: 0 } },
          { in: 'query', name: 'maxAmount', schema: { type: 'number', minimum: 0 } },
          { in: 'query', name: 'keyword', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'deleted'] } },
          { in: 'query', name: 'accountId', schema: { type: 'string' } },
          { in: 'query', name: 'projectId', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Finance records list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Finance' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Finance'],
        summary: 'Create new finance record (admin, staff)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FinanceCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Finance record created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Finance' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/finance/stats': {
      get: {
        tags: ['Finance'],
        summary: 'Get financial statistics',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'year', schema: { type: 'integer', example: 2024 } },
          { in: 'query', name: 'month', schema: { type: 'integer', minimum: 1, maximum: 12 } },
        ],
        responses: {
          200: {
            description: 'Financial statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/FinanceStats' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/finance/{id}': {
      get: {
        tags: ['Finance'],
        summary: 'Get finance record by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Finance record details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Finance' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Finance record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Finance'],
        summary: 'Update finance record (admin, staff)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FinanceUpdate' },
            },
          },
        },
        responses: {
          200: {
            description: 'Finance record updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Finance' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Finance record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Finance'],
        summary: 'Delete finance record (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Finance record deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Finance record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/finance/{id}/approve': {
      patch: {
        tags: ['Finance'],
        summary: 'Approve or reject finance record (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FinanceApprove' },
            },
          },
        },
        responses: {
          200: {
            description: 'Finance record status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Finance' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid status transition',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin only',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Finance record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Approval endpoints
    '/approvals': {
      get: {
        tags: ['Approvals'],
        summary: 'List approval requests with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] } },
          { in: 'query', name: 'requesterId', schema: { type: 'string' } },
          { in: 'query', name: 'approverId', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Approval list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Approval' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Approvals'],
        summary: 'Create new approval request',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApprovalCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Approval created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Approval' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Target record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/approvals/stats': {
      get: {
        tags: ['Approvals'],
        summary: 'Get approval statistics',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'year', schema: { type: 'integer', example: 2024 } },
          { in: 'query', name: 'month', schema: { type: 'integer', minimum: 1, maximum: 12 } },
        ],
        responses: {
          200: {
            description: 'Approval statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/ApprovalStats' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/approvals/{id}': {
      get: {
        tags: ['Approvals'],
        summary: 'Get approval by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Approval details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Approval' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Approval not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Approvals'],
        summary: 'Update approval (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApprovalUpdate' },
            },
          },
        },
        responses: {
          200: {
            description: 'Approval updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Approval' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Cannot update non-pending approval',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin only',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Approval not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Approvals'],
        summary: 'Delete approval (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Approval deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin only',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Approval not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/approvals/{id}/action': {
      post: {
        tags: ['Approvals'],
        summary: 'Approve or reject request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApprovalAction' },
            },
          },
        },
        responses: {
          200: {
            description: 'Action performed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Approval' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid action',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Not authorized to approve',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Approval not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          409: {
            description: 'Conflict - Already acted or invalid status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
};

export const setupSwagger = (app: Application) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};