"""RF-029, RF-030, RF-031 / CA-22: expansión de repeticiones."""

from datetime import UTC, date, datetime

import pytest

from app.core.recurrence import (
    MAX_PER_BATCH,
    TooManyOccurrences,
    add_months,
    days_for,
    expand,
    horizon_end,
    local_to_utc,
)

BOGOTA = "America/Bogota"
NEW_YORK = "America/New_York"


def local_days(instants: list[datetime], tz: str) -> list[date]:
    from zoneinfo import ZoneInfo

    return [i.astimezone(ZoneInfo(tz)).date() for i in instants]


def test_add_months_clamps_to_month_end() -> None:
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert add_months(date(2028, 1, 31), 1) == date(2028, 2, 29)  # bisiesto
    assert add_months(date(2026, 11, 2), 12) == date(2027, 11, 2)
    assert add_months(date(2026, 12, 15), 1) == date(2027, 1, 15)


def test_days_for_each_kind() -> None:
    sunday = date(2026, 11, 1)
    assert days_for("weekly", None, sunday) == [7]
    assert days_for("weekdays", None, sunday) == [1, 2, 3, 4, 5]
    assert days_for("daily", None, sunday) == [1, 2, 3, 4, 5, 6, 7]
    assert days_for("custom", [5, 1, 3, 1], sunday) == [1, 3, 5]
    with pytest.raises(ValueError):
        days_for("mensual", None, sunday)


def test_weekdays_skip_weekends() -> None:
    """CA-22: desde un domingo, la primera repetición L–V es el lunes."""
    start = date(2026, 11, 1)  # domingo
    out = expand([1, 2, 3, 4, 5], start, 9 * 60, BOGOTA, horizon_end(start, BOGOTA))
    days = local_days(out, BOGOTA)
    assert days[0] == date(2026, 11, 2)
    assert date(2026, 11, 1) not in days
    assert all(d.isoweekday() <= 5 for d in days)
    assert days[-1] <= add_months(start, 12)
    assert 255 <= len(out) <= 265  # ~52 semanas × 5


def test_weekly_uses_the_weekday_of_the_start_date() -> None:
    start = date(2026, 11, 4)  # miércoles
    out = expand(days_for("weekly", None, start), start, 600, BOGOTA, horizon_end(start, BOGOTA))
    assert out[0] == local_to_utc(start, 600, BOGOTA)
    assert {d.isoweekday() for d in local_days(out, BOGOTA)} == {3}
    assert len(out) in (52, 53)


def test_daily_covers_twelve_months() -> None:
    start = date(2026, 11, 2)
    out = expand([1, 2, 3, 4, 5, 6, 7], start, 0, BOGOTA, horizon_end(start, BOGOTA))
    assert (
        len(out) == (add_months(start, 12) - start).days + 1
    )  # 366 días incluyendo ambos extremos
    assert len(out) <= MAX_PER_BATCH


def test_custom_days() -> None:
    start = date(2026, 11, 1)
    end = horizon_end(start, BOGOTA)
    out = expand([1, 2, 3, 5], start, 0, BOGOTA, end)
    assert end > out[-1]
    assert {d.isoweekday() for d in local_days(out, BOGOTA)} == {1, 2, 3, 5}
    assert local_days(out, BOGOTA)[0] == date(2026, 11, 2)  # lunes: el domingo no cuenta


def test_same_local_time_across_a_dst_change() -> None:
    """D-14: 9:00 a. m. en Nueva York se conserva aunque cambie el horario (en UTC cambia)."""
    start = date(2026, 3, 2)  # antes del cambio del 8 de marzo
    out = expand([1, 2, 3, 4, 5, 6, 7], start, 9 * 60, NEW_YORK, datetime(2026, 3, 15, tzinfo=UTC))
    from zoneinfo import ZoneInfo

    local_hours = {i.astimezone(ZoneInfo(NEW_YORK)).hour for i in out}
    utc_hours = {i.hour for i in out}
    assert local_hours == {9}
    assert utc_hours == {14, 13}  # 14:00 UTC antes del cambio y 13:00 UTC después


def test_after_continues_where_the_series_left_off() -> None:
    start = date(2026, 11, 2)
    full = expand([1, 2, 3, 4, 5, 6, 7], start, 600, BOGOTA, datetime(2026, 12, 31, tzinfo=UTC))
    cut = full[10]
    rest = expand(
        [1, 2, 3, 4, 5, 6, 7],
        start,
        600,
        BOGOTA,
        datetime(2026, 12, 31, tzinfo=UTC),
        after=cut,
    )
    assert rest == full[11:]


def test_ends_before_stops_generation() -> None:
    start = date(2026, 11, 2)
    out = expand(
        [1, 2, 3, 4, 5, 6, 7],
        start,
        600,
        BOGOTA,
        horizon_end(start, BOGOTA),
        ends_before=local_to_utc(date(2026, 11, 10), 600, BOGOTA),
    )
    assert local_days(out, BOGOTA)[-1] == date(2026, 11, 9)


def test_limit_is_enforced() -> None:
    start = date(2026, 11, 2)
    far = datetime(2030, 1, 1, tzinfo=UTC)
    with pytest.raises(TooManyOccurrences):
        expand([1, 2, 3, 4, 5, 6, 7], start, 0, BOGOTA, far)


def test_empty_days_give_no_occurrences() -> None:
    start = date(2026, 11, 2)
    assert expand([], start, 0, BOGOTA, horizon_end(start, BOGOTA)) == []


def test_bogota_late_evening_stays_on_its_local_day() -> None:
    """11:30 p. m. en Bogotá cae en el día siguiente en UTC; el día local no cambia."""
    start = date(2026, 11, 2)
    out = expand([1], start, 23 * 60 + 30, BOGOTA, datetime(2026, 11, 20, tzinfo=UTC))
    assert out[0] == datetime(2026, 11, 3, 4, 30, tzinfo=UTC)
    assert local_days(out, BOGOTA)[0] == date(2026, 11, 2)
