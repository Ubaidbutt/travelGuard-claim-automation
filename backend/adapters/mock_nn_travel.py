import json
from datetime import date
from functools import lru_cache
from pathlib import Path

import pypdf

from adapters.base import InsurerAdapter
from models.policy import ClaimHistory, CoverageLimit, PolicyHolder, PolicySchedule, PolicyWording

_ADAPTER_DIR = Path(__file__).parent
_POLICIES_PATH = _ADAPTER_DIR / "mock_policies.json"
_MASTER_POLICY_PATH = _ADAPTER_DIR / "master_policy.pdf"


class PolicyNotFoundError(Exception):
    pass


def _load_policies() -> dict[str, dict]:
    with _POLICIES_PATH.open() as f:
        return json.load(f)


_POLICIES: dict[str, dict] = _load_policies()


def get_policy(policy_number: str) -> dict | None:
    """Return the raw policy profile for a given policy number, or None if not found."""
    return _POLICIES.get(policy_number)


@lru_cache(maxsize=1)
def _extract_master_policy_text() -> str:
    reader = pypdf.PdfReader(str(_MASTER_POLICY_PATH))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def get_mock_wording() -> PolicyWording:
    return PolicyWording(
        insurer_id="nn_travel",
        version="2025.1",
        extracted_text=_extract_master_policy_text(),
    )


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


class MockNNTravelAdapter(InsurerAdapter):
    async def fetch(self, policy_number: str) -> PolicySchedule:
        profile = get_policy(policy_number)
        if profile is None:
            raise PolicyNotFoundError(
                f"Policy number '{policy_number}' was not found. "
                "Please check your policy number and try again."
            )
        return PolicySchedule(
            policy_number=policy_number,
            insurer_id="nn_travel",
            product_tier=profile["product_tier"],
            status=profile["status"],
            purchase_date=_parse_date(profile["purchase_date"]),
            coverage_start=_parse_date(profile["coverage_start"]),
            coverage_end=_parse_date(profile["coverage_end"]),
            holder=PolicyHolder(
                full_name=profile["holder"]["full_name"],
                date_of_birth=_parse_date(profile["holder"]["date_of_birth"]),
                email=profile["holder"]["email"],
            ),
            coverage_limits=[CoverageLimit(**lim) for lim in profile["coverage_limits"]],
            add_ons=profile["add_ons"],
            claim_history=ClaimHistory(**profile["claim_history"]),
        )
