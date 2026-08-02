from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_release import (
    EXPECTED_DEMO_VIDEO_SHA256,
    INTENTIONAL_TEMPLATE_MARKER,
    NOTEBOOK_PATH,
    PUBLIC_DEMO_VIDEO_URL,
    ValidationError,
    _python_source_without_leading_magic,
    validate_demo_video,
    validate_notebook,
    validate_required_placeholders,
)


class LeadingMagicTests(unittest.TestCase):
    def test_leading_line_magic_is_blanked_before_compilation(self) -> None:
        source, skipped, stripped = _python_source_without_leading_magic(
            '%pip install -q -U "transformers==5.14.1" accelerate librosa soundfile jsonschema\n'
            "value = 7 % 3\n"
        )

        self.assertFalse(skipped)
        self.assertEqual(stripped, 1)
        self.assertTrue(source.startswith("\n"))
        compile(source, "test-cell", "exec")

    def test_nonleading_magic_is_not_silently_removed(self) -> None:
        source, skipped, stripped = _python_source_without_leading_magic(
            "value = 1\n%time value\n"
        )

        self.assertFalse(skipped)
        self.assertEqual(stripped, 0)
        with self.assertRaises(SyntaxError):
            compile(source, "test-cell", "exec")

    def test_leading_cell_magic_is_not_silently_skipped(self) -> None:
        source, skipped, stripped = _python_source_without_leading_magic(
            "%%bash\necho not-python\n"
        )

        self.assertFalse(skipped)
        self.assertEqual(stripped, 0)
        with self.assertRaises(SyntaxError):
            compile(source, "test-cell", "exec")

    def test_arbitrary_leading_line_magic_is_not_silently_removed(self) -> None:
        source, skipped, stripped = _python_source_without_leading_magic(
            "%time value = 1\n"
        )

        self.assertFalse(skipped)
        self.assertEqual(stripped, 0)
        with self.assertRaises(SyntaxError):
            compile(source, "test-cell", "exec")

    def test_arbitrary_pip_install_is_not_silently_removed(self) -> None:
        source, skipped, stripped = _python_source_without_leading_magic(
            "%pip install https://example.invalid/unreviewed.whl\n"
        )

        self.assertFalse(skipped)
        self.assertEqual(stripped, 0)
        with self.assertRaises(SyntaxError):
            compile(source, "test-cell", "exec")


class ReleaseValidationTests(unittest.TestCase):
    def test_current_demo_has_approved_hash_and_public_links(self) -> None:
        message = validate_demo_video()
        self.assertIn(EXPECTED_DEMO_VIDEO_SHA256, message)

    def test_modified_demo_video_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            video = Path(temporary_directory) / "modified.mp4"
            video.write_bytes(b"not the approved ScenePatch video")
            with self.assertRaisesRegex(ValidationError, "hash mismatch"):
                validate_demo_video(video, markdown_paths=[])

    def test_missing_public_demo_link_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            video = directory / "approved.mp4"
            video.write_bytes(b"approved fixture")
            markdown = directory / "release.md"
            markdown.write_text("No release URL yet.\n", encoding="utf-8")
            expected = hashlib.sha256(video.read_bytes()).hexdigest()
            with self.assertRaisesRegex(ValidationError, "URL is missing"):
                validate_demo_video(video, expected, [markdown])

            markdown.write_text(PUBLIC_DEMO_VIDEO_URL + "\n", encoding="utf-8")
            validate_demo_video(video, expected, [markdown])

    def test_current_notebook_has_exact_tool_contract(self) -> None:
        message = validate_notebook()
        self.assertIn("exactly three tool declarations", message)

    def test_unexpected_tool_declaration_fails(self) -> None:
        notebook = json.loads(NOTEBOOK_PATH.read_text(encoding="utf-8"))
        tool_cell = next(
            cell
            for cell in notebook["cells"]
            if cell["cell_type"] == "code"
            and '"name": "record_change"' in "".join(cell["source"])
        )
        source = "".join(tool_cell["source"]).replace(
            '"name": "record_change"', '"name": "delete_file"', 1
        )
        tool_cell["source"] = source.splitlines(keepends=True)

        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "invalid.ipynb"
            path.write_text(json.dumps(notebook), encoding="utf-8")
            with self.assertRaisesRegex(ValidationError, "tool declarations"):
                validate_notebook(path)

    def test_modified_tool_enum_fails(self) -> None:
        notebook = json.loads(NOTEBOOK_PATH.read_text(encoding="utf-8"))
        tool_cell = next(
            cell
            for cell in notebook["cells"]
            if cell["cell_type"] == "code"
            and '"name": "record_change"' in "".join(cell["source"])
        )
        source = "".join(tool_cell["source"]).replace(
            '["intended", "unexplained", "uncertain"]',
            '["intended", "unexplained", "uncertain", "ignored"]',
            1,
        )
        tool_cell["source"] = source.splitlines(keepends=True)

        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "invalid-enum.ipynb"
            path.write_text(json.dumps(notebook), encoding="utf-8")
            with self.assertRaisesRegex(ValidationError, "classification"):
                validate_notebook(path)

    def test_additional_properties_must_be_false(self) -> None:
        notebook = json.loads(NOTEBOOK_PATH.read_text(encoding="utf-8"))
        tool_cell = next(
            cell
            for cell in notebook["cells"]
            if cell["cell_type"] == "code"
            and '"name": "record_change"' in "".join(cell["source"])
        )
        source = "".join(tool_cell["source"]).replace(
            '"additionalProperties": False', '"additionalProperties": True', 1
        )
        tool_cell["source"] = source.splitlines(keepends=True)

        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "invalid-extra-properties.ipynb"
            path.write_text(json.dumps(notebook), encoding="utf-8")
            with self.assertRaisesRegex(ValidationError, "additionalProperties false"):
                validate_notebook(path)

    def test_template_exemption_must_be_on_placeholder_line(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            allowed = Path(temporary_directory) / "allowed.md"
            allowed.write_text(
                f"Value: [REQUIRED] {INTENTIONAL_TEMPLATE_MARKER}\n",
                encoding="utf-8",
            )
            validate_required_placeholders([allowed])

            blocked = Path(temporary_directory) / "blocked.md"
            blocked.write_text(
                f"Value: [REQUIRED]\n{INTENTIONAL_TEMPLATE_MARKER}\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValidationError, "Unresolved"):
                validate_required_placeholders([blocked])


if __name__ == "__main__":
    unittest.main()
