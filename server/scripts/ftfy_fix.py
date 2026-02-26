#!/usr/bin/env python3
"""
ftfy - Text encoding fixer
Usage: echo '{"text": "âœ\" No problems"}' | python3 ftfy_fix.py
"""

import sys
import json
from ftfy import fix_text


def main():
    try:
        data = json.load(sys.stdin)
        text = data.get('text', '')
        
        # Apply ftfy fixes
        fixed = fix_text(text)
        
        print(json.dumps({'fixed': fixed}), flush=True)
    except Exception as e:
        print(json.dumps({'error': str(e)}), flush=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
