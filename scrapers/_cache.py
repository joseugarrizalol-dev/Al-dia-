import time

_store: dict = {}

def get(key: str):
    entry = _store.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    return None

def set(key: str, value, ttl: int):
    _store[key] = (value, time.time() + ttl)
