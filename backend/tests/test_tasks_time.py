"""RF-008, RF-012, RF-024: lógica pura de fechas de tareas."""

from datetime import UTC, datetime, timedelta, timezone

from app.core.tasks_time import is_saveable, overlaps, start_search_window, to_utc, valid_range

T = datetime(2026, 11, 3, 12, 0, tzinfo=UTC)


def test_to_utc_converts_offsets() -> None:
    bogota = timezone(timedelta(hours=-5))
    assert to_utc(datetime(2026, 11, 3, 23, 30, tzinfo=bogota)) == datetime(
        2026, 11, 4, 4, 30, tzinfo=UTC
    )


def test_overlaps_half_open() -> None:
    day_start, day_end = T.replace(hour=0), T.replace(hour=0) + timedelta(days=1)
    assert overlaps(T, 30, day_start, day_end)
    assert not overlaps(day_end, 30, day_start, day_end)  # empieza justo al final
    assert not overlaps(
        day_start - timedelta(minutes=30), 30, day_start, day_end
    )  # termina justo al inicio
    assert overlaps(day_start - timedelta(minutes=29), 30, day_start, day_end)  # 1 min dentro


def test_search_window_goes_back_24_hours() -> None:
    assert start_search_window(T) == T - timedelta(hours=24)


def test_valid_range() -> None:
    assert valid_range(T, T + timedelta(days=42))
    assert not valid_range(T, T)
    assert not valid_range(T + timedelta(days=1), T)
    assert not valid_range(T, T + timedelta(days=44))


def test_saveable_window_is_about_five_years() -> None:
    now = T
    assert is_saveable(now + timedelta(days=365), now)
    assert is_saveable(now - timedelta(days=365 * 4), now)
    assert not is_saveable(now + timedelta(days=366 * 6), now)
