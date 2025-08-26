import { logger } from '@entrip/shared';

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  delta?: number;
}

class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private isMonitoring = false;
  private intervalId?: NodeJS.Timeout;

  start() {
    if (!('memory' in performance)) {
      logger.warn('[MemoryProfiler]', 'Performance.memory API not available');
      return;
    }

    logger.info('[MemoryProfiler]', 'Starting memory monitoring');
    this.isMonitoring = true;
    this.snapshots = [];

    // Initial snapshot
    this.takeSnapshot();

    // Monitor every 2 seconds
    this.intervalId = setInterval(() => {
      if (this.isMonitoring) {
        this.takeSnapshot();
      }
    }, 2000);
  }

  stop() {
    logger.info('[MemoryProfiler]', 'Stopping memory monitoring');
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    return this.analyze();
  }

  private takeSnapshot() {
    const memory = (performance as Performance & { memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }}).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };

    if (this.snapshots.length > 0) {
      const lastSnapshot = this.snapshots[this.snapshots.length - 1];
      if (lastSnapshot) {
        snapshot.delta = snapshot.usedJSHeapSize - lastSnapshot.usedJSHeapSize;
      }
    }

    this.snapshots.push(snapshot);

    // Log if memory increased significantly
    if (snapshot.delta && snapshot.delta > 1024 * 1024) { // 1MB increase
      logger.warn('[MemoryProfiler]', `Memory increased by ${(snapshot.delta / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  private analyze() {
    if (this.snapshots.length < 2) {
      logger.info('[MemoryProfiler]', 'Not enough snapshots for analysis');
      return null;
    }

    const firstSnapshot = this.snapshots[0];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    
    if (!firstSnapshot || !lastSnapshot) {
      return null;
    }
    
    const totalMemoryChange = lastSnapshot.usedJSHeapSize - firstSnapshot.usedJSHeapSize;
    const percentageChange = (totalMemoryChange / firstSnapshot.usedJSHeapSize) * 100;
    
    const avgMemory = this.snapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / this.snapshots.length;
    const maxMemory = Math.max(...this.snapshots.map(s => s.usedJSHeapSize));
    const minMemory = Math.min(...this.snapshots.map(s => s.usedJSHeapSize));

    const analysis = {
      duration: lastSnapshot.timestamp - firstSnapshot.timestamp,
      snapshots: this.snapshots.length,
      initialMemory: firstSnapshot.usedJSHeapSize,
      finalMemory: lastSnapshot.usedJSHeapSize,
      totalChange: totalMemoryChange,
      percentageChange,
      avgMemory,
      maxMemory,
      minMemory,
      memoryLeaks: this.detectLeaks()
    };

    logger.info('[MemoryProfiler]', 'Analysis complete:');
    logger.info('[MemoryProfiler]', `- Duration: ${(analysis.duration / 1000).toFixed(1)}s`);
    logger.info('[MemoryProfiler]', `- Initial memory: ${(analysis.initialMemory / 1024 / 1024).toFixed(2)}MB`);
    logger.info('[MemoryProfiler]', `- Final memory: ${(analysis.finalMemory / 1024 / 1024).toFixed(2)}MB`);
    logger.info('[MemoryProfiler]', `- Change: ${(analysis.totalChange / 1024 / 1024).toFixed(2)}MB (${analysis.percentageChange.toFixed(1)}%)`);
    logger.info('[MemoryProfiler]', `- Average memory: ${(analysis.avgMemory / 1024 / 1024).toFixed(2)}MB`);
    logger.info('[MemoryProfiler]', `- Memory leaks detected: ${analysis.memoryLeaks.length}`);

    // Save to JSON file
    this.saveResults(analysis);

    return analysis;
  }

  private detectLeaks() {
    const leaks: Array<{
      timestamp: number;
      size: number;
      totalMemory: number;
    }> = [];
    const threshold = 500 * 1024; // 500KB continuous growth

    for (let i = 1; i < this.snapshots.length; i++) {
      const current = this.snapshots[i];
      const _prev = this.snapshots[i - 1];
      
      if (current && current.delta && current.delta > threshold) {
        leaks.push({
          timestamp: current.timestamp,
          size: current.delta,
          totalMemory: current.usedJSHeapSize
        });
      }
    }

    return leaks;
  }

  private saveResults(analysis: {
    duration: number;
    snapshots: number;
    initialMemory: number;
    finalMemory: number;
    totalChange: number;
    percentageChange: number;
    avgMemory: number;
    maxMemory: number;
    minMemory: number;
    memoryLeaks: Array<{
      timestamp: number;
      size: number;
      totalMemory: number;
    }>;
  }) {
    const blob = new Blob([JSON.stringify({ analysis, snapshots: this.snapshots }, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    logger.info('[MemoryProfiler]', `Results saved to memory-profile-${Date.now()}.json`);
  }

  // Force garbage collection (only works with --expose-gc flag)
  forceGC() {
    if ((window as Window & { gc?: () => void }).gc) {
      logger.info('[MemoryProfiler]', 'Forcing garbage collection');
      (window as Window & { gc?: () => void }).gc!();
    } else {
      logger.warn('[MemoryProfiler]', 'Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
    }
  }
}

export const memoryProfiler = new MemoryProfiler();