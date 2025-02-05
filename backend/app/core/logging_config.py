import logging
import structlog
import sys
import os
import json
import traceback
from typing import Any, Dict, Optional, Union
from datetime import datetime
import uuid
import threading
import multiprocessing


def _get_request_id() -> str:
    """Generate or retrieve a unique request ID."""
    request_id = getattr(threading.local(), 'request_id', None)
    if not request_id:
        request_id = str(uuid.uuid4())
        threading.local().request_id = request_id
    return request_id


def _enhanced_exception_formatter(exc_info: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
    """
    Comprehensive exception formatter to capture detailed error information.
    
    Args:
        exc_info: Exception information from sys.exc_info()
    
    Returns:
        dict: Detailed exception information or None
    """
    if not exc_info:
        exc_info = sys.exc_info()
    
    if exc_info and exc_info[0] is not None:
        exc_type, exc_value, exc_traceback = exc_info
        
        # Get the most relevant frame
        tb = exc_traceback
        while tb.tb_next:
            tb = tb.tb_next
        
        return {
            'error_type': exc_type.__name__,
            'error_message': str(exc_value),
            'traceback': ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback)),
            'details': {
                'module': exc_type.__module__,
                'filename': tb.tb_frame.f_code.co_filename,
                'function': tb.tb_frame.f_code.co_name,
                'line_number': tb.tb_lineno
            }
        }
    return None


def configure_logging(
    log_level: str = "INFO", 
    log_dir: Optional[str] = None, 
    max_log_size_mb: int = 10, 
    backup_count: int = 5,
    log_format: str = 'text',
    console_enabled: bool = True,
    file_enabled: bool = False
) -> None:
    """
    Configure comprehensive structured logging for the application.
    
    Args:
        log_level (str): Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir (str, optional): Directory to store log files
        max_log_size_mb (int): Maximum log file size in megabytes
        backup_count (int): Number of backup log files to keep
        log_format (str): Log format (json, text)
        console_enabled (bool): Enable console logging
        file_enabled (bool): Enable file logging
    """
    # Detailed log format
    log_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(name)s | %(filename)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Handlers list
    handlers = []

    # Console logging
    if console_enabled:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(log_formatter)
        handlers.append(console_handler)

    # File logging
    if file_enabled and log_dir:
        os.makedirs(log_dir, exist_ok=True)
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'app.log'),
            maxBytes=max_log_size_mb * 1024 * 1024,
            backupCount=backup_count
        )
        file_handler.setFormatter(log_formatter)
        handlers.append(file_handler)

    # Configure basic logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        handlers=handlers,
        format='%(asctime)s | %(levelname)s | %(name)s | %(filename)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Configure structlog processors
    processors = [
        # Add context to log entries
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        
        # Add timestamp and request ID
        structlog.processors.TimeStamper(fmt="iso"),
        
        # Add process and thread information
        lambda _, __, event_dict: {
            **event_dict,
            'process_id': os.getpid(),
            'thread_id': threading.get_ident(),
            'request_id': _get_request_id()
        },
        
        # Enhanced exception handling
        structlog.processors.format_exc_info,
        structlog.processors.dict_tracebacks,
    ]

    # Add renderer based on log format
    if log_format == 'json':
        processors.append(
            structlog.processors.JSONRenderer(
                serializer=lambda obj: json.dumps(
                    obj, 
                    default=lambda o: str(o) if hasattr(o, '__str__') else repr(o),
                    indent=2  # Pretty print JSON
                )
            )
        )
    else:
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True, 
                exception_formatter=_enhanced_exception_formatter
            )
        )

    # Configure structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None, **initial_values: Any) -> structlog.BoundLogger:
    """
    Create a structured logger with optional initial context.
    
    Args:
        name (str, optional): Logger name. Defaults to None.
        **initial_values: Initial context values to add to the logger.
    
    Returns:
        structlog.BoundLogger: Configured logger
    """
    logger = structlog.get_logger(name)
    
    # Add initial context if provided
    if initial_values:
        logger = logger.bind(**initial_values)
    
    return logger


class LoggingMixin:
    """
    Mixin to provide structured logging to classes.
    
    Adds a logger attribute with the class name as the logger name.
    Allows easy logging with context.
    """
    
    def __init__(self, *args, **kwargs):
        self.logger = get_logger(self.__class__.__name__)
        super().__init__(*args, **kwargs)


def log_method_call(log_level: str = "info"):
    """
    Decorator to automatically log method calls with arguments and return values.
    Supports both synchronous and asynchronous methods.
    
    Args:
        log_level (str): Logging level for method call (default: "info")
    """
    def decorator(func):
        import asyncio
        import inspect

        async def async_wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            log_method = getattr(logger, log_level)
            
            # Log method entry with arguments
            log_method(
                "Method called", 
                method=func.__name__, 
                args=[repr(arg) for arg in args],
                kwargs={k: repr(v) for k, v in kwargs.items()}
            )
            
            try:
                # Execute the method
                result = await func(*args, **kwargs)
                
                # Log method exit with return value
                log_method(
                    "Method completed", 
                    method=func.__name__, 
                    result=repr(result)
                )
                
                return result
            
            except Exception as e:
                # Log any exceptions with detailed traceback
                logger.exception(
                    "Method raised exception", 
                    method=func.__name__, 
                    error=_enhanced_exception_formatter(sys.exc_info())
                )
                raise
        
        def sync_wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            log_method = getattr(logger, log_level)
            
            # Log method entry with arguments
            log_method(
                "Method called", 
                method=func.__name__, 
                args=[repr(arg) for arg in args],
                kwargs={k: repr(v) for k, v in kwargs.items()}
            )
            
            try:
                # Execute the method
                result = func(*args, **kwargs)
                
                # Log method exit with return value
                log_method(
                    "Method completed", 
                    method=func.__name__, 
                    result=repr(result)
                )
                
                return result
            
            except Exception as e:
                # Log any exceptions with detailed traceback
                logger.exception(
                    "Method raised exception", 
                    method=func.__name__, 
                    error=_enhanced_exception_formatter(sys.exc_info())
                )
                raise
        
        # Return the appropriate wrapper based on method type
        return async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper
    return decorator


# Configure logging on import
configure_logging(
    log_level=os.getenv('LOG_LEVEL', 'INFO'),
    log_dir=os.getenv('LOG_DIR'),
    log_format=os.getenv('LOG_FORMAT', 'text'),
    console_enabled=os.getenv('LOG_CONSOLE_ENABLED', 'true').lower() == 'true',
    file_enabled=os.getenv('LOG_FILE_ENABLED', 'false').lower() == 'true',
    max_log_size_mb=int(os.getenv('LOG_MAX_SIZE_MB', '10')),
    backup_count=int(os.getenv('LOG_BACKUP_COUNT', '5'))
)
