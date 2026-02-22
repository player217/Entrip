import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Entrip API',
      version: '1.0.0',
      description: `
Entrip API v1 — 여행사 통합 관리 시스템 백엔드 API

**주요 기능:**
- 예약 관리 (생성, 조회, 수정, 삭제)
- 실시간 헬스체크 및 모니터링
- JWT 기반 인증 시스템
- 통합 오류 처리 및 검증

**버전 히스토리 보기:** [GitHub Releases](https://github.com/player217/Entrip/releases)

**개발 가이드:** 모든 API는 OpenAPI 3.1 스펙을 준수하며, 프로덕션 환경에서는 이 문서에 접근할 수 없습니다.
      `.trim(),
      contact: {
        name: 'Entrip Team',
        email: 'support@entrip.io',
        url: 'https://github.com/player217/Entrip/discussions'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://{environment}.entrip.io',
        description: 'Entrip API 서버',
        variables: {
          environment: {
            default: 'api',
            enum: ['api', 'api-dev', 'api-staging'],
            description: '환경'
          }
        }
      },
      {
        url: 'http://localhost:4000',
        description: '로컬 개발 서버'
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      responses: {
        BadRequest: {
          description: '잘못된 요청',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                ValidationError: {
                  summary: '입력 검증 실패',
                  value: {
                    code: 400,
                    message: '필수 필드가 누락되었습니다',
                    details: { field: 'customerName', constraint: 'required' }
                  }
                },
                DateRangeError: {
                  summary: '날짜 범위 오류',
                  value: {
                    code: 400,
                    message: '종료일은 시작일 이후여야 합니다',
                    details: { startDate: '2025-03-05', endDate: '2025-03-01' }
                  }
                }
              }
            }
          }
        },
        Unauthorized: {
          description: '인증 필요',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                MissingToken: {
                  summary: '토큰 누락',
                  value: {
                    code: 401,
                    message: '인증이 필요합니다',
                    details: { reason: 'missing_token' }
                  }
                },
                InvalidToken: {
                  summary: '유효하지 않은 토큰',
                  value: {
                    code: 401,
                    message: '유효하지 않은 토큰입니다',
                    details: { reason: 'invalid_token' }
                  }
                }
              }
            }
          }
        },
        Forbidden: {
          description: '권한 부족',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                InsufficientPermissions: {
                  summary: '권한 부족',
                  value: {
                    code: 403,
                    message: '이 리소스에 접근할 권한이 없습니다',
                    details: { resource: 'booking', action: 'delete' }
                  }
                },
                AdminOnly: {
                  summary: '관리자 권한 필요',
                  value: {
                    code: 403,
                    message: '관리자만 이 작업을 수행할 수 있습니다',
                    details: { requiredRole: 'admin', currentRole: 'user' }
                  }
                }
              }
            }
          }
        },
        NotFound: {
          description: '리소스 없음',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                BookingNotFound: {
                  summary: '예약 없음',
                  value: {
                    code: 404,
                    message: '요청한 예약을 찾을 수 없습니다',
                    details: { id: 'non-existent-id' }
                  }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: '서버 내부 오류',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                DatabaseError: {
                  summary: '데이터베이스 오류',
                  value: {
                    code: 500,
                    message: '서버에서 오류가 발생했습니다',
                    details: { timestamp: '2025-06-29T12:30:00.000Z' }
                  }
                }
              }
            }
          }
        },
        NoContent: {
          description: '성공적으로 처리되었으며 응답 본문이 없음'
        },
        ServiceUnavailable: {
          description: '서비스 일시적 이용 불가',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                MaintenanceMode: {
                  summary: '점검 중',
                  value: {
                    code: 503,
                    message: '서비스가 일시적으로 이용할 수 없습니다',
                    details: { retryAfter: 300 }
                  }
                },
                HealthCheckFailed: {
                  summary: '헬스체크 실패',
                  value: {
                    code: 503,
                    message: '서비스 상태 점검 실패',
                    details: { failedChecks: ['database', 'cache'] }
                  }
                }
              }
            }
          }
        }
      },
      parameters: {
        Page: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: '페이지 번호'
        },
        Limit: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: '페이지당 항목 수'
        },
        BookingStatus: {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
            enum: ['pending', 'confirmed', 'cancelled']
          },
          description: '예약 상태로 필터링'
        },
        Id: {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: '리소스 ID',
          example: '123e4567-e89b-12d3-a456-426614174000'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: 'HTTP 상태 코드',
              example: 400
            },
            message: {
              type: 'string',
              description: '사용자 친화적 에러 메시지',
              example: '필수 필드가 누락되었습니다'
            },
            details: {
              type: 'object',
              description: '상세 오류 정보 (선택적)',
              additionalProperties: true,
              example: {
                field: 'customerName',
                constraint: 'required'
              }
            }
          },
          required: ['code', 'message']
        },
        Booking: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '예약 ID',
              readOnly: true,
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            customerName: {
              type: 'string',
              description: '고객명'
            },
            destination: {
              type: 'string',
              description: '여행지'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: '출발일 (YYYY-MM-DD 형식)',
              example: '2025-02-01'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: '도착일 (YYYY-MM-DD 형식)',
              example: '2025-02-03'
            },
            paxCount: {
              type: 'integer',
              description: '인원수'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled'],
              description: '예약 상태',
              example: 'confirmed'
            },
            totalPrice: {
              type: 'number',
              description: '총 금액'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성일시 (ISO 8601 형식)',
              readOnly: true,
              example: '2025-01-28T10:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정일시 (ISO 8601 형식)',
              readOnly: true,
              example: '2025-01-28T10:00:00.000Z'
            }
          },
          required: ['customerName', 'destination', 'startDate', 'endDate', 'paxCount']
        },
        BookingCreateDTO: {
          type: 'object',
          properties: {
            customerName: {
              type: 'string',
              description: '고객명',
              example: '홍길동'
            },
            destination: {
              type: 'string',
              description: '여행지',
              example: '부산'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: '출발일 (YYYY-MM-DD 형식)',
              example: '2025-03-01'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: '도착일 (YYYY-MM-DD 형식)',
              example: '2025-03-03'
            },
            paxCount: {
              type: 'integer',
              description: '인원수',
              example: 4
            },
            totalPrice: {
              type: 'number',
              description: '총 금액 (선택적)',
              example: 1200000
            }
          },
          required: ['customerName', 'destination', 'startDate', 'endDate', 'paxCount']
        },
        BookingUpdateDTO: {
          type: 'object',
          properties: {
            customerName: {
              type: 'string',
              description: '고객명'
            },
            destination: {
              type: 'string',
              description: '여행지'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: '출발일 (YYYY-MM-DD 형식)'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: '도착일 (YYYY-MM-DD 형식)'
            },
            paxCount: {
              type: 'integer',
              description: '인원수'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled'],
              description: '예약 상태'
            },
            totalPrice: {
              type: 'number',
              description: '총 금액'
            }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: '현재 페이지 번호',
              example: 1
            },
            limit: {
              type: 'integer',
              description: '페이지당 항목 수',
              example: 10
            },
            total: {
              type: 'integer',
              description: '총 항목 수',
              example: 25
            },
            totalPages: {
              type: 'integer',
              description: '총 페이지 수',
              example: 3
            }
          },
          required: ['page', 'limit', 'total']
        },
        PaginatedBookings: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Booking'
              }
            },
            pagination: {
              $ref: '#/components/schemas/PaginationInfo'
            }
          },
          required: ['data', 'pagination']
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: '서버 상태 확인'
      },
      {
        name: 'Bookings',
        description: '예약 관리 API'
      }
    ]
  },
  apis: [
    path.join(__dirname, './routes/**/*.ts'),
    path.join(__dirname, './routes/**/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;