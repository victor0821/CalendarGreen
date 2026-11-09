"""RF-009 / CA-8: bloqueo tras varios fallos y liberación con el tiempo."""

from app.core.rate_limit import InMemoryAttemptLimiter


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_blocks_after_max_failures_and_releases() -> None:
    clock = Clock()
    limiter = InMemoryAttemptLimiter(3, window_seconds=60, lock_seconds=120, clock=clock)
    for _ in range(2):
        limiter.record_failure("k")
    assert limiter.retry_after("k") == 0
    limiter.record_failure("k")
    assert limiter.retry_after("k") == 120
    clock.now = 100
    assert limiter.retry_after("k") == 20
    clock.now = 121
    assert limiter.retry_after("k") == 0


def test_old_failures_leave_the_window() -> None:
    clock = Clock()
    limiter = InMemoryAttemptLimiter(3, window_seconds=60, lock_seconds=120, clock=clock)
    limiter.record_failure("k")
    limiter.record_failure("k")
    clock.now = 61
    limiter.record_failure("k")
    assert limiter.retry_after("k") == 0


def test_keys_are_independent_and_reset_clears() -> None:
    limiter = InMemoryAttemptLimiter(1, 60, 60, clock=Clock())
    limiter.record_failure("a")
    assert limiter.retry_after("a") > 0
    assert limiter.retry_after("b") == 0
    limiter.reset("a")
    assert limiter.retry_after("a") == 0
