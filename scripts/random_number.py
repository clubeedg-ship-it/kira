#!/usr/bin/env python3
"""Generate random numbers with optional range."""

import random
import sys

def main():
    args = sys.argv[1:]
    
    # Default range
    min_val = 1
    max_val = 100
    
    if len(args) >= 1:
        try:
            max_val = int(args[0])
        except ValueError:
            pass
    
    if len(args) >= 2:
        try:
            min_val = int(args[0])
            max_val = int(args[1])
        except ValueError:
            pass
    
    # Ensure min <= max
    if min_val > max_val:
        min_val, max_val = max_val, min_val
    
    result = random.randint(min_val, max_val)
    print(f"🎲 **{result}**")
    print(f"_(range: {min_val} – {max_val})_")

if __name__ == "__main__":
    main()
