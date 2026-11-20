from typing import Any

from fastapi import FastAPI

from slayer_zoom.core import Ladder


def create_app() -> FastAPI:
    app = FastAPI(title="slayer-zoom")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/schema/ladder")
    def ladder_schema() -> dict[str, Any]:
        return Ladder.model_json_schema()

    return app


app = create_app()
