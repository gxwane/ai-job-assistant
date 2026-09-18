import os
import subprocess
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


class StartupEncodingTests(unittest.TestCase):
    def test_startup_event_handles_gbk_stdout(self):
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "gbk"

        result = subprocess.run(
            [sys.executable, "-c", "from app.main import startup_event; startup_event()"],
            cwd=BACKEND_DIR,
            env=env,
            capture_output=True,
            text=True,
        )

        self.assertEqual(
            result.returncode,
            0,
            msg=f"startup_event should succeed under GBK stdout.\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}",
        )


if __name__ == "__main__":
    unittest.main()
