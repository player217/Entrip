import { Router, Request, Response } from 'express';
import { FxService } from '../integrations/fx/fx.service';
import { FlightService } from '../integrations/flights/flights.service';
import { flightRateLimit } from '../middleware/rate-limit';
import { recordExternalCall, recordCacheUsage } from '../metrics/integrations';

const router = Router();

/**
 * Example: Enhanced exchange rate endpoint using FxService
 * 
 * This shows how to integrate the new resilient FX service
 * into existing API routes with monitoring and error handling.
 */
router.get('/exchange/:from/:to', flightRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { from, to } = req.params;

  try {
    const fxService = new FxService();
    const rate = await fxService.getRate(from.toUpperCase() as any, to.toUpperCase() as any);
    const duration = Date.now() - startTime;

    // Record successful call
    recordExternalCall('fx_service', `/exchange/${from}/${to}`, 'GET', duration / 1000, 200);

    res.json({
      success: true,
      data: {
        from,
        to,
        rate,
        timestamp: new Date().toISOString()
      },
      meta: {
        responseTimeMs: duration,
        service: 'fx_resilient'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Record error
    recordExternalCall('fx_service', `/exchange/${from}/${to}`, 'GET', duration / 1000, undefined, undefined, 'SERVICE_ERROR');

    if (errorMessage.includes('FX_UNAVAILABLE')) {
      res.status(503).json({
        success: false,
        error: 'Exchange rate service temporarily unavailable',
        message: 'All currency providers are down. Please try again later.',
        code: 'FX_SERVICE_UNAVAILABLE',
        meta: {
          responseTimeMs: duration,
          retryAfter: 300 // 5 minutes
        }
      });
    } else if (errorMessage.includes('Rate not found')) {
      res.status(404).json({
        success: false,
        error: 'Currency pair not supported',
        message: `Exchange rate for ${from}/${to} is not available`,
        code: 'CURRENCY_NOT_SUPPORTED'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        code: 'INTERNAL_ERROR'
      });
    }
  }
});

/**
 * Example: Enhanced flight search using FlightService
 */
router.get('/flights/search', flightRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const flightService = new FlightService();
    
    const searchParams = {
      departure: req.query.departure as string,
      arrival: req.query.arrival as string,
      date: req.query.date as string,
      airline: req.query.airline as string
    };

    const result = await flightService.searchFlights(searchParams);
    const duration = Date.now() - startTime;

    // Record cache usage metrics
    recordCacheUsage(result.source || 'unknown', 'flights', result.cache.toLowerCase() as any);
    recordExternalCall('flight_service', '/search', 'GET', duration / 1000, 200);

    res.json({
      success: true,
      data: result.data,
      meta: {
        cache: result.cache,
        source: result.source,
        dataAge: result.dataAge,
        responseTimeMs: duration,
        totalResults: Array.isArray(result.data) ? result.data.length : 0,
        ...(result.cache === 'STALE' && {
          warning: 'Data may be outdated due to provider issues'
        })
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordExternalCall('flight_service', '/search', 'GET', duration / 1000, undefined, undefined, 'SERVICE_ERROR');

    if (errorMessage.includes('FLIGHT_UNAVAILABLE')) {
      res.status(503).json({
        success: false,
        error: 'Flight data service temporarily unavailable',
        message: 'All flight data providers are down. Please try again later.',
        code: 'FLIGHT_SERVICE_UNAVAILABLE',
        meta: {
          responseTimeMs: duration,
          retryAfter: 300
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        code: 'INTERNAL_ERROR'
      });
    }
  }
});

/**
 * Example: Real-time flight status with WebSocket integration
 */
router.get('/flights/:flightNo/status', flightRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { flightNo } = req.params;
  const date = req.query.date as string || new Date().toISOString().split('T')[0];

  try {
    const flightService = new FlightService();
    const result = await flightService.getFlightStatus(flightNo, date);
    const duration = Date.now() - startTime;

    recordCacheUsage(result.source || 'unknown', 'flights', result.cache.toLowerCase() as any);
    recordExternalCall('flight_service', `/status/${flightNo}`, 'GET', duration / 1000, 200);

    res.json({
      success: true,
      data: result.data,
      meta: {
        cache: result.cache,
        source: result.source,
        dataAge: result.dataAge,
        responseTimeMs: duration,
        lastUpdated: result.timestamp,
        ...(result.cache === 'STALE' && {
          warning: 'Status information may be outdated'
        })
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordExternalCall('flight_service', `/status/${flightNo}`, 'GET', duration / 1000, undefined, undefined, 'SERVICE_ERROR');

    res.status(404).json({
      success: false,
      error: 'Flight status not found',
      message: `Status for flight ${flightNo} on ${date} is not available`,
      code: 'FLIGHT_NOT_FOUND',
      meta: {
        responseTimeMs: duration
      }
    });
  }
});

/**
 * Example: Booking integration with resilient external services
 * 
 * This shows how to integrate FX and flight services into
 * the existing booking workflow with proper error handling.
 */
router.post('/bookings/calculate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { 
      flightDetails,
      baseCurrency = 'USD',
      targetCurrency = 'KRW'
    } = req.body;

    const fxService = new FxService();
    const flightService = new FlightService();

    // Get current exchange rate (with fallback)
    let exchangeRate = 1;
    let fxSource = 'default';
    let fxCache = 'MISS';
    
    if (baseCurrency !== targetCurrency) {
      try {
        const fxResult = await fxService.getRates(baseCurrency);
        exchangeRate = (fxResult.rates as any)[targetCurrency] || 1;
        fxSource = fxResult.source || 'unknown';
        fxCache = fxResult.cache;
      } catch (fxError) {
        // Use default rate but log the error
        console.warn('FX service unavailable, using default rate:', fxError);
      }
    }

    // Validate flight information (optional - for pricing)
    let flightValidation = { valid: true, message: 'Not validated' };
    if (flightDetails?.flightNo) {
      try {
        await flightService.getFlightStatus(
          flightDetails.flightNo,
          flightDetails.date || new Date().toISOString().split('T')[0]
        );
        flightValidation = { valid: true, message: 'Flight exists' };
      } catch (flightError) {
        flightValidation = { valid: false, message: 'Flight not found' };
      }
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        exchangeRate,
        baseCurrency,
        targetCurrency,
        flightValidation,
        calculation: {
          // Your existing booking calculation logic here
          basePrice: 1000, // Example
          convertedPrice: Math.round(1000 * exchangeRate),
          currency: targetCurrency
        }
      },
      meta: {
        fx: {
          source: fxSource,
          cache: fxCache,
          ...(fxCache === 'STALE' && {
            warning: 'Exchange rate may be outdated'
          })
        },
        flight: flightValidation,
        responseTimeMs: duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      error: 'Booking calculation failed',
      message: errorMessage,
      code: 'CALCULATION_ERROR',
      meta: {
        responseTimeMs: duration
      }
    });
  }
});

/**
 * Service health status for this integration
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const fxService = new FxService();
    const flightService = new FlightService();

    const [fxHealth, flightHealth] = await Promise.all([
      fxService.getHealthStatus(),
      flightService.getHealthStatus()
    ]);

    const overallStatus = 
      fxHealth.overall === 'HEALTHY' && flightHealth.overall === 'HEALTHY' 
        ? 'healthy'
        : fxHealth.overall === 'DOWN' && flightHealth.overall === 'DOWN'
        ? 'down'
        : 'degraded';

    res.json({
      status: overallStatus,
      services: {
        fx: fxHealth,
        flights: flightHealth
      },
      integration: {
        version: '1.0.0',
        features: [
          'circuit_breaker',
          'retry_logic',
          'cache_fallback',
          'stale_while_error',
          'multi_provider'
        ]
      },
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

export default router;