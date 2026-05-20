import os
import subprocess


def run_command(command: list[str]) -> tuple[bool, str]:
    """Run a system command and return status with output."""
    if os.getenv('MOCK_SYSTEM_COMMANDS', 'true').lower() == 'true':
        return True, f"MOCK: {' '.join(command)}"

    proc = subprocess.run(command, capture_output=True, text=True, check=False)
    output = (proc.stdout or proc.stderr).strip()
    return proc.returncode == 0, output


def control_web_service(action: str, service_name: str) -> tuple[bool, str]:
    return run_command(['systemctl', action, service_name])
