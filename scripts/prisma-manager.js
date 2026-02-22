#!/usr/bin/env node

/**
 * Prisma Manager - Fundamental solution for Prisma file lock issues
 *
 * This manager provides:
 * 1. Exclusive lock management to prevent concurrent Prisma operations
 * 2. Dead lock detection and cleanup
 * 3. Graceful process coordination
 * 4. Automatic retry with exponential backoff
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class PrismaManager {
  constructor() {
    this.lockFile = path.join(__dirname, '../.prisma.lock');
    this.pidFile = path.join(__dirname, '../.prisma.pid');
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Check if a process is running by PID
   */
  isProcessRunning(pid) {
    try {
      // On Windows, this will throw if process doesn't exist
      // On Unix, it returns true if process exists
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Acquire exclusive lock for Prisma operations
   */
  async acquireLock(attempt = 1) {
    try {
      // Try to create lock file exclusively (fails if exists)
      await fs.writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });
      console.log('✅ Acquired Prisma lock');
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Lock file exists - check if the process is still running
        try {
          const pidStr = await fs.readFile(this.lockFile, 'utf-8');
          const pid = parseInt(pidStr.trim());

          if (!this.isProcessRunning(pid)) {
            // Process is dead - remove stale lock
            console.log(`🔧 Removing stale lock from dead process ${pid}`);
            await fs.unlink(this.lockFile);
            // Retry acquiring lock
            return this.acquireLock(attempt);
          } else {
            // Process is still running
            if (attempt <= this.maxRetries) {
              const delay = this.retryDelay * Math.pow(2, attempt - 1);
              console.log(`⏳ Prisma operation in progress (PID: ${pid}). Retrying in ${delay}ms... (attempt ${attempt}/${this.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.acquireLock(attempt + 1);
            } else {
              console.error(`❌ Failed to acquire lock after ${this.maxRetries} attempts. Another Prisma operation is running.`);
              return false;
            }
          }
        } catch (readErr) {
          // Can't read lock file - try to remove it
          console.log('⚠️  Corrupt lock file detected, removing...');
          try {
            await fs.unlink(this.lockFile);
          } catch (unlinkErr) {
            // Ignore unlink errors
          }
          return this.acquireLock(attempt);
        }
      }
      throw err;
    }
  }

  /**
   * Release the Prisma lock
   */
  async releaseLock() {
    try {
      await fs.unlink(this.lockFile);
      console.log('✅ Released Prisma lock');
    } catch (err) {
      // Lock might already be removed
      if (err.code !== 'ENOENT') {
        console.error('⚠️  Error releasing lock:', err.message);
      }
    }
  }

  /**
   * Execute Prisma command with lock management
   */
  async execute(command, args = []) {
    const locked = await this.acquireLock();
    if (!locked) {
      console.error('❌ Could not execute Prisma command - lock unavailable');
      process.exit(1);
    }

    // Set up cleanup handlers
    const cleanup = async () => {
      await this.releaseLock();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    try {
      console.log(`🚀 Executing: pnpm prisma ${command} ${args.join(' ')}`);

      const child = spawn('pnpm', ['prisma', command, ...args], {
        stdio: 'inherit',
        shell: true,
        cwd: path.join(__dirname, '..')
      });

      const exitCode = await new Promise((resolve, reject) => {
        child.on('exit', (code) => {
          resolve(code);
        });

        child.on('error', (err) => {
          reject(err);
        });
      });

      if (exitCode !== 0) {
        throw new Error(`Prisma ${command} failed with exit code ${exitCode}`);
      }

      console.log(`✅ Prisma ${command} completed successfully`);
    } catch (err) {
      console.error(`❌ Error executing Prisma ${command}:`, err.message);
      process.exit(1);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Generate Prisma client with lock protection
   */
  async generate() {
    await this.execute('generate');
  }

  /**
   * Run Prisma migrations with lock protection
   */
  async migrate(args = []) {
    await this.execute('migrate', args);
  }

  /**
   * Force cleanup of locks and Prisma files (emergency use only)
   */
  async forceCleanup() {
    console.log('🔧 Force cleanup initiated...');

    // Remove lock file
    try {
      await fs.unlink(this.lockFile);
      console.log('✅ Removed lock file');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('⚠️  Could not remove lock file:', err.message);
      }
    }

    // Remove .prisma directory
    const prismaDir = path.join(__dirname, '../node_modules/.prisma');
    try {
      await fs.rm(prismaDir, { recursive: true, force: true });
      console.log('✅ Removed .prisma directory');
    } catch (err) {
      console.error('⚠️  Could not remove .prisma directory:', err.message);
    }

    console.log('🔧 Force cleanup completed. Run "pnpm prisma:generate" to regenerate.');
  }
}

// CLI interface
async function main() {
  const manager = new PrismaManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'generate':
      await manager.generate();
      break;

    case 'migrate':
      await manager.migrate(args);
      break;

    case 'force-cleanup':
      await manager.forceCleanup();
      break;

    case 'help':
    default:
      console.log(`
Prisma Manager - Fundamental solution for Prisma file lock issues

Usage:
  node scripts/prisma-manager.js <command> [options]

Commands:
  generate        Generate Prisma client with lock protection
  migrate [args]  Run Prisma migrations with lock protection
  force-cleanup   Force cleanup locks and .prisma directory (emergency use)
  help           Show this help message

Examples:
  node scripts/prisma-manager.js generate
  node scripts/prisma-manager.js migrate deploy
  node scripts/prisma-manager.js force-cleanup

This manager prevents concurrent Prisma operations and handles stale locks automatically.
      `);
      break;
  }
}

// Export for programmatic use
module.exports = PrismaManager;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}