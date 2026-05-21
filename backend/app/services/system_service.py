import os
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT_RUNNER = os.getenv('TAKEPANEL_SCRIPT_RUNNER', '/usr/local/bin/takepanel-script-runner')


def _rewrite_script_command(command: list[str]) -> list[str]:
    if len(command) < 2:
        return command

    launcher = Path(command[0]).name
    if launcher not in {'bash', 'sh'}:
        return command

    script_candidate = Path(command[1])
    if script_candidate.suffix != '.sh':
        return command

    script_name = script_candidate.name
    return ['sudo', '-n', SCRIPT_RUNNER, script_name, *command[2:]]


def run_command(command: list[str]) -> tuple[bool, str]:
    """Run a system command and return status with output."""
    if os.getenv('MOCK_SYSTEM_COMMANDS', 'true').lower() == 'true':
        return True, f"MOCK: {' '.join(command)}"

    resolved_command = _rewrite_script_command(command)
    proc = subprocess.run(resolved_command, capture_output=True, text=True, check=False, cwd=str(REPO_ROOT))
    output = '\n'.join(part.strip() for part in [proc.stdout or '', proc.stderr or ''] if part.strip())
    return proc.returncode == 0, output


def control_web_service(action: str, service_name: str) -> tuple[bool, str]:
    return run_command(['systemctl', action, service_name])
