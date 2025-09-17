/**
 * Advanced File Handling System
 * Comprehensive file upload/download with progress tracking, validation, and optimization
 */

import { logger } from '../monitoring/StructuredLogger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { ApiError, ErrorCategory, ErrorSeverity } from '../error-handling/ApiError';

export interface FileValidationRule {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  minSize?: number;
  customValidator?: (file: File) => Promise<boolean> | boolean;
  errorMessage?: string;
}

export interface UploadOptions {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  fieldName?: string;
  additionalFields?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  chunkSize?: number;
  enableChunking?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  validation?: FileValidationRule;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  signal?: AbortSignal;
}

export interface DownloadOptions {
  url: string;
  filename?: string;
  headers?: Record<string, string>;
  timeout?: number;
  enableResume?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  currentChunk?: number;
  totalChunks?: number;
}

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  fileId?: string;
  metadata?: Record<string, any>;
  error?: ApiError;
  progress: UploadProgress;
  duration: number;
}

export interface FileDownloadResult {
  success: boolean;
  blob?: Blob;
  url?: string;
  filename?: string;
  error?: ApiError;
  progress: DownloadProgress;
  duration: number;
}

/**
 * File Validator
 */
export class FileValidator {
  static async validate(file: File, rules: FileValidationRule): Promise<void> {
    // Size validation
    if (rules.maxSize && file.size > rules.maxSize) {
      throw new ApiError(
        `File size ${this.formatBytes(file.size)} exceeds maximum allowed size ${this.formatBytes(rules.maxSize)}`,
        'FILE_TOO_LARGE',
        413,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );
    }

    if (rules.minSize && file.size < rules.minSize) {
      throw new ApiError(
        `File size ${this.formatBytes(file.size)} is below minimum required size ${this.formatBytes(rules.minSize)}`,
        'FILE_TOO_SMALL',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );
    }

    // Type validation
    if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
      throw new ApiError(
        `File type ${file.type} is not allowed. Allowed types: ${rules.allowedTypes.join(', ')}`,
        'INVALID_FILE_TYPE',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );
    }

    // Extension validation
    if (rules.allowedExtensions) {
      const extension = this.getFileExtension(file.name);
      if (!rules.allowedExtensions.includes(extension)) {
        throw new ApiError(
          `File extension ${extension} is not allowed. Allowed extensions: ${rules.allowedExtensions.join(', ')}`,
          'INVALID_FILE_EXTENSION',
          400,
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW
        );
      }
    }

    // Custom validation
    if (rules.customValidator) {
      const isValid = await rules.customValidator(file);
      if (!isValid) {
        throw new ApiError(
          rules.errorMessage || 'File failed custom validation',
          'CUSTOM_VALIDATION_FAILED',
          400,
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW
        );
      }
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
}

/**
 * Progress Tracker for file operations
 */
export class FileProgressTracker {
  private startTime: number;
  private lastUpdateTime: number;
  private lastLoaded: number;
  private speedSamples: number[] = [];
  private readonly maxSamples = 10;

  constructor() {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.lastLoaded = 0;
  }

  update(loaded: number, total: number): UploadProgress | DownloadProgress {
    const now = Date.now();
    const timeDelta = (now - this.lastUpdateTime) / 1000; // seconds
    const loadedDelta = loaded - this.lastLoaded;

    // Calculate speed
    let speed = 0;
    if (timeDelta > 0) {
      speed = loadedDelta / timeDelta;
      this.speedSamples.push(speed);
      
      if (this.speedSamples.length > this.maxSamples) {
        this.speedSamples.shift();
      }
    }

    // Average speed over samples
    const averageSpeed = this.speedSamples.length > 0
      ? this.speedSamples.reduce((sum, s) => sum + s, 0) / this.speedSamples.length
      : 0;

    // Calculate percentage
    const percentage = total > 0 ? (loaded / total) * 100 : 0;

    // Calculate ETA
    const remaining = total - loaded;
    const estimatedTimeRemaining = averageSpeed > 0 ? remaining / averageSpeed : 0;

    this.lastUpdateTime = now;
    this.lastLoaded = loaded;

    return {
      loaded,
      total,
      percentage: Math.round(percentage * 100) / 100,
      speed: Math.round(averageSpeed),
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining)
    };
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * File Upload Handler
 */
export class FileUploader {
  /**
   * Upload file with advanced features
   */
  static async upload(file: File, options: UploadOptions): Promise<FileUploadResult> {
    const startTime = Date.now();
    const progressTracker = new FileProgressTracker();

    try {
      // Validate file
      if (options.validation) {
        await FileValidator.validate(file, options.validation);
      }

      logger.info('Starting file upload', {
        filename: file.name,
        size: file.size,
        type: file.type,
        url: options.url,
        operation: 'file_upload'
      }, ['file', 'upload', 'start']);

      // Decide upload strategy
      const shouldChunk = options.enableChunking && 
        file.size > (options.chunkSize || 5 * 1024 * 1024); // 5MB default

      let result: FileUploadResult;

      if (shouldChunk) {
        result = await this.uploadInChunks(file, options, progressTracker);
      } else {
        result = await this.uploadDirect(file, options, progressTracker);
      }

      const duration = Date.now() - startTime;
      result.duration = duration;

      logger.info('File upload completed', {
        filename: file.name,
        success: result.success,
        duration,
        size: file.size,
        operation: 'file_upload'
      }, ['file', 'upload', result.success ? 'success' : 'failure']);

      // Record metrics
      performanceMonitor.recordMetric('file_upload_duration_ms', duration, 'histogram', 'ms', {
        success: result.success.toString(),
        size_category: this.getSizeCategory(file.size)
      });

      performanceMonitor.recordMetric('file_upload_size_bytes', file.size, 'histogram', 'bytes');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Upload failed',
        'UPLOAD_ERROR',
        500,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM
      );

      logger.error('File upload failed', apiError, {
        filename: file.name,
        duration,
        operation: 'file_upload'
      }, ['file', 'upload', 'error']);

      return {
        success: false,
        error: apiError,
        progress: progressTracker.update(0, file.size),
        duration
      };
    }
  }

  /**
   * Direct upload for smaller files
   */
  private static async uploadDirect(
    file: File,
    options: UploadOptions,
    progressTracker: FileProgressTracker
  ): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append(options.fieldName || 'file', file);

      // Add additional fields
      if (options.additionalFields) {
        for (const [key, value] of Object.entries(options.additionalFields)) {
          formData.append(key, value);
        }
      }

      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = progressTracker.update(event.loaded, event.total);
          options.onProgress?.(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let responseData: any = {};
          try {
            responseData = JSON.parse(xhr.responseText);
          } catch {
            responseData = { message: xhr.responseText };
          }

          resolve({
            success: true,
            url: responseData.url,
            fileId: responseData.fileId || responseData.id,
            metadata: responseData,
            progress: progressTracker.update(file.size, file.size),
            duration: progressTracker.getDuration()
          });
        } else {
          reject(new ApiError(
            `Upload failed with status ${xhr.status}`,
            'UPLOAD_HTTP_ERROR',
            xhr.status,
            ErrorCategory.SERVER,
            ErrorSeverity.MEDIUM
          ));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new ApiError(
          'Network error during upload',
          'UPLOAD_NETWORK_ERROR',
          undefined,
          ErrorCategory.NETWORK,
          ErrorSeverity.HIGH
        ));
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        reject(new ApiError(
          'Upload timeout',
          'UPLOAD_TIMEOUT',
          408,
          ErrorCategory.TIMEOUT,
          ErrorSeverity.MEDIUM
        ));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new ApiError(
          'Upload cancelled',
          'UPLOAD_CANCELLED',
          undefined,
          ErrorCategory.UNKNOWN,
          ErrorSeverity.LOW
        ));
      });

      // Set up abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Configure request
      xhr.open(options.method || 'POST', options.url);
      
      if (options.timeout) {
        xhr.timeout = options.timeout;
      }

      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          xhr.setRequestHeader(key, value);
        }
      }

      // Start upload
      xhr.send(formData);
    });
  }

  /**
   * Chunked upload for larger files
   */
  private static async uploadInChunks(
    file: File,
    options: UploadOptions,
    progressTracker: FileProgressTracker
  ): Promise<FileUploadResult> {
    const chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = 0;

    // Initialize chunked upload session
    const sessionId = await this.initializeChunkedUpload(file, options);

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        await this.uploadChunk(chunk, chunkIndex, totalChunks, sessionId, options);
        
        uploadedBytes += chunk.size;
        const progress = progressTracker.update(uploadedBytes, file.size) as UploadProgress;
        progress.currentChunk = chunkIndex + 1;
        progress.totalChunks = totalChunks;

        options.onProgress?.(progress);
        options.onChunkComplete?.(chunkIndex, totalChunks);

        // Check for abort
        if (options.signal?.aborted) {
          await this.cancelChunkedUpload(sessionId, options);
          throw new ApiError(
            'Upload cancelled',
            'UPLOAD_CANCELLED',
            undefined,
            ErrorCategory.UNKNOWN,
            ErrorSeverity.LOW
          );
        }
      }

      // Finalize upload
      const result = await this.finalizeChunkedUpload(sessionId, options);
      
      return {
        success: true,
        url: result.url,
        fileId: result.fileId,
        metadata: result,
        progress: progressTracker.update(file.size, file.size),
        duration: progressTracker.getDuration()
      };

    } catch (error) {
      // Cleanup on error
      await this.cancelChunkedUpload(sessionId, options);
      throw error;
    }
  }

  private static async initializeChunkedUpload(file: File, options: UploadOptions): Promise<string> {
    const response = await fetch(`${options.url}/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type,
        ...options.additionalFields
      })
    });

    if (!response.ok) {
      throw new ApiError(
        'Failed to initialize chunked upload',
        'CHUNK_INIT_ERROR',
        response.status,
        ErrorCategory.SERVER,
        ErrorSeverity.MEDIUM
      );
    }

    const data = await response.json();
    return data.sessionId;
  }

  private static async uploadChunk(
    chunk: Blob,
    index: number,
    total: number,
    sessionId: string,
    options: UploadOptions
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('index', index.toString());
    formData.append('total', total.toString());
    formData.append('sessionId', sessionId);

    const response = await fetch(`${options.url}/chunk`, {
      method: 'POST',
      headers: options.headers,
      body: formData
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to upload chunk ${index + 1}/${total}`,
        'CHUNK_UPLOAD_ERROR',
        response.status,
        ErrorCategory.SERVER,
        ErrorSeverity.MEDIUM
      );
    }
  }

  private static async finalizeChunkedUpload(sessionId: string, options: UploadOptions): Promise<any> {
    const response = await fetch(`${options.url}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      throw new ApiError(
        'Failed to finalize chunked upload',
        'CHUNK_FINALIZE_ERROR',
        response.status,
        ErrorCategory.SERVER,
        ErrorSeverity.MEDIUM
      );
    }

    return response.json();
  }

  private static async cancelChunkedUpload(sessionId: string, options: UploadOptions): Promise<void> {
    try {
      await fetch(`${options.url}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify({ sessionId })
      });
    } catch (error) {
      // Ignore cancellation errors
      logger.warn('Failed to cancel chunked upload', { sessionId }, ['file', 'upload', 'cancel']);
    }
  }

  private static getSizeCategory(size: number): string {
    if (size < 1024 * 1024) return 'small'; // < 1MB
    if (size < 10 * 1024 * 1024) return 'medium'; // < 10MB
    if (size < 100 * 1024 * 1024) return 'large'; // < 100MB
    return 'xlarge'; // >= 100MB
  }
}

/**
 * File Download Handler
 */
export class FileDownloader {
  /**
   * Download file with progress tracking
   */
  static async download(options: DownloadOptions): Promise<FileDownloadResult> {
    const startTime = Date.now();
    const progressTracker = new FileProgressTracker();

    try {
      logger.info('Starting file download', {
        url: options.url,
        filename: options.filename,
        operation: 'file_download'
      }, ['file', 'download', 'start']);

      const result = await this.downloadWithProgress(options, progressTracker);
      const duration = Date.now() - startTime;
      result.duration = duration;

      logger.info('File download completed', {
        url: options.url,
        success: result.success,
        duration,
        size: result.blob?.size,
        operation: 'file_download'
      }, ['file', 'download', result.success ? 'success' : 'failure']);

      // Record metrics
      performanceMonitor.recordMetric('file_download_duration_ms', duration, 'histogram', 'ms', {
        success: result.success.toString()
      });

      if (result.blob) {
        performanceMonitor.recordMetric('file_download_size_bytes', result.blob.size, 'histogram', 'bytes');
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Download failed',
        'DOWNLOAD_ERROR',
        500,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM
      );

      logger.error('File download failed', apiError, {
        url: options.url,
        duration,
        operation: 'file_download'
      }, ['file', 'download', 'error']);

      return {
        success: false,
        error: apiError,
        progress: progressTracker.update(0, 0),
        duration
      };
    }
  }

  /**
   * Auto-download file to user's download folder
   */
  static async autoDownload(url: string, filename?: string): Promise<void> {
    const result = await this.download({ url, filename });
    
    if (result.success && result.blob) {
      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.filename || filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } else {
      throw result.error || new Error('Download failed');
    }
  }

  private static async downloadWithProgress(
    options: DownloadOptions,
    progressTracker: FileProgressTracker
  ): Promise<FileDownloadResult> {
    const response = await fetch(options.url, {
      headers: options.headers,
      signal: options.signal
    });

    if (!response.ok) {
      throw new ApiError(
        `Download failed with status ${response.status}`,
        'DOWNLOAD_HTTP_ERROR',
        response.status,
        ErrorCategory.SERVER,
        ErrorSeverity.MEDIUM
      );
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    // Get filename from response headers or options
    let filename = options.filename;
    if (!filename) {
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError(
        'Response body is not readable',
        'DOWNLOAD_STREAM_ERROR',
        500,
        ErrorCategory.SERVER,
        ErrorSeverity.MEDIUM
      );
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        const progress = progressTracker.update(loaded, total);
        options.onProgress?.(progress);
      }

      const blob = new Blob(chunks);
      
      return {
        success: true,
        blob,
        url: URL.createObjectURL(blob),
        filename,
        progress: progressTracker.update(loaded, total),
        duration: progressTracker.getDuration()
      };

    } finally {
      reader.releaseLock();
    }
  }
}

// Export convenience functions
export const fileHandler = {
  upload: FileUploader.upload.bind(FileUploader),
  download: FileDownloader.download.bind(FileDownloader),
  autoDownload: FileDownloader.autoDownload.bind(FileDownloader),
  validate: FileValidator.validate.bind(FileValidator)
};

// Common validation rules
export const ValidationRules = {
  images: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },
  documents: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['pdf', 'doc', 'docx']
  },
  videos: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    allowedExtensions: ['mp4', 'webm', 'ogv']
  }
};