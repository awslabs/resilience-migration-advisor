#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
# Build a single self-contained HTML file from index.html + styles.css + scripts.js
# Output: rma-advisor.html
set -e

OUTPUT="rma-advisor.html"
echo "Building single-file distribution: $OUTPUT"

# Use Python for reliable text manipulation (available on macOS)
python3 -c "
import sys

with open('index.html', 'r') as f:
    html = f.read()

with open('styles.css', 'r') as f:
    css = f.read()

with open('scripts.js', 'r') as f:
    js = f.read()

# Replace external stylesheet with inline style
html = html.replace(
    '<link rel=\"stylesheet\" href=\"styles.css\">',
    '<style>\n' + css + '\n</style>'
)

# Replace external script with inline script
html = html.replace(
    '<script defer src=\"scripts.js\"></script>',
    '<script>\n' + js + '\n</script>'
)

with open('$OUTPUT', 'w') as f:
    f.write(html)

print(f'Done! {len(html):,} bytes written to $OUTPUT')
"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "$OUTPUT: $LINES lines — open in any browser, no server needed."
