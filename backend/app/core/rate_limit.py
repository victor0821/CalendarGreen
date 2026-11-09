"""Limitador de intentos en memoria (RF-009).

Limitación conocida: el estado se pierde cuando el servidor gratuito duerme o se reinicia
(documentado en el plan de 001). Es suficiente para v1.
"""

import math
import time
from collections import defaultdict, deque
from collections.abc import Callable


class InMemoryAttemptLimiter:
    """Bloquea una clave tras `max_attempts` fallos en `window_seconds`, durante `lock_seconds`."""

    def __init__(
        self,
        max_attempts: int,
        window_seconds: float,
        lock_seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lock_seconds = lock_seconds
        self._clock = clock
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._locked_until: dict[str, float] = {}

    def retry_after(self, key: str) -> int:
        """Segundos que faltan para que se libere la clave; 0 si no está bloqueada."""
        now = self._clock()
        until = self._locked_until.get(key)
        if until is None:
            return 0
        if now >= until:
            del self._locked_until[key]
            self._failures.pop(key, None)
            return 0
        return math.ceil(until - now)

    def record_failure(self, key: str) -> None:
        now = self._clock()
        failures = self._failures[key]
        failures.append(now)
        while failures and now - failures[0] > self.window_seconds:
            failures.popleft()
        if len(failures) >= self.max_attempts:
            self._locked_until[key] = now + self.lock_seconds

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)
        self._locked_until.pop(key, None)
