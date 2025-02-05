# AI Data Analysis Agent

## Overview

This is a sophisticated AI-powered data analysis agent built with FastAPI, designed to provide advanced data processing, retrieval, and interaction capabilities.

## Features

- Structured Logging
- Advanced Authentication
- Vector Search
- RAG (Retrieval Augmented Generation)
- Multi-connector Support
- Image Processing
- Conversation Management

## Logging

We use advanced structured logging with JSON formatting. For detailed configuration and usage, see [LOGGING.md](LOGGING.md).

### Quick Logging Example

```python
from app.core.logging_config import get_logger

logger = get_logger(__name__)
logger.info("User action performed", user_id=user.id, action="login")
```

## Setup

### Prerequisites

- Python 3.10+
- MongoDB
- pip

### Installation

1. Clone the repository
2. Create a virtual environment
3. Install dependencies:

```bash
pip install -r requirements.txt
```

### Configuration

1. Copy `.env.logging.example` to `.env`
2. Adjust logging settings as needed

### Running the Application

```bash
uvicorn app.main:app --reload
```

## Environment Variables

See `.env.logging.example` for logging configuration.

## Testing

```bash
pytest
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Here]
