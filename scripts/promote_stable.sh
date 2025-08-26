#!/bin/bash

# Canary to Stable Auto-Promotion Script
# This script monitors canary deployment SLO and auto-promotes if criteria are met

set -euo pipefail

# Configuration
NAMESPACE="entrip"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
SLO_THRESHOLD="${SLO_THRESHOLD:-0.95}"  # 95% success rate
MONITORING_DURATION="${MONITORING_DURATION:-1800}"  # 30 minutes in seconds
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # Check every minute

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if kubectl is configured
check_kubectl() {
    if ! kubectl cluster-info &>/dev/null; then
        error "kubectl is not configured properly"
        exit 1
    fi
}

# Query Prometheus for canary metrics
query_prometheus() {
    local query="$1"
    local result=$(kubectl run prometheus-query-$RANDOM --rm -i --restart=Never \
        --image=curlimages/curl:latest \
        --command -- curl -s "${PROMETHEUS_URL}/api/v1/query?query=${query}" 2>/dev/null)
    
    echo "$result" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0"
}

# Get canary success rate
get_canary_success_rate() {
    query_prometheus "flight_api_success_rate_5m{version=\"canary\"}"
}

# Get canary request rate
get_canary_request_rate() {
    query_prometheus "sum(rate(flight_requests_total{version=\"canary\"}[5m]))"
}

# Get canary p95 latency
get_canary_p95_latency() {
    query_prometheus "histogram_quantile(0.95,rate(flight_request_duration_seconds_bucket{version=\"canary\"}[5m]))"
}

# Check if canary meets SLO
check_slo() {
    local success_rate=$(get_canary_success_rate)
    local request_rate=$(get_canary_request_rate)
    local p95_latency=$(get_canary_p95_latency)
    
    log "Current metrics - Success rate: ${success_rate}, Request rate: ${request_rate}/s, P95 latency: ${p95_latency}s"
    
    # Check success rate
    if (( $(echo "$success_rate < $SLO_THRESHOLD" | bc -l) )); then
        warning "Success rate ${success_rate} is below SLO threshold ${SLO_THRESHOLD}"
        return 1
    fi
    
    # Check if canary is receiving traffic
    if (( $(echo "$request_rate < 0.1" | bc -l) )); then
        warning "Canary is not receiving sufficient traffic (${request_rate}/s)"
        return 1
    fi
    
    # Check latency (should be under 2 seconds)
    if (( $(echo "$p95_latency > 2" | bc -l) )); then
        warning "P95 latency ${p95_latency}s exceeds 2s threshold"
        return 1
    fi
    
    return 0
}

# Promote canary to stable
promote_to_stable() {
    log "Promoting canary to stable..."
    
    # Get canary image
    local canary_image=$(kubectl get deployment entrip-api-canary -n $NAMESPACE \
        -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    if [ -z "$canary_image" ]; then
        error "Failed to get canary image"
        return 1
    fi
    
    log "Canary image: $canary_image"
    
    # Update stable deployment
    kubectl set image deployment/entrip-api-stable \
        entrip-api="$canary_image" \
        -n $NAMESPACE
    
    # Wait for stable rollout
    kubectl rollout status deployment/entrip-api-stable -n $NAMESPACE --timeout=300s
    
    # Update traffic to 100% stable
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: entrip-api
  namespace: $NAMESPACE
spec:
  hosts:
  - entrip-api
  http:
  - route:
    - destination:
        host: entrip-api
        subset: stable
      weight: 100
    - destination:
        host: entrip-api
        subset: canary
      weight: 0
EOF
    
    log "✅ Successfully promoted canary to stable"
    
    # Tag the image as stable in registry
    if [ -n "${DOCKER_USERNAME:-}" ] && [ -n "${DOCKER_PASSWORD:-}" ]; then
        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
        docker pull "$canary_image"
        docker tag "$canary_image" "${canary_image%-canary*}:stable"
        docker push "${canary_image%-canary*}:stable"
    fi
    
    return 0
}

# Rollback canary
rollback_canary() {
    error "Rolling back canary deployment..."
    
    # Set canary traffic to 0%
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: entrip-api
  namespace: $NAMESPACE
spec:
  hosts:
  - entrip-api
  http:
  - route:
    - destination:
        host: entrip-api
        subset: stable
      weight: 100
    - destination:
        host: entrip-api
        subset: canary
      weight: 0
EOF
    
    # Send alert
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{
                "channel": "#ops-flight",
                "username": "Canary Monitor",
                "icon_emoji": ":warning:",
                "text": "🔴 Canary deployment rolled back due to SLO violation",
                "attachments": [{
                    "color": "danger",
                    "fields": [
                        {"title": "Service", "value": "entrip-api", "short": true},
                        {"title": "Action", "value": "Automatic rollback", "short": true}
                    ]
                }]
            }'
    fi
    
    error "❌ Canary rollback completed"
    exit 1
}

# Main monitoring loop
main() {
    log "Starting canary monitoring for ${MONITORING_DURATION}s..."
    check_kubectl
    
    local start_time=$(date +%s)
    local consecutive_failures=0
    local max_failures=3
    
    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $MONITORING_DURATION ]; then
            log "Monitoring period completed successfully"
            break
        fi
        
        log "Checking SLO... (${elapsed}s/${MONITORING_DURATION}s elapsed)"
        
        if check_slo; then
            log "✓ SLO check passed"
            consecutive_failures=0
        else
            consecutive_failures=$((consecutive_failures + 1))
            error "✗ SLO check failed ($consecutive_failures/$max_failures)"
            
            if [ $consecutive_failures -ge $max_failures ]; then
                rollback_canary
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
    
    # Final SLO check before promotion
    log "Performing final SLO check before promotion..."
    if check_slo; then
        promote_to_stable
    else
        rollback_canary
    fi
}

# Run main function
main "$@"