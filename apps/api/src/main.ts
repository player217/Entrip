// Re-export app for compatibility
// Some tools expect main.ts as entry point
export { default } from './app';

// Also ensure server starts if this is the entry point
import './index';