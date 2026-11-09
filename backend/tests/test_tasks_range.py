"""RF-008, RF-012 / CA-5, CA-13 de la spec 002: consulta por rango y zonas horarias."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from tests.helpers import auth_headers

BASE = "/api/v1/tasks"


@pytest.fixture
def headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client)


def _add(client: TestClient, headers, title: str, start: str, minutes: int = 30) -> dict:
    response = client.post(
        BASE,
        json={"title": title, "start_at": start, "duration_minutes": minutes},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _titles(client: TestClient, headers, start: str, end: str) -> list[str]:
    response = client.get(BASE, params={"from": start, "to": end}, headers=headers)
    assert response.status_code == 200, response.text
    return [t["title"] for t in response.json()["items"]]


def test_range_includes_inside_and_excludes_outside(client: TestClient, headers) -> None:
    _add(client, headers, "dentro", "2026-11-03T15:00:00Z")
    _add(client, headers, "antes", "2026-10-30T15:00:00Z")
    _add(client, headers, "después", "2026-11-12T15:00:00Z")
    assert _titles(client, headers, "2026-11-02T00:00:00Z", "2026-11-09T00:00:00Z") == ["dentro"]


def test_range_is_half_open_at_the_end(client: TestClient, headers) -> None:
    _add(client, headers, "justo-al-final", "2026-11-09T00:00:00Z")
    _add(client, headers, "justo-al-inicio", "2026-11-02T00:00:00Z")
    assert _titles(client, headers, "2026-11-02T00:00:00Z", "2026-11-09T00:00:00Z") == [
        "justo-al-inicio"
    ]


def test_task_crossing_midnight_shows_in_next_day(client: TestClient, headers) -> None:
    """CA-5: 11:30 p. m. + 60 min aparece también en el día siguiente."""
    _add(client, headers, "noche", "2026-11-03T23:30:00Z", 60)
    assert _titles(client, headers, "2026-11-04T00:00:00Z", "2026-11-05T00:00:00Z") == ["noche"]
    assert _titles(client, headers, "2026-11-03T00:00:00Z", "2026-11-04T00:00:00Z") == ["noche"]


def test_task_ending_exactly_at_range_start_is_excluded(client: TestClient, headers) -> None:
    _add(client, headers, "termina-justo", "2026-11-03T23:00:00Z", 60)
    assert _titles(client, headers, "2026-11-04T00:00:00Z", "2026-11-05T00:00:00Z") == []


def test_24_hour_task_started_the_day_before_is_found(client: TestClient, headers) -> None:
    _add(client, headers, "todo-el-dia", "2026-11-03T12:00:00Z", 1440)
    assert _titles(client, headers, "2026-11-04T00:00:00Z", "2026-11-04T12:00:00Z") == [
        "todo-el-dia"
    ]


def test_results_are_sorted_by_start(client: TestClient, headers) -> None:
    _add(client, headers, "tarde", "2026-11-03T18:00:00Z")
    _add(client, headers, "mañana", "2026-11-03T09:00:00Z")
    assert _titles(client, headers, "2026-11-03T00:00:00Z", "2026-11-04T00:00:00Z") == [
        "mañana",
        "tarde",
    ]


@pytest.mark.parametrize(
    ("start", "end"),
    [
        ("2026-11-09T00:00:00Z", "2026-11-02T00:00:00Z"),  # invertido
        ("2026-11-02T00:00:00Z", "2026-11-02T00:00:00Z"),  # vacío
        ("2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z"),  # demasiado largo
        ("2026-11-02T00:00:00", "2026-11-09T00:00:00"),  # sin zona
    ],
)
def test_invalid_ranges_are_rejected(client: TestClient, headers, start: str, end: str) -> None:
    response = client.get(BASE, params={"from": start, "to": end}, headers=headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_missing_range_params_are_rejected(client: TestClient, headers) -> None:
    assert client.get(BASE, headers=headers).status_code == 422


def test_six_week_month_grid_is_allowed(client: TestClient, headers) -> None:
    start = datetime.fromisoformat("2026-10-26T00:00:00+00:00")
    end = start + timedelta(days=42)
    assert _titles(client, headers, start.isoformat(), end.isoformat()) == []


def test_late_evening_in_bogota_is_listed_on_its_local_day(client: TestClient, headers) -> None:
    """CA-13: 11:30 p. m. en Bogotá (UTC-5) cae en el día siguiente en UTC, pero el cliente
    consulta su día local [00:00-05:00, 24:00-05:00) y la tarea debe aparecer ahí."""
    _add(client, headers, "noche-bogota", "2026-11-03T23:30:00-05:00")
    assert _titles(client, headers, "2026-11-03T00:00:00-05:00", "2026-11-04T00:00:00-05:00") == [
        "noche-bogota"
    ]
    assert _titles(client, headers, "2026-11-04T00:00:00-05:00", "2026-11-05T00:00:00-05:00") == []
