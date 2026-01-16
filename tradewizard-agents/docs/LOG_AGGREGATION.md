# Log Aggregation Setup

This document describes log aggregation options for the TradeWizard Automated Market Monitor.

## Table of Contents

- [Log Aggregation Strategy](#log-aggregation-strategy)
- [Loki + Grafana](#loki--grafana)
- [ELK Stack](#elk-stack)
- [CloudWatch](#cloudwatch)
- [Log Retention](#log-retention)
- [Log Analysis](#log-analysis)

## Log Aggregation Strategy

### Why Log Aggregation?

- **Centralized logging**: All logs in one place
- **Search and filter**: Quickly find relevant logs
- **Visualization**: Charts and dashboards
- **Alerting**: Alert on log patterns
- **Retention**: Long-term log storage
- **Compliance**: Audit trail for compliance

### Log Sources

The monitor generates logs from:
- Application logs (structured JSON)
- System logs (systemd/Docker)
- Database logs (Supabase)
- LLM API logs (Opik)

### Log Format

Structured JSON logging:

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "info",
  "message": "Market analysis completed",
  "conditionId": "0x123...",
  "duration": 45000,
  "cost": 0.15,
  "direction": "LONG_YES",
  "service": "tradewizard-monitor",
  "environment": "production"
}
```

## Loki + Grafana

**Best for**: Small to medium deployments, cost-effective

### Architecture

```
Monitor → Promtail → Loki → Grafana
```

### Installation

#### Docker Compose

Create `docker-compose.logging.yml`:

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./promtail-config.yaml:/etc/promtail/config.yaml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yaml
    restart: unless-stopped
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    depends_on:
      - loki

volumes:
  loki-data:
  grafana-data:
```

#### Loki Configuration

Create `loki-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days
```

#### Promtail Configuration

Create `promtail-config.yaml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Systemd logs
  - job_name: systemd
    journal:
      max_age: 12h
      labels:
        job: systemd-journal
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: 'unit'
      - source_labels: ['__journal__hostname']
        target_label: 'hostname'

  # Docker logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'

  # Application logs
  - job_name: tradewizard-monitor
    static_configs:
      - targets:
          - localhost
        labels:
          job: tradewizard-monitor
          __path__: /var/log/tradewizard-monitor/*.log
```

#### Start Services

```bash
# Start Loki, Promtail, and Grafana
docker-compose -f docker-compose.logging.yml up -d

# Verify services are running
docker-compose -f docker-compose.logging.yml ps

# Check Loki
curl http://localhost:3100/ready

# Check Grafana
curl http://localhost:3001/api/health
```

### Grafana Configuration

1. **Access Grafana**:
   - URL: http://localhost:3001
   - Username: admin
   - Password: admin (change on first login)

2. **Add Loki Data Source**:
   - Navigate to Configuration → Data Sources
   - Click "Add data source"
   - Select "Loki"
   - URL: http://loki:3100
   - Click "Save & Test"

3. **Create Dashboard**:
   - Navigate to Dashboards → New Dashboard
   - Add panel
   - Select Loki data source
   - Query: `{job="tradewizard-monitor"}`

4. **Common Queries**:

```logql
# All logs
{job="tradewizard-monitor"}

# Error logs only
{job="tradewizard-monitor"} |= "error"

# Analysis logs
{job="tradewizard-monitor"} |= "Market analysis"

# Cost logs
{job="tradewizard-monitor"} | json | cost_usd > 1

# Logs in time range
{job="tradewizard-monitor"} [5m]

# Rate of errors
rate({job="tradewizard-monitor"} |= "error" [5m])
```

## ELK Stack

**Best for**: Large deployments, advanced analytics

### Architecture

```
Monitor → Filebeat → Logstash → Elasticsearch → Kibana
```

### Installation

#### Docker Compose

Create `docker-compose.elk.yml`:

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    restart: unless-stopped

volumes:
  elasticsearch-data:
```

#### Logstash Configuration

Create `logstash.conf`:

```conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [message] =~ /^{.*}$/ {
    json {
      source => "message"
    }
  }
  
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }
  
  mutate {
    add_field => {
      "service" => "tradewizard-monitor"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "tradewizard-monitor-%{+YYYY.MM.dd}"
  }
  
  stdout {
    codec => rubydebug
  }
}
```

#### Filebeat Installation

```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.0.0-amd64.deb
sudo dpkg -i filebeat-8.0.0-amd64.deb

# Configure Filebeat
sudo nano /etc/filebeat/filebeat.yml
```

#### Filebeat Configuration

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/tradewizard-monitor/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: tradewizard-monitor
      environment: production

  - type: journald
    enabled: true
    id: tradewizard-monitor
    include_matches:
      - _SYSTEMD_UNIT=tradewizard-monitor.service

output.logstash:
  hosts: ["localhost:5044"]

processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
```

#### Start Services

```bash
# Start ELK stack
docker-compose -f docker-compose.elk.yml up -d

# Start Filebeat
sudo systemctl start filebeat
sudo systemctl enable filebeat

# Verify Elasticsearch
curl http://localhost:9200

# Verify Kibana
curl http://localhost:5601/api/status
```

### Kibana Configuration

1. **Access Kibana**:
   - URL: http://localhost:5601

2. **Create Index Pattern**:
   - Navigate to Management → Index Patterns
   - Create pattern: `tradewizard-monitor-*`
   - Select time field: `@timestamp`

3. **Discover Logs**:
   - Navigate to Discover
   - Select index pattern
   - Search and filter logs

4. **Common Queries**:

```
# Error logs
level: "error"

# Analysis logs
message: "Market analysis"

# High cost analyses
cost_usd > 1

# Specific market
conditionId: "0x123..."

# Time range
@timestamp: [now-1h TO now]
```

## CloudWatch

**Best for**: AWS deployments

### Installation

#### CloudWatch Agent

```bash
# Download agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

#### Configuration

Create `/opt/aws/amazon-cloudwatch-agent/etc/config.json`:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/tradewizard-monitor/*.log",
            "log_group_name": "/tradewizard/monitor",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "TradeWizard/Monitor",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ],
        "totalcpu": false
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEMORY_USED",
            "unit": "Percent"
          }
        ]
      }
    }
  }
}
```

#### Start Agent

```bash
# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# Verify agent is running
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a query \
  -m ec2 \
  -s
```

### CloudWatch Insights

Query logs using CloudWatch Insights:

```
# Error logs
fields @timestamp, level, message
| filter level = "error"
| sort @timestamp desc
| limit 100

# Analysis duration
fields @timestamp, duration, conditionId
| filter message like /Market analysis completed/
| stats avg(duration), max(duration), min(duration)

# Cost analysis
fields @timestamp, cost_usd, conditionId
| filter cost_usd > 0
| stats sum(cost_usd) as total_cost by bin(5m)
```

## Log Retention

### Retention Policies

| Environment | Retention Period | Storage |
|-------------|------------------|---------|
| Development | 7 days | Local disk |
| Staging | 30 days | S3/Cloud |
| Production | 90 days | S3/Cloud |
| Compliance | 1 year+ | Glacier/Archive |

### Loki Retention

Configure in `loki-config.yaml`:

```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 2160h  # 90 days
```

### Elasticsearch Retention

Create Index Lifecycle Policy:

```bash
# Create ILM policy
curl -X PUT "localhost:9200/_ilm/policy/tradewizard-policy" \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_age": "7d",
              "max_size": "50gb"
            }
          }
        },
        "warm": {
          "min_age": "30d",
          "actions": {
            "shrink": {
              "number_of_shards": 1
            }
          }
        },
        "delete": {
          "min_age": "90d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### CloudWatch Retention

```bash
# Set retention policy
aws logs put-retention-policy \
  --log-group-name /tradewizard/monitor \
  --retention-in-days 90
```

## Log Analysis

### Common Queries

#### Error Analysis

```bash
# Count errors by type
grep "error" /var/log/monitor.log | \
  jq -r '.message' | \
  sort | uniq -c | sort -rn

# Errors in last hour
grep "error" /var/log/monitor.log | \
  jq -r 'select(.timestamp > "'$(date -d '1 hour ago' -Iseconds)'") | .message'
```

#### Performance Analysis

```bash
# Average analysis duration
grep "Market analysis completed" /var/log/monitor.log | \
  jq -r '.duration' | \
  awk '{sum+=$1; count++} END {print sum/count}'

# Slowest analyses
grep "Market analysis completed" /var/log/monitor.log | \
  jq -r '[.duration, .conditionId] | @tsv' | \
  sort -rn | head -10
```

#### Cost Analysis

```bash
# Total daily cost
grep "Market analysis completed" /var/log/monitor.log | \
  jq -r 'select(.timestamp | startswith("'$(date -I)'")) | .cost_usd' | \
  awk '{sum+=$1} END {print sum}'

# Cost by market
grep "Market analysis completed" /var/log/monitor.log | \
  jq -r '[.conditionId, .cost_usd] | @tsv' | \
  awk '{sum[$1]+=$2} END {for (i in sum) print i, sum[i]}' | \
  sort -k2 -rn
```

### Log Alerts

#### Loki Alerts

Configure in Grafana:

```yaml
# Alert: High Error Rate
expr: |
  rate({job="tradewizard-monitor"} |= "error" [5m]) > 0.1
for: 5m
annotations:
  summary: High error rate detected
  description: Error rate is {{ $value }} errors/sec

# Alert: Expensive Analysis
expr: |
  {job="tradewizard-monitor"} | json | cost_usd > 2
annotations:
  summary: Expensive analysis detected
  description: Analysis cost ${{ $value }}
```

#### Elasticsearch Alerts

Create Watcher:

```json
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["tradewizard-monitor-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {"match": {"level": "error"}},
                {"range": {"@timestamp": {"gte": "now-5m"}}}
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 10
      }
    }
  },
  "actions": {
    "email_admin": {
      "email": {
        "to": "admin@example.com",
        "subject": "High Error Rate Alert",
        "body": "Detected {{ctx.payload.hits.total}} errors in last 5 minutes"
      }
    }
  }
}
```

## Additional Resources

- [Loki Documentation](https://grafana.com/docs/loki/)
- [Elasticsearch Documentation](https://www.elastic.co/guide/)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [Monitoring and Alerts](./MONITORING_ALERTS.md)
- [Runbook](./RUNBOOK.md)
