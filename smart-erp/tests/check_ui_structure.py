"""Guard the existing ERP controls, form order, table headings and behavior files."""

import hashlib
import json
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = Path(__file__).with_name("ui-structure-baseline.json")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Structure(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.sections = []
        self.controls = []
        self.tables = []
        self.table_stack = []
        self.heading = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "section" and attrs.get("id"):
            self.sections.append(attrs["id"])
        if tag in {"input", "select", "textarea", "button"}:
            scope = next((a.get("id") for t, a in reversed(self.stack)
                          if t == "section" and a.get("id")), None)
            form = next((a.get("id") for t, a in reversed(self.stack)
                         if t == "form"), None)
            self.controls.append({
                "tag": tag, "id": attrs.get("id"), "name": attrs.get("name"),
                "type": attrs.get("type"), "tabindex": attrs.get("tabindex"),
                "scope": scope, "form": form,
            })
        if tag == "table":
            self.tables.append({"id": attrs.get("id"), "class": attrs.get("class"),
                                "headers": []})
            self.table_stack.append(len(self.tables) - 1)
        if tag == "th" and self.table_stack:
            self.heading = [self.table_stack[-1], "", attrs.get("colspan", "1")]
        if tag not in VOID:
            self.stack.append((tag, attrs))

    def handle_data(self, data):
        if self.heading is not None:
            self.heading[1] += data

    def handle_endtag(self, tag):
        if tag == "th" and self.heading is not None:
            index, text, colspan = self.heading
            self.tables[index]["headers"].append({
                "text": " ".join(text.split()), "colspan": colspan,
            })
            self.heading = None
        if tag == "table" and self.table_stack:
            self.table_stack.pop()
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break


def snapshot():
    parser = Structure()
    parser.feed((ROOT / "public/index.html").read_text())
    protected = list((ROOT / "public").glob("*.js"))
    protected += [ROOT / "public/styles.css", ROOT / "server.js"]
    return {
        "sections": parser.sections,
        "controls": parser.controls,
        "tables": parser.tables,
        "protected_files": {
            str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(protected) if path.is_file()
        },
    }


current = snapshot()
if "--record" in sys.argv:
    if BASELINE.exists():
        raise SystemExit("Baseline already exists; refusing to overwrite it.")
    BASELINE.write_text(json.dumps(current, indent=2) + "\n")
    print(f"Recorded {BASELINE.name}")
else:
    expected = json.loads(BASELINE.read_text())
    differences = [key for key in expected if expected[key] != current.get(key)]
    if differences:
        raise SystemExit("UI preservation check failed: " + ", ".join(differences))
    print("PASS: section order, control order/attributes, table headers, "
          "module scripts, original layout CSS and server unchanged.")
print(f"{len(current['sections'])} sections; {len(current['controls'])} controls; "
      f"{len(current['tables'])} tables; "
      f"{len(current['protected_files'])} protected behavior/layout files.")
