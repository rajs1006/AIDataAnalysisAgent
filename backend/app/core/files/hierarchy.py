from typing import Dict, List, Optional, Union
from datetime import datetime
from app.models.schema.base.hierarchy import FileNode, FileHierarchyResponse
from app.models.database.connectors.connector import Connector, FileDocument
from enum import Enum


class FileHierarchyBuilder:
    """Utility class for building file hierarchies."""

    @staticmethod
    def build_connector_hierarchy(
        connectors: List[Connector], shared_files: List[FileDocument]
    ) -> FileHierarchyResponse:
        """
        Build a hierarchical representation of files from multiple connectors and shared files.

        Args:
            connectors: List of Connector objects
            shared_files: List of FileDocument objects that are shared

        Returns:
            FileHierarchyResponse: Hierarchical file structure
        """
        # Initialize aggregation variables
        total_files = 0
        total_size = 0
        user_id = "unknown"
        connector_hierarchy = []

        # Create a base connector entry for shared files
        shared_connector = {
            "shared_folder": {
                "name": "shared with me",
                "id": "shared",
                "type": "folder",
                "children": [],
            }
        }

        # Process shared files
        for shared_file in shared_files:
            # Normalize shared file metadata
            if hasattr(shared_file, "__dict__"):
                file_meta = shared_file.__dict__
            else:
                file_meta = shared_file

            # Create file node for shared file with complete metadata
            filename = file_meta.get("filename", "unnamed")
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
                "path": f"shared with me/{filename}",
                "content_hash": file_meta.get("content_hash"),
                # Adding additional FileDocument fields
                "created_at": file_meta.get("created_at", datetime.now()).isoformat(),
                "last_modified": file_meta.get(
                    "last_modified", datetime.now()
                ).isoformat(),
                "summary": file_meta.get("summary"),
                "status": file_meta.get("status"),
                "vector_ids": file_meta.get("vector_ids"),
                "error_message": file_meta.get("error_message"),
                "total_chunks": file_meta.get("total_chunks"),
                "blob_file_id": file_meta.get("blob_file_id"),
                "blob_content_type": file_meta.get("blob_content_type"),
                "blob_size": file_meta.get("blob_size"),
                "blob_filename": file_meta.get("blob_filename"),
                "blob_gcs_bucket": file_meta.get("blob_gcs_bucket"),
                "blob_gcs_path": file_meta.get("blob_gcs_path"),
                "ai_metadata": file_meta.get("ai_metadata"),
            }

            # Update totals
            total_files += 1
            total_size += file_meta.get("size", 0)

            # Add to shared folder
            shared_connector["shared_folder"]["children"].append(file_node)

        # Add shared connector to hierarchy if there are shared files
        if shared_files:
            connector_hierarchy.append(shared_connector)

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
            connector_name = connector_data.get("name", "Local")
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

            # Create folders dict to track existing folders
            folders = {}

            # Process files for this connector
            for file_meta in normalized_files:
                filename = file_meta.get("filename", "unnamed")
                file_path = file_meta.get("file_path", filename)

                # Get path segments
                path_segments = FileHierarchyBuilder.get_file_path_segments(file_path)

                # If path starts with home or has multiple segments, create folder structure
                current_level = connector_entry[connector_type]["children"]

                for i, segment in enumerate(
                    path_segments[:-1]
                ):  # Skip the last segment (filename)
                    # Look for existing folder at current level
                    folder = next(
                        (f for f in current_level if f["name"] == segment), None
                    )

                    if not folder:
                        # Create new folder
                        folder = {"name": segment, "type": "folder", "children": []}
                        current_level.append(folder)

                    current_level = folder["children"]

                # Create file node with complete metadata
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
                    # Adding additional FileDocument fields
                    "created_at": file_meta.get(
                        "created_at", datetime.now()
                    ).isoformat(),
                    "last_modified": file_meta.get(
                        "last_modified", datetime.now()
                    ).isoformat(),
                    "summary": file_meta.get("summary"),
                    "status": file_meta.get("status"),
                    "vector_ids": file_meta.get("vector_ids"),
                    "error_message": file_meta.get("error_message"),
                    "total_chunks": file_meta.get("total_chunks"),
                    "blob_file_id": file_meta.get("blob_file_id"),
                    "blob_content_type": file_meta.get("blob_content_type"),
                    "blob_size": file_meta.get("blob_size"),
                    "blob_filename": file_meta.get("blob_filename"),
                    "blob_gcs_bucket": file_meta.get("blob_gcs_bucket"),
                    "blob_gcs_path": file_meta.get("blob_gcs_path"),
                    "ai_metadata": file_meta.get("ai_metadata"),
                }

                # Add file to current level
                current_level.append(file_node)

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
