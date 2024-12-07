import os
import tempfile
import subprocess
import logging
from pathlib import Path
import shutil
from typing import Tuple
from app.models.schema.watcher import BuildPaths
from app.core.config.config import settings
import tkinter

logger = logging.getLogger(__name__)


class ExecutableBuilder:
    def __init__(self, connector, api_key):
        self.connector = connector
        self.api_key = api_key
        self.project_root = settings.PYTHONPATH
        self.watcher_dir = os.path.join(self.project_root, "watcher")
        self.spec_file = os.path.join(self.watcher_dir, "folder.spec")
        self.script_file = os.path.join(self.watcher_dir, "folder.py")
        self.env_file = os.path.join(self.watcher_dir, ".env")

    def _create_build_paths(self) -> BuildPaths:
        """Create and return all necessary build paths"""
        temp_dir = Path(tempfile.mkdtemp())
        print("-----------------  ", temp_dir)
        return BuildPaths(
            temp_dir=temp_dir,
            build_dir=temp_dir / "build",
            dist_dir=temp_dir / "dist",
            env_path=temp_dir / ".env",
        )

    def _create_env_file(self, temp_dir: Path) -> None:
        """Create and save .env file in the temp directory"""
        env_content = f"""SERVER_URL=http://localhost:8000
CONNECTOR_ID={str(self.connector.id)}
AUTH_TOKEN={str(self.api_key)}
PORT={str(settings.WATCHER_PORT)}
"""

        env_path = self.env_file
        try:
            with open(env_path, "w") as f:
                f.write(env_content)
            print(f"Created .env file at: {env_path}")
        except Exception as e:
            logger.error(f"Failed to write .env file: {str(e)}")
            raise

    async def _verify_dependencies(self):
        """Verify that all required Python packages are installed"""
        required_packages = [
            "chardet",
            "pdfplumber",
            "python-docx",
            "pytesseract",
            "Pillow",
            "textract",
            "python-magic",
            "watchdog",
            "python-dotenv",
        ]

        missing_packages = []

        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
            except ImportError:
                missing_packages.append(package)

        if missing_packages:
            error_msg = (
                f"Missing required Python packages: {', '.join(missing_packages)}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def _get_executable_name(self, platform: str = None) -> str:
        """Generate executable name based on platform"""
        executable_name = f"folder_watcher_{self.connector.id}"
        if platform and platform.lower() == "windows":
            executable_name += ".exe"
        return executable_name

    async def build(self, platform: str = None) -> Tuple[bytes, str]:
        """Build the executable using spec file and return its contents and name"""
        paths = None
        try:

            # Verify dependencies first
            # await self._verify_dependencies()

            # Create build paths
            paths = self._create_build_paths()

            # Create and save environment file
            # env_content = self._create_env_content()
            # paths.env_path.write_text(env_content)
            # print(paths.env_path.read_text())
            self._create_env_file(paths.temp_dir)
            # Generate executable name
            executable_name = self._get_executable_name(platform)

            # Copy spec file to temp directory
            temp_spec_file = paths.temp_dir / "folder.spec"
            shutil.copy2(self.spec_file, temp_spec_file)
            shutil.copy2(self.script_file, paths.temp_dir / "folder.py")
            shutil.copy2(self.env_file, paths.temp_dir / ".env")

            # Ensure Tcl/Tk files are available
            tkinter_path = os.path.dirname(tkinter.__file__)
            if os.path.exists(tkinter_path):
                tk_temp_dir = paths.temp_dir / "tkinter"
                tk_temp_dir.mkdir(exist_ok=True)
                shutil.copytree(tkinter_path, tk_temp_dir, dirs_exist_ok=True)

            # Create build command using spec file
            command = [
                "pyinstaller",
                "--clean",
                f"--distpath={paths.dist_dir}",
                f"--workpath={paths.build_dir}",
                str(temp_spec_file),
            ]

            # Run build command
            await self._run_build_command(command, str(paths.temp_dir))

            # Check for base executable first
            base_executable = paths.dist_dir / "folder_watcher"
            if platform and platform.lower() == "windows":
                base_executable = base_executable.with_suffix(".exe")

            if not base_executable.exists():
                raise RuntimeError(f"Executable not generated at {base_executable}")

            # Rename to include connector ID
            executable_name = self._get_executable_name(platform)
            final_path = paths.dist_dir / executable_name
            shutil.move(base_executable, final_path)

            final_path.chmod(0o755)
            with open(final_path, "rb") as f:
                executable_bytes = f.read()

            logger.info(f"Successfully built executable: {executable_name}")
            return executable_bytes, executable_name

        except Exception as e:
            logger.error(f"Failed to build executable: {str(e)}")
            raise

        # finally:
        #     # Clean up temporary files
        #     if paths and paths.temp_dir.exists():
        #         try:
        #             shutil.rmtree(paths.temp_dir)
        #         except Exception as e:
        #             logger.warning(f"Failed to clean up temporary directory: {str(e)}")

    async def _run_build_command(
        self, command: list, cwd: str
    ) -> subprocess.CompletedProcess:
        """Execute the build command and handle errors"""
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=True,
                text=True,
                check=True,
                env={**os.environ, "PYTHONWARNINGS": "ignore::DeprecationWarning"},
            )

            if result.stderr and not result.stderr.strip().endswith(
                "completed successfully."
            ):
                logger.warning(f"Build warnings/errors: {result.stderr}")

            return result

        except subprocess.CalledProcessError as e:
            logger.error(f"PyInstaller build failed: {e.stderr}")
            raise RuntimeError(f"PyInstaller build failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Build process failed: {str(e)}")
            raise RuntimeError(f"Build process failed: {str(e)}")

    @staticmethod
    async def verify_executable(executable_path: Path) -> bool:
        """Verify that the executable was created correctly"""
        try:
            if not executable_path.exists():
                return False

            # Check file size
            if executable_path.stat().st_size == 0:
                return False

            # Check permissions
            if not os.access(executable_path, os.X_OK):
                return False

            return True

        except Exception as e:
            logger.error(f"Failed to verify executable: {str(e)}")
            return False
