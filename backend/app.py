from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from langchain_quickstart import ask_question, validate_environment


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.get("/api/health")
def healthcheck():
    return jsonify({"ok": True})


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()

    if not message:
        return jsonify({"error": "Missing 'message' in request body."}), 400

    try:
        validate_environment()
        result = ask_question(message)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": f"Unexpected server error: {exc}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
