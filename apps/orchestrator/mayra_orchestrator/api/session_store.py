"""In-memory session token store for password auth mode.

Maps session_token → {user_id, created_at, expires_at}.
For 4–8 concurrent users on a warm Modal container, in-memory is sufficient.
Sessions are lost on container restart — users re-enter the shared password.
"""

from __future__ import annotations

import hmac
import time
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class SessionInfo:
    token: str
    user_id: str
    created_at: float
    expires_at: float

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class SessionStore:
    """Thread-safe in-memory session store."""

    def __init__(self, *, session_ttl_seconds: int = 86400) -> None:
        self._sessions: dict[str, SessionInfo] = {}
        self._ttl = session_ttl_seconds

    def create_session(self) -> SessionInfo:
        """Create a new session with a random token and user_id."""
        token = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        now = time.time()
        info = SessionInfo(
            token=token,
            user_id=user_id,
            created_at=now,
            expires_at=now + self._ttl,
        )
        self._sessions[token] = info
        return info

    def validate(self, token: str) -> SessionInfo | None:
        """Return the session if valid and not expired, else None."""
        info = self._sessions.get(token)
        if info is None or info.is_expired:
            if info is not None:
                # Lazy cleanup of expired sessions
                self._sessions.pop(token, None)
            return None
        return info

    def revoke(self, token: str) -> bool:
        """Remove a session. Returns True if it existed."""
        return self._sessions.pop(token, None) is not None

    def revoke_all(self) -> int:
        """Remove all sessions. Returns the count removed."""
        n = len(self._sessions)
        self._sessions.clear()
        return n

    def count(self) -> int:
        return len(self._sessions)


def verify_password(provided: str, expected: str) -> bool:
    """Constant-time password comparison."""
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided, expected)
