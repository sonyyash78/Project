import pkgutil
import importlib
from pathlib import Path

package_dir = Path(__file__).resolve().parent

for (_, module_name, _) in pkgutil.iter_modules([str(package_dir)]):
    importlib.import_module(f"{__name__}.{module_name}")
