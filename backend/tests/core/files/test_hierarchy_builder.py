import pytest
from datetime import datetime
from app.core.files.hierarchy import FileHierarchyBuilder


def test_hierarchy_builder_multiple_scenarios():
    """
    Test FileHierarchyBuilder with multiple scenarios of file metadata
    """
    # Mock file metadata with various scenarios
    mock_files_metadata = [
        # Scenario 1: File with full path segments
        {
            "_id": "67a22ae107d442420678ddf4",
            "user_id": "679dfb9ceba11c8b17d19d05",
            "name": "Local Folder",
            "connector_type": "local_folder",
            "filename": "20220530_2674681_DataScientistEnergyT_Raskoshinskii_V_CV.pdf",
            "extension": "pdf",
            "size": 127711,
            "file_path": "home/documents/cv/20220530_2674681_DataScientistEnergyT_Raskoshinskii_V_CV.pdf",
            "path_segments": ["home", "documents", "cv"],
            "last_indexed": datetime.now().isoformat(),
            "doc_id": "67a22ae107d442420678ddf4_doc1",
            "content_hash": "hash1",
        },
        # Scenario 2: File without path segments, but with file_path
        {
            "_id": "67a22ae107d442420678ddf4",
            "user_id": "679dfb9ceba11c8b17d19d05",
            "name": "Local Folder",
            "connector_type": "local_folder",
            "filename": "project_report.docx",
            "extension": "docx",
            "size": 250000,
            "file_path": "work/projects/project_report.docx",
            "last_indexed": datetime.now().isoformat(),
            "doc_id": "67a22ae107d442420678ddf4_doc2",
            "content_hash": "hash2",
        },
        # Scenario 3: File with minimal metadata
        {
            "_id": "onedrive_connector",
            "user_id": "679dfb9ceba11c8b17d19d05",
            "name": "OneDrive",
            "connector_type": "onedrive",
            "filename": "minimal_file.txt",
            "size": 1024,
        },
    ]

    # Build hierarchy
    hierarchy_response = FileHierarchyBuilder.build_connector_hierarchy(
        mock_files_metadata
    )

    # Assertions
    assert hierarchy_response.total_files == 3
    assert hierarchy_response.total_size == 128735  # 127711 + 250000 + 1024
    assert hierarchy_response.user_id == "679dfb9ceba11c8b17d19d05"

    # Check local folder connector
    local_folder = hierarchy_response.hierarchy["67a22ae107d442420678ddf4"]
    assert local_folder["name"] == "Local Folder"
    assert local_folder["type"] == "local_folder"

    # Check nested file structure
    local_folder_children = local_folder["children"]

    # Check first file with full path segments
    first_file_node = local_folder_children[0][
        "20220530_2674681_DataScientistEnergyT_Raskoshinskii_V_CV.pdf"
    ]
    assert first_file_node["type"] == "file"
    assert first_file_node["extension"] == "pdf"
    assert first_file_node["size"] == 127711
    assert first_file_node["doc_id"] == "67a22ae107d442420678ddf4_doc1"

    # Check second file with file_path
    second_file_node = local_folder_children[1]["project_report.docx"]
    assert second_file_node["type"] == "file"
    assert second_file_node["extension"] == "docx"
    assert second_file_node["size"] == 250000

    # Check OneDrive connector
    onedrive_connector = hierarchy_response.hierarchy["onedrive_connector"]
    assert onedrive_connector["name"] == "OneDrive"
    assert onedrive_connector["type"] == "onedrive"

    # Check minimal file
    minimal_file_node = onedrive_connector["children"][0]["minimal_file.txt"]
    assert minimal_file_node["type"] == "file"
    assert minimal_file_node["size"] == 1024


def test_empty_metadata():
    """
    Test FileHierarchyBuilder with empty metadata
    """
    hierarchy_response = FileHierarchyBuilder.build_connector_hierarchy([])

    assert hierarchy_response.total_files == 0
    assert hierarchy_response.total_size == 0
    assert hierarchy_response.user_id == ""
    assert hierarchy_response.hierarchy == {}
