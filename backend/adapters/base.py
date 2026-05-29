from abc import ABC, abstractmethod
from models.policy import PolicySchedule


class InsurerAdapter(ABC):
    @abstractmethod
    async def fetch(self, policy_number: str) -> PolicySchedule:
        """Fetch policy schedule for the given policy number."""
        ...
