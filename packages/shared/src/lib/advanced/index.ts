/**
 * Advanced Features - Centralized exports
 * File handling, TypeScript utilities, and developer tools
 */

// File Handling
export {
  FileUploader,
  FileDownloader,
  FileValidator,
  FileProgressTracker,
  fileHandler,
  ValidationRules,
  type FileValidationRule,
  type UploadOptions,
  type DownloadOptions,
  type UploadProgress,
  type DownloadProgress,
  type FileUploadResult,
  type FileDownloadResult
} from './FileHandler';

// TypeScript Helpers
export {
  TypeScriptHelpers,
  defineEndpoint,
  buildUrl,
  createTypedRequest,
  createApiMethod,
  isApiResponse,
  isSuccessResponse,
  isErrorResponse,
  exampleEndpoints,
  type ExtractPathParams,
  type ApiEndpointDefinition,
  type ApiResponse,
  type PaginatedResponse,
  type TypedRequestConfig,
  type QueryOptions,
  type QueryResult,
  type MutationOptions,
  type MutationResult,
  type BaseEntity,
  type PartialEntity,
  type CreateEntity,
  type UpdateEntity,
  type EntityFilter,
  type EntityQueryParams,
  type FormValidation,
  type FormConfig,
  type FormState,
  type TypedApiClient,
  type DeepPartial,
  type DeepReadonly
} from './TypeScriptHelpers';

// Developer Tools
export {
  DebugManager,
  createDebugger,
  Profiler,
  ApiInspector,
  StateInspector,
  DevConsole,
  debug,
  DebugMethod,
  ProfileMethod,
  type DebugConfig,
  type DebugEntry,
  type ProfilerResult,
  type ApiInspectorData,
  type DevConsoleData
} from './DeveloperTools';

// Import needed classes and functions for AdvancedFeatures
import { 
  FileUploader,
  FileDownloader,
  FileValidator,
  ValidationRules 
} from './FileHandler';

import {
  DebugManager,
  Profiler,
  ApiInspector,
  DevConsole
} from './DeveloperTools';

import {
  defineEndpoint,
  buildUrl,
  createApiMethod
} from './TypeScriptHelpers';

// Advanced utilities and convenience functions
export const AdvancedFeatures = {
  // File operations
  uploadFile: FileUploader.upload,
  downloadFile: FileDownloader.download,
  autoDownload: FileDownloader.autoDownload,
  validateFile: FileValidator.validate,

  // Development utilities
  enableDebugConsole: DebugManager.enableGlobal,
  createProfiler: () => new Profiler(),
  inspectApi: () => ApiInspector.getData(),
  exportDebugData: () => DevConsole.export(),

  // TypeScript utilities
  defineApiEndpoint: defineEndpoint,
  buildTypedUrl: buildUrl,
  createApiMethod: createApiMethod,

  // Common validation rules
  validationRules: ValidationRules
};

// Configuration presets for different scenarios
export const AdvancedPresets = {
  // File upload configurations
  FILE_UPLOAD: {
    images: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      enableChunking: false,
      timeout: 30000
    },
    documents: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['application/pdf', 'application/msword'],
      enableChunking: true,
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      timeout: 120000
    },
    largeFiles: {
      maxSize: 1024 * 1024 * 1024, // 1GB
      enableChunking: true,
      chunkSize: 10 * 1024 * 1024, // 10MB chunks
      timeout: 600000, // 10 minutes
      enableRetry: true,
      maxRetries: 3
    }
  },

  // Debug configurations
  DEBUG: {
    development: {
      enabled: true,
      logLevel: 1, // DEBUG
      showStackTrace: true,
      enableRequestLogging: true,
      enablePerformanceLogging: true,
      namespace: 'dev'
    },
    production: {
      enabled: false,
      logLevel: 3, // WARN
      showStackTrace: false,
      enableRequestLogging: false,
      enablePerformanceLogging: false
    },
    testing: {
      enabled: true,
      logLevel: 2, // INFO
      showStackTrace: true,
      enableRequestLogging: false,
      enablePerformanceLogging: false,
      namespace: 'test'
    }
  }
};

// Setup function for advanced features
export function setupAdvancedFeatures(options: {
  enableDebugTools?: boolean;
  fileUploadConfig?: 'images' | 'documents' | 'largeFiles';
  debugConfig?: 'development' | 'production' | 'testing';
} = {}): void {
  const {
    enableDebugTools = process.env.NODE_ENV === 'development',
    fileUploadConfig = 'documents',
    debugConfig = process.env.NODE_ENV || 'development'
  } = options;

  // Enable debug tools if requested
  if (enableDebugTools) {
    DebugManager.enableGlobal();
  }

  // Configure debug settings
  const debugSettings = AdvancedPresets.DEBUG[debugConfig as keyof typeof AdvancedPresets.DEBUG];
  if (debugSettings) {
    DebugManager.updateConfig(debugSettings);
  }

  // Log setup completion
  console.log('🔧 Advanced features configured', {
    enableDebugTools,
    fileUploadConfig,
    debugConfig,
    operation: 'advanced_setup'
  });
}