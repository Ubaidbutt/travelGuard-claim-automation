from adapters.base import InsurerAdapter
from adapters.mock_nn_travel import MockNNTravelAdapter

_registry: dict[str, InsurerAdapter] = {
    "nn_travel": MockNNTravelAdapter(),
}


def get_adapter(insurer_id: str) -> InsurerAdapter:
    adapter = _registry.get(insurer_id)
    if adapter is None:
        raise ValueError(f"No adapter registered for insurer: {insurer_id}")
    return adapter
