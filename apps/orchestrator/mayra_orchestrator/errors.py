"""Exception hierarchy. Subclasses map 1:1 to HTTP statuses in the future."""
from __future__ import annotations


class MayraError(Exception):
    """Root of every domain error Mayra raises."""

    code: str = "internal"


class ActionValidationError(MayraError):
    """The action did not pass schema, ref, or policy validation."""

    code: str = "action_validation_error"


class SchemaRepairableError(MayraError):
    """Model output failed parsing or schema; one repair attempt is allowed."""


class BudgetExhaustedError(MayraError):
    """Step, retry, or repair budget hit zero."""

    code: str = "budget_exhausted"


class BrowserError(MayraError):
    """agent-browser returned an error or exited non-zero."""

    code: str = "browser_error"


class ProviderError(MayraError):
    """Model provider failed after retries."""

    code: str = "provider_error"


class UserInterventionRequired(MayraError):
    """Approval was rejected, timed out, or 2FA is needed."""


class OwnerMismatchError(MayraError):
    """Caller cannot operate on another principal's task."""

    code: str = "owner_mismatch"
