const MAX_METRICS = 100;
const SLOW_MS = 1000;

interface Metric {
  url: string;
  duration: number;
  timestamp: number;
}

class APIPerformance {
  private static instance: APIPerformance;
  private metrics: Metric[] = [];

  static getInstance(): APIPerformance {
    if (!APIPerformance.instance) {
      APIPerformance.instance = new APIPerformance();
    }
    return APIPerformance.instance;
  }

  track(url: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.metrics.push({ url, duration, timestamp: Date.now() });

    if (this.metrics.length > MAX_METRICS) {
      this.metrics.shift();
    }

    if (duration > SLOW_MS) {
      console.warn(`SLOW API: ${url} took ${duration}ms`);
    }
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }
}

export { APIPerformance };
