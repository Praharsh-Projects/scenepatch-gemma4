#!/usr/bin/env python3
"""Deterministic, execution-free checks for ScenePatch release evidence."""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOK_PATH = REPOSITORY_ROOT / "notebooks" / "scenepatch_gemma4.ipynb"
EXPECTED_TOOL_NAMES = {"record_change", "commit_patch", "block_commit"}
EXPECTED_TOOL_ARGUMENTS = {
    "record_change": {
        "description": {"type": "string"},
        "classification": {
            "type": "string",
            "enum": ["intended", "unexplained", "uncertain"],
        },
    },
    "commit_patch": {"summary": {"type": "string"}},
    "block_commit": {"reason": {"type": "string"}},
}
REQUIRED_PLACEHOLDER = re.compile(r"\[REQUIRED(?:[^\]\r\n]*)\]", re.IGNORECASE)
INTENTIONAL_TEMPLATE_MARKER = (
    "<!-- scenepatch-release-check: intentional-template-placeholder -->"
)
MAGIC_LINE = re.compile(r"^\s*%%?[A-Za-z][A-Za-z0-9_-]*(?:\s.*)?$")
ALLOWED_LEADING_MAGICS = {
    '%pip install -q -U "transformers==5.14.1" accelerate librosa soundfile jsonschema'
}


class ValidationError(RuntimeError):
    """A deterministic release validation failure."""


def _cell_source(cell: dict[str, Any], cell_index: int) -> str:
    source = cell.get("source", "")
    if isinstance(source, str):
        return source
    if isinstance(source, list) and all(isinstance(line, str) for line in source):
        return "".join(source)
    raise ValidationError(
        f"Notebook cell {cell_index} source must be a string or a list of strings."
    )


def _python_source_without_leading_magic(source: str) -> tuple[str, bool, int]:
    """Blank only the release notebook's exact dependency-install magic.

    Keeping blank replacement lines preserves useful SyntaxError line numbers. A
    cell magic, another pip command, or any percent sign elsewhere remains Python
    input and therefore cannot be silently hidden from compilation.
    """

    lines = source.splitlines(keepends=True)
    first_content = next(
        (index for index, line in enumerate(lines) if line.strip()),
        len(lines),
    )
    if first_content == len(lines):
        return source, False, 0

    first_line = lines[first_content].rstrip("\r\n")
    if not MAGIC_LINE.fullmatch(first_line):
        return source, False, 0
    if first_line.lstrip().startswith("%%"):
        return source, False, 0

    if first_line.strip() not in ALLOWED_LEADING_MAGICS:
        return source, False, 0

    index = first_content
    stripped_line_magics = 0
    while index < len(lines):
        candidate = lines[index].rstrip("\r\n")
        if candidate.strip() not in ALLOWED_LEADING_MAGICS:
            break
        newline = "\n" if lines[index].endswith("\n") else ""
        lines[index] = newline
        stripped_line_magics += 1
        index += 1
    return "".join(lines), False, stripped_line_magics


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPOSITORY_ROOT))
    except ValueError:
        return str(path)


def _validate_tool_parameters(name: str, parameters: Any, entry_index: int) -> None:
    if not isinstance(parameters, dict):
        raise ValidationError(f"TOOLS entry {entry_index} parameters must be an object.")
    if set(parameters) != {"type", "properties", "required", "additionalProperties"}:
        raise ValidationError(
            f"{name} parameters must contain only type, properties, required, and additionalProperties."
        )
    if parameters["type"] != "object" or parameters["additionalProperties"] is not False:
        raise ValidationError(
            f"{name} parameters must be an object with additionalProperties false."
        )

    expected_properties = EXPECTED_TOOL_ARGUMENTS[name]
    properties = parameters["properties"]
    if not isinstance(properties, dict) or set(properties) != set(expected_properties):
        raise ValidationError(
            f"{name} properties must be exactly: {', '.join(sorted(expected_properties))}."
        )
    required = parameters["required"]
    if (
        not isinstance(required, list)
        or len(required) != len(set(required))
        or set(required) != set(expected_properties)
    ):
        raise ValidationError(
            f"{name} required arguments must exactly match its properties."
        )

    for property_name, expected in expected_properties.items():
        declaration = properties[property_name]
        if not isinstance(declaration, dict):
            raise ValidationError(f"{name}.{property_name} must be an object schema.")
        if not set(declaration).issubset({"type", "enum", "description"}):
            raise ValidationError(f"{name}.{property_name} contains an unsupported schema key.")
        for key, expected_value in expected.items():
            if declaration.get(key) != expected_value:
                raise ValidationError(
                    f"{name}.{property_name} must declare {key} as {expected_value!r}."
                )
        if "enum" not in expected and "enum" in declaration:
            raise ValidationError(f"{name}.{property_name} must not declare an enum.")
        if "description" in declaration and not isinstance(declaration["description"], str):
            raise ValidationError(f"{name}.{property_name} description must be a string.")


def _literal_assignment(
    trees: list[tuple[int, ast.Module]], assignment_name: str
) -> Any:
    matches: list[tuple[int, ast.AST]] = []
    for cell_index, tree in trees:
        for node in tree.body:
            if not isinstance(node, (ast.Assign, ast.AnnAssign)):
                continue
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if any(
                isinstance(target, ast.Name) and target.id == assignment_name
                for target in targets
            ):
                matches.append((cell_index, node.value))

    if len(matches) != 1:
        raise ValidationError(
            f"Expected exactly one {assignment_name} assignment; found {len(matches)}."
        )
    cell_index, value = matches[0]
    try:
        return ast.literal_eval(value)
    except (TypeError, ValueError) as error:
        raise ValidationError(
            f"{assignment_name} in notebook cell {cell_index} must be a literal."
        ) from error


def validate_notebook(path: Path = NOTEBOOK_PATH) -> str:
    try:
        notebook = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ValidationError(f"Notebook is missing: {path}") from error
    except json.JSONDecodeError as error:
        raise ValidationError(
            f"Notebook is not valid JSON at line {error.lineno}, column {error.colno}."
        ) from error

    if not isinstance(notebook, dict) or notebook.get("nbformat") != 4:
        raise ValidationError("Notebook must be a Jupyter nbformat 4 JSON object.")
    cells = notebook.get("cells")
    if not isinstance(cells, list):
        raise ValidationError("Notebook cells must be a list.")

    parsed_trees: list[tuple[int, ast.Module]] = []
    code_cell_count = 0
    skipped_cell_magics = 0
    stripped_line_magics = 0
    for cell_index, cell in enumerate(cells):
        if not isinstance(cell, dict):
            raise ValidationError(f"Notebook cell {cell_index} must be an object.")
        if cell.get("cell_type") != "code":
            continue
        code_cell_count += 1
        source = _cell_source(cell, cell_index)
        python_source, skipped, stripped = _python_source_without_leading_magic(source)
        stripped_line_magics += stripped
        if skipped:
            skipped_cell_magics += 1
            continue
        filename = f"{_display_path(path)}:cell-{cell_index}"
        try:
            tree = compile(
                python_source,
                filename,
                "exec",
                flags=ast.PyCF_ONLY_AST,
                dont_inherit=True,
            )
        except SyntaxError as error:
            raise ValidationError(
                f"Python compilation failed in cell {cell_index}, line "
                f"{error.lineno}: {error.msg}."
            ) from error
        parsed_trees.append((cell_index, tree))

    tools = _literal_assignment(parsed_trees, "TOOLS")
    if not isinstance(tools, list) or len(tools) != 3:
        raise ValidationError("TOOLS must declare exactly three functions.")

    declared_names: list[str] = []
    for index, declaration in enumerate(tools):
        if not isinstance(declaration, dict) or declaration.get("type") != "function":
            raise ValidationError(f"TOOLS entry {index} must be a function declaration.")
        if set(declaration) != {"type", "function"}:
            raise ValidationError(f"TOOLS entry {index} contains an unsupported declaration key.")
        function = declaration.get("function")
        if not isinstance(function, dict) or not isinstance(function.get("name"), str):
            raise ValidationError(f"TOOLS entry {index} is missing a literal function name.")
        if set(function) != {"name", "description", "parameters"}:
            raise ValidationError(f"TOOLS entry {index} must contain name, description, and parameters.")
        if not isinstance(function["description"], str) or not function["description"].strip():
            raise ValidationError(f"TOOLS entry {index} description must be a non-empty string.")
        declared_names.append(function["name"])

    if len(set(declared_names)) != 3 or set(declared_names) != EXPECTED_TOOL_NAMES:
        raise ValidationError(
            "Notebook tool declarations must be exactly: "
            + ", ".join(sorted(EXPECTED_TOOL_NAMES))
            + f"; found {declared_names}."
        )

    for index, declaration in enumerate(tools):
        function = declaration["function"]
        _validate_tool_parameters(function["name"], function["parameters"], index)

    allowed_names = _literal_assignment(parsed_trees, "ALLOWED_NAMES")
    if not isinstance(allowed_names, set) or allowed_names != EXPECTED_TOOL_NAMES:
        raise ValidationError(
            "ALLOWED_NAMES must exactly match the three declared ScenePatch tools."
        )

    return (
        f"Validated nbformat 4 JSON, compiled {len(parsed_trees)}/{code_cell_count} "
        f"Python code cells after excluding {stripped_line_magics} leading line "
        f"magic(s) ({skipped_cell_magics} cell-magic skips), and verified exactly "
        f"three tool declarations with their exact argument schemas in {_display_path(path)}."
    )


def final_facing_markdown_paths() -> list[Path]:
    return [
        REPOSITORY_ROOT / "README.md",
        *sorted((REPOSITORY_ROOT / "docs").glob("*.md")),
        REPOSITORY_ROOT / "fixtures" / "README.md",
    ]


def validate_required_placeholders(paths: list[Path] | None = None) -> str:
    candidates = paths if paths is not None else final_facing_markdown_paths()
    unresolved: list[str] = []
    for path in candidates:
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except FileNotFoundError as error:
            raise ValidationError(f"Expected final-facing file is missing: {path}") from error
        for line_number, line in enumerate(lines, start=1):
            matches = list(REQUIRED_PLACEHOLDER.finditer(line))
            if not matches or INTENTIONAL_TEMPLATE_MARKER in line:
                continue
            relative_path = _display_path(path)
            for match in matches:
                unresolved.append(f"{relative_path}:{line_number}: {match.group(0)}")

    if unresolved:
        details = "\n".join(f"  - {item}" for item in unresolved)
        raise ValidationError(
            "Unresolved release placeholders remain in final-facing files:\n"
            f"{details}\n"
            "Only a deliberately reusable template placeholder may be exempted, "
            f"and it must carry this marker on the same line: {INTENTIONAL_TEMPLATE_MARKER}"
        )
    return f"Verified {len(candidates)} final-facing Markdown files have no unresolved [REQUIRED] placeholders."


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "check",
        choices=("all", "notebook", "placeholders"),
        nargs="?",
        default="all",
    )
    arguments = parser.parse_args()

    try:
        if arguments.check in {"all", "notebook"}:
            print(validate_notebook(), flush=True)
        if arguments.check in {"all", "placeholders"}:
            print(validate_required_placeholders(), flush=True)
    except ValidationError as error:
        print(f"Release validation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
