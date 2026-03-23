#!/bin/bash
npx vitest --run > test_output.txt 2>&1
echo "EXIT=$?" >> test_output.txt
