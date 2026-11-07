"""Baut alle Smartphone-Seiten mit einer neuen Version (Cache-Bremse) und schreibt assets/version.json.

Aufruf: python3 tools/alles_bauen.py [version]   (ohne Angabe: Datum + Uhrzeit)
Offene Seiten auf den Handys vergleichen ihre Version mit assets/version.json und laden sich bei
einer neueren Fassung einmal selbst neu (siehe assets/ils-konto.js).
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V = sys.argv[1] if len(sys.argv) > 1 else time.strftime("v%Y%m%d%H%M")

for skript in ("drainage_bau.py", "me_bau.py", "probe_bau.py"):
    subprocess.run([sys.executable, str(ROOT / "tools" / skript), V], check=True, stdout=subprocess.DEVNULL)
lk = ROOT / "lehrkraft/index.html"
lk.write_text(re.sub(r"\?v=[A-Za-z0-9_-]+", f"?v={V}", lk.read_text(encoding="utf-8")), encoding="utf-8")
(ROOT / "assets/version.json").write_text(json.dumps({"version": V}) + "\n", encoding="utf-8")
print("gebaut mit Version", V)
