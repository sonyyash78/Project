"""Structured logging with file rotation and request context."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# ── Log directory ─────────────────────────────────────────────
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ── Formatter ─────────────────────────────────────────────────
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

# ── Console Handler ───────────────────────────────────────────
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

# ── File Handler (with rotation) ──────────────────────────────
from logging.handlers import RotatingFileHandler

file_handler = RotatingFileHandler(
    LOG_DIR / "examside.log",
    maxBytes=5 * 1024 * 1024,  # 5MB
    backupCount=5,
    encoding="utf-8",
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)

# ── Security-specific log file ────────────────────────────────
security_handler = RotatingFileHandler(
    LOG_DIR / "security.log",
    maxBytes=5 * 1024 * 1024,
    backupCount=10,
    encoding="utf-8",
)
security_handler.setFormatter(formatter)
security_handler.setLevel(logging.INFO)

# ── Main Logger ───────────────────────────────────────────────
logger = logging.getLogger("examside")
logger.setLevel(logging.DEBUG)
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# ── Security Logger ───────────────────────────────────────────
security_logger = logging.getLogger("examside.security")
security_logger.setLevel(logging.INFO)
security_logger.addHandler(security_handler)
security_logger.addHandler(console_handler)

# ── Suppress noisy libraries ──────────────────────────────────
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
