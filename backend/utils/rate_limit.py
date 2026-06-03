from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, Request


class IPRateLimiter:
    """In-memory per-IP rate limiter with a sliding window."""

    def __init__(self, max_requests: int, window_minutes: int) -> None:
        self._max = max_requests
        self._window = timedelta(minutes=window_minutes)
        self._log: defaultdict[str, list[datetime]] = defaultdict(list)

    def check(self, request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        now = datetime.now(timezone.utc)
        cutoff = now - self._window
        self._log[ip] = [t for t in self._log[ip] if t > cutoff]
        if len(self._log[ip]) >= self._max:
            raise HTTPException(
                status_code=429,
                detail="Too many demo requests. Please try again in a little while.",
            )
        self._log[ip].append(now)


class GlobalDailyCounter:
    """In-memory global daily cap that resets at midnight UTC."""

    def __init__(self, max_per_day: int) -> None:
        self._max = max_per_day
        self._count = 0
        self._reset_date: date = date.today()

    def check(self) -> None:
        today = date.today()
        if today != self._reset_date:
            self._count = 0
            self._reset_date = today
        if self._count >= self._max:
            raise HTTPException(
                status_code=429,
                detail="The demo has reached its daily limit. Please come back tomorrow.",
            )
        self._count += 1
