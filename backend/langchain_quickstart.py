"""Simplified Snow Leopard housing query module for CLI and Flask."""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from snowleopard import SnowLeopardClient


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

DEFAULT_LISTING_LIMIT = 10


def get_model_name() -> str:
    """Kept for compatibility with older CLI usage."""
    parser = argparse.ArgumentParser(description="Snow Leopard Housing Quick Start")
    parser.add_argument("--model", type=str, default=None, help="Unused compatibility flag.")
    args, _ = parser.parse_known_args()
    return args.model or os.getenv("MODEL_NAME", "gpt-4o")


def validate_environment() -> None:
    required_vars = ["SNOWLEOPARD_API_KEY", "SNOWLEOPARD_DATAFILE_ID"]
    missing = [name for name in required_vars if not os.getenv(name)]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


def get_client() -> SnowLeopardClient:
    validate_environment()
    return SnowLeopardClient(api_key=os.getenv("SNOWLEOPARD_API_KEY"))


def normalize_key(key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(key).strip().lower()).strip("_")


def coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_summary(summary: Any) -> str:
    if summary is None:
        return ""
    if isinstance(summary, str):
        return summary
    if isinstance(summary, dict):
        non_technical = summary.get("non_technical_explanation")
        technical = summary.get("technical_details")
        if isinstance(non_technical, str) and non_technical.strip():
            return non_technical
        if isinstance(technical, str) and technical.strip():
            return technical
    try:
        return json.dumps(summary)
    except TypeError:
        return str(summary)


def build_housing_prompt(query: str, limit: int = DEFAULT_LISTING_LIMIT) -> str:
    return f"""
You are querying a Boston housing SQLite dataset.

User request:
{query}

Return housing results that are easy to plot on a map.

Important schema guidance:
- The main table is `properties`.
- This database is intentionally small and only includes these useful columns:
  `pid`, `price`, `surface_area_sqft`, `rooms`, `latitude`, `longitude`.
- There is no address column in this database.
- When returning results for the map, include: `pid`, `price`, `surface_area_sqft`, `rooms`, `latitude`, `longitude`.
- Prefer records with non-null latitude and longitude.
- Prefer records with positive price and positive surface area when possible.
- If the user asks for houses, homes, condos, apartments, or listings, use the available schema as the best approximation of housing results.
- Limit result rows to {limit} unless the user explicitly asks for more.
- Sort results in a user-friendly way based on the request.

Please answer the user's request directly against the dataset.
""".strip()


def build_residential_retry_prompt(query: str, limit: int = DEFAULT_LISTING_LIMIT) -> str:
    return f"""
The user wants housing-style results for a map from a minimal schema.

Original request:
{query}

Use the available columns as the only source of truth.

Hard requirements:
- Use the `properties` table.
- Return these columns: pid, price, surface_area_sqft, rooms, latitude, longitude.
- Exclude rows with missing latitude or longitude.
- Prefer rows where price > 0 and surface_area_sqft > 0.
- Limit results to {limit}.
- Do not reference non-existent columns such as address, zip_code, bedrooms, bathrooms, or living_area_sqft.

The result should be directly usable as properties on a Boston map.
""".strip()


def is_housing_search(query: str) -> bool:
    lower_query = query.lower()
    keywords = ["house", "home", "housing", "apartment", "property", "condo", "listing", "map"]
    return any(keyword in lower_query for keyword in keywords)


def extract_listings(rows: list[dict[str, Any]], limit: int = DEFAULT_LISTING_LIMIT) -> list[dict[str, Any]]:
    listings: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for row in rows:
        normalized = {normalize_key(key): value for key, value in row.items()}
        pid = str(normalized.get("pid") or "").strip()
        address = (
            normalized.get("address")
            or normalized.get("full_address")
            or normalized.get("property_address")
            or normalized.get("street_address")
        )
        latitude = coerce_float(normalized.get("latitude") or normalized.get("lat"))
        longitude = coerce_float(
            normalized.get("longitude") or normalized.get("lon") or normalized.get("lng")
        )

        total_value = coerce_float(normalized.get("price") or normalized.get("total_value"))
        bedrooms = coerce_float(normalized.get("bedrooms"))
        bathrooms = coerce_float(normalized.get("bathrooms"))
        living_area_sqft = coerce_float(
            normalized.get("surface_area_sqft") or normalized.get("living_area_sqft")
        )
        rooms = coerce_float(normalized.get("rooms"))

        label = str(address or "").strip() or (f"PID {pid}" if pid else "")
        dedupe_key = pid or label
        if not label or latitude is None or longitude is None or dedupe_key in seen_ids:
            continue

        looks_usable = (
            (living_area_sqft is not None and living_area_sqft > 0)
            or (rooms is not None and rooms > 0)
            or (total_value is not None and total_value > 0)
        )
        if not looks_usable:
            continue

        if total_value is not None and total_value <= 0:
            continue

        seen_ids.add(dedupe_key)
        listings.append(
            {
                "pid": pid,
                "address": label,
                "zip_code": str(normalized.get("zip_code") or "").strip(),
                "total_value": total_value,
                "bedrooms": bedrooms,
                "bathrooms": bathrooms,
                "living_area_sqft": living_area_sqft,
                "rooms": rooms,
                "latitude": latitude,
                "longitude": longitude,
                "property_type_code": str(normalized.get("property_type_code") or "").strip(),
            }
        )

        if len(listings) >= limit:
            break

    return listings


def build_answer(query: str, row_count: int, listings: list[dict[str, Any]]) -> str:
    if row_count == 0:
        return f"No matching properties were found for: {query}"

    if not listings:
        return f"Found {row_count} matching properties, but none had usable coordinates for the map."

    sample_addresses = ", ".join(listing["address"] for listing in listings[:3])
    return (
        f"Found {row_count} matching properties. "
        f"Showing {len(listings)} properties on the map, including {sample_addresses}."
    )


def ask_question(query: str, model_name: str | None = None) -> dict[str, Any]:
    """Run a direct Snow Leopard housing query from natural language."""
    client = get_client()
    prompts = [build_housing_prompt(query)]
    if is_housing_search(query):
        prompts.append(build_residential_retry_prompt(query))

    final_item = None
    rows: list[dict[str, Any]] = []
    listings: list[dict[str, Any]] = []
    summary = ""

    for index, prompt in enumerate(prompts):
        try:
            response = client.retrieve(
                datafile_id=os.getenv("SNOWLEOPARD_DATAFILE_ID"),
                user_query=prompt,
            )
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc

        if response.responseStatus != "SUCCESS":
            raise RuntimeError(f"Snow Leopard query failed: {response.responseStatus}")

        if not response.data:
            continue

        final_item = response.data[0]
        rows = final_item.rows or []
        listings = extract_listings(rows)
        summary = normalize_summary(getattr(final_item, "querySummary", "") or "")

        if listings or index == len(prompts) - 1:
            break

    if final_item is None:
        return {
            "answer": f"No data returned for: {query}",
            "sql": "",
            "summary": "",
            "row_count": 0,
            "rows_preview": [],
            "listings": [],
            "model": model_name or get_model_name(),
        }

    return {
        "answer": build_answer(query, len(rows), listings),
        "sql": getattr(final_item, "query", "") or "",
        "summary": summary,
        "row_count": len(rows),
        "rows_preview": rows[:10],
        "listings": listings,
        "model": model_name or get_model_name(),
    }


def main() -> None:
    query = "List houses priced under 2 million dollars"

    try:
        print(f"\nQuery: {query}\n")
        result = ask_question(query)
        print("\n" + "=" * 60)
        print("RESULT:")
        print("=" * 60)
        print(result["answer"])
        if result["sql"]:
            print("\nSQL:")
            print(result["sql"])
    except Exception as exc:
        print(f"Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
