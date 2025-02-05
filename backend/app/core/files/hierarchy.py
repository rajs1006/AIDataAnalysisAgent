from typing import Dict, List, Optional, Union
from datetime import datetime
from app.models.schema.base.hierarchy import FileNode, FileHierarchyResponse
from app.models.database.connectors.connector import Connectors
from enum import Enum


class FileHierarchyBuilder:
    """Utility class for building file hierarchies."""

    @staticmethod
    def build_connector_hierarchy(
        connectors: List[Connectors],
    ) -> FileHierarchyResponse:
        """
        Build a hierarchical representation of files from multiple connectors.

        Args:
            connectors: List of Connector objects

        Returns:
            FileHierarchyResponse: Hierarchical file structure
        """
        # Initialize aggregation variables
        total_files = 0
        total_size = 0
        user_id = "unknown"
        connector_hierarchy = []

        # Process each connector
        for connector in connectors:
            # Normalize connector to dictionary if it's an object
            if hasattr(connector, "__dict__"):
                connector_data = connector.__dict__
            else:
                connector_data = connector

            # Extract key information
            connector_id = str(
                connector_data.get("id", connector_data.get("_id", "unknown"))
            )
            user_id = str(connector_data.get("user_id", user_id))
            connector_name = connector_data.get("name", "vdf")
            connector_type = connector_data.get("connector_type", "local_folder")

            # Get files (handle different possible structures)
            files = connector_data.get("files", [])
            if hasattr(files, "__iter__") and not isinstance(files, dict):
                files = list(files)

            # Normalize file metadata
            normalized_files = []
            for file_meta in files:
                if hasattr(file_meta, "__dict__"):
                    file_meta = file_meta.__dict__
                normalized_files.append(file_meta)

            # Update total files and size
            total_files += len(normalized_files)
            total_size += sum(file.get("size", 0) for file in normalized_files)

            # Create connector hierarchy entry
            connector_entry = {
                connector_type: {
                    "name": connector_name,
                    "id": connector_id,
                    "children": [],
                }
            }

            # Build file hierarchy
            home_folder = {"name": "home", "type": "folder", "children": []}
            connector_entry[connector_type]["children"].append(home_folder)

            # Process files for this connector
            for file_meta in normalized_files:
                filename = file_meta.get("filename", "unnamed")
                file_path = file_meta.get("file_path", filename)

                # Add file to the home folder
                file_node = {
                    "name": filename,
                    "type": "file",
                    "extension": file_meta.get(
                        "extension", filename.split(".")[-1] if "." in filename else ""
                    ),
                    "last_indexed": (
                        file_meta.get("last_indexed", datetime.now())
                    ).isoformat(),
                    "doc_id": file_meta.get("doc_id", "<doc_id>"),
                    "size": file_meta.get("size", 0),
                    "path": file_path,
                    "content_hash": file_meta.get("content_hash"),
                }
                home_folder.setdefault("children", []).append(file_node)

            connector_hierarchy.append(connector_entry)

        return FileHierarchyResponse(
            hierarchy=connector_hierarchy,
            total_files=total_files,
            total_size=total_size,
            user_id=user_id,
        )

    @staticmethod
    def get_file_path_segments(file_path: str) -> List[str]:
        """
        Split file path into segments.

        Args:
            file_path (str): Full file path

        Returns:
            List[str]: Path segments
        """
        # Remove leading/trailing slashes and split
        clean_path = file_path.strip("/").split("/")
        return [seg for seg in clean_path if seg]
