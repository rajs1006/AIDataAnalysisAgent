# Logging Configuration

## Overview

This project uses `structlog` for advanced, structured logging with JSON formatting. The logging system provides flexible configuration through environment variables and supports various logging features.

## Features

- JSON-formatted logs
- Configurable log levels
- Optional file-based logging with rotation
- Contextual logging with additional metadata
- Request ID tracking
- Process and thread information

## Configuration

### Environment Variables

You can configure logging using the following environment variables:

- `LOG_LEVEL`: Set the logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Default: INFO
  - Example: `LOG_LEVEL=DEBUG`

- `LOG_DIR`: Directory to store log files
  - Default: None (console output only)
  - Example: `LOG_DIR=/var/log/myapp`

- `LOG_MAX_SIZE_MB`: Maximum log file size in megabytes
  - Default: 10
  - Example: `LOG_MAX_SIZE_MB=50`

- `LOG_BACKUP_COUNT`: Number of backup log files to keep
  - Default: 5
  - Example: `LOG_BACKUP_COUNT=3`

### Example .env Configuration

```
LOG_LEVEL=INFO
LOG_DIR=/var/log/myapp
LOG_MAX_SIZE_MB=20
LOG_BACKUP_COUNT=7
```

## Logging in Code

### Basic Logging

```python
from app.core.logging_config import get_logger

# Get a logger for the current module
logger = get_logger(__name__)

# Log with context
logger.info("User logged in", user_id=user.id, email=user.email)
```

### Logging Decorator

Use the `log_method_call` decorator to automatically log method calls:

```python
from app.core.logging_config import log_method_call

@log_method_call()
def process_data(data):
    # Method will be automatically logged with arguments and return value
    return processed_data
```

### Logging Mixin

For classes, use the `LoggingMixin`:

```python
from app.core.logging_config import LoggingMixin

class MyService(LoggingMixin):
    def some_method(self):
        # self.logger is automatically configured
        self.logger.info("Method called")
```

## Log Structure

Logs are output in JSON format with the following standard fields:

- `timestamp`: ISO-formatted timestamp
- `level`: Log level (INFO, ERROR, etc.)
- `logger`: Logger name
- `message`: Log message
- `process_id`: Process ID
- `thread_id`: Thread ID
- `request_id`: Unique request identifier
- Any additional context passed to the logger

## Best Practices

1. Always use `get_logger(__name__)` instead of `logging.getLogger()`
2. Pass additional context as keyword arguments
3. Use appropriate log levels
4. Include relevant identifiers (user ID, request ID, etc.)

## Troubleshooting

- Check environment variables
- Verify log directory permissions
- Review log rotation settings
