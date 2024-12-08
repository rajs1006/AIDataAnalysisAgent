from functools import wraps


def sync_wrapper(async_func):
    @wraps(async_func)
    def wrapped_func(*args, **kwargs):
        import asyncio

        return asyncio.run(async_func(*args, **kwargs))

    return wrapped_func
