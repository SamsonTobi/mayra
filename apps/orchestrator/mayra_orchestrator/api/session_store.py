"""Session token store for password auth mode.

Maps session_token → {user_id, created_at, expires_at}.
Persists to a JSON file on the Modal Volume so sessions survive
container restarts (scale-to-zero). Users stay logged in across
container restarts until the session expires (24h default).
"""

from __future__ import annotations

import hmac
import json
import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class SessionInfo:
    token: str
    user_id: str
    created_at: float
    expires_at: float

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    def to_dict(self) -> dict:
        return {
            "token": self.token,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "SessionInfo":
        return cls(
            token=d["token"],
            user_id=d["user_id"],
            created_at=d["created_at"],
            expires_at=d["expires_at"],
        )


class SessionStore:
    """In-memory session store with optional file persistence."""

    def __init__(
        self,
        *,
        session_ttl_seconds: int = 86400,
        persist_path: str | Path | None = None,
    ) -> None:
        self._sessions: dict[str, SessionInfo] = {}
        self._ttl = session_ttl_seconds
        self._persist_path = Path(persist_path) if persist_path else None
        self._lock = threading.Lock()
        self._load()

    def _load(self) -> None:
        """Load sessions from the persist file if it exists."""
        if not self._persist_path or not self._persist_path.is_file():
            return
        try:
            with open(self._persist_path) as f:
                data = json.load(f)
            now = time.time()
            loaded = 0
            for entry in data.get("sessions", []):
                info = SessionInfo.from_dict(entry)
                if not info.is_expired:
                    self._sessions[info.token] = info
                    loaded += 1
            log.info("[session_store] loaded %d sessions from %s", loaded, self._persist_path)
        except Exception as e:
            log.warning("[session_store] failed to load sessions: %s", e)

    def _save(self) -> None:
        """Save sessions to the persist file."""
        if not self._persist_path:
            return
        try:
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "sessions": [s.to_dict() for s in self._sessions.values()],
            }
            # Write to temp file then rename for atomicity
            tmp = self._persist_path.with_suffix(".tmp")
            with open(tmp, "w") as f:
                json.dump(data, f)
            os.replace(tmp, self._persist_path)
        except Exception as e:
            log.warning("[session_store] failed to save sessions: %s", e)

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
        with self._lock:
            self._sessions[token] = info
            self._save()
        return info

    def validate(self, token: str) -> SessionInfo | None:
        """Return the session if valid and not expired, else None."""
        with self._lock:
            info = self._sessions.get(token)
            if info is None or info.is_expired:
                if info is not None:
                    # Lazy cleanup of expired sessions
                    self._sessions.pop(token, None)
                    self._save()
                return None
            return info

    def revoke(self, token: str) -> bool:
        """Remove a session. Returns True if it existed."""
        with self._lock:
            removed = self._sessions.pop(token, None) is not None
            if removed:
                self._save()
            return removed

    def revoke_all(self) -> int:
        """Remove all sessions. Returns the count removed."""
        with self._lock:
            n = len(self._sessions)
            self._sessions.clear()
            self._save()
            return n

    def count(self) -> int:
        return len(self._sessions)


def verify_password(provided: str, expected: str) -> bool:
    """Constant-time password comparison."""
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided, expected)
