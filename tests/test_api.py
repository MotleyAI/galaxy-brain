from fastapi.testclient import TestClient

from slayer_zoom.api import create_app


def test_health() -> None:
    client = TestClient(create_app())
    assert client.get("/health").json() == {"status": "ok"}


def test_ladder_schema_names_the_levels() -> None:
    client = TestClient(create_app())
    schema = client.get("/schema/ladder").json()
    assert schema["title"] == "Ladder"
    assert "levels" in schema["properties"]
