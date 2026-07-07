import time
import threading
import logging
from app.utils.config import (
    GEMINI_API_KEY_1,
    GEMINI_API_KEY_2,
    GEMINI_API_KEY_3,
    GEMINI_API_KEY_4,
    GEMINI_API_KEY
)

logger = logging.getLogger("examside")

class KeyState:
    def __init__(self, key: str, index: int):
        self.key = key
        self.index = index
        self.masked_key = self._mask(key)
        self.is_healthy = True
        self.disabled_until = 0.0
        self.usage_count = 0
        self.failure_count = 0

    def _mask(self, key: str) -> str:
        if len(key) > 8:
            return key[:4] + "*" * (len(key) - 8) + key[-4:]
        return "***"

class GeminiKeyManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(GeminiKeyManager, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self.keys = []
        raw_keys = [
            GEMINI_API_KEY_1,
            GEMINI_API_KEY_2,
            GEMINI_API_KEY_3,
            GEMINI_API_KEY_4
        ]
        
        # Load multiple keys
        idx = 1
        for k in raw_keys:
            if k and k.strip():
                self.keys.append(KeyState(k.strip(), idx))
            idx += 1
            
        # Fallback to single key if no multiple keys defined
        if not self.keys and GEMINI_API_KEY and GEMINI_API_KEY.strip():
            self.keys.append(KeyState(GEMINI_API_KEY.strip(), 1))
            
        self.current_index = 0
        self.manager_lock = threading.Lock()
        
        logger.info(f"Initialized GeminiKeyManager with {len(self.keys)} keys.")
        for ks in self.keys:
            logger.info(f"Loaded Key {ks.index}: {ks.masked_key}")

    def get_next_key(self) -> KeyState:
        with self.manager_lock:
            if not self.keys:
                raise ValueError("No Gemini API keys are configured.")
                
            now = time.time()
            # Try to find a healthy key or a key whose cooldown has expired
            for _ in range(len(self.keys)):
                ks = self.keys[self.current_index]
                self.current_index = (self.current_index + 1) % len(self.keys)
                
                if not ks.is_healthy and now >= ks.disabled_until:
                    ks.is_healthy = True
                    logger.info(f"Key {ks.index} ({ks.masked_key}) is now healthy again.")
                    
                if ks.is_healthy:
                    ks.usage_count += 1
                    return ks
            
            # If all keys are disabled, just force return the first one (we shouldn't completely halt)
            logger.warning("All keys are currently disabled! Forcing fallback to next key anyway.")
            ks = self.keys[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.keys)
            ks.usage_count += 1
            return ks

    def report_failure(self, key_state: KeyState, error_msg: str):
        with self.manager_lock:
            key_state.failure_count += 1
            if "429" in error_msg or "503" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                key_state.is_healthy = False
                key_state.disabled_until = time.time() + 65.0  # Disable for 65 seconds
                logger.warning(f"Key {key_state.index} ({key_state.masked_key}) disabled for 65s due to rate limit/quota.")
            else:
                logger.warning(f"Key {key_state.index} ({key_state.masked_key}) reported a failure: {error_msg}")

    def get_report(self) -> dict:
        with self.manager_lock:
            report = {
                "total_keys": len(self.keys),
                "healthy_keys": sum(1 for k in self.keys if k.is_healthy),
                "disabled_keys": sum(1 for k in self.keys if not k.is_healthy),
                "keys_stats": [
                    {
                        "index": k.index,
                        "masked": k.masked_key,
                        "usage": k.usage_count,
                        "failures": k.failure_count,
                        "healthy": k.is_healthy
                    }
                    for k in self.keys
                ]
            }
            return report

key_manager = GeminiKeyManager()
