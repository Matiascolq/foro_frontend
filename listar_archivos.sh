#!/bin/bash
echo "📍 Contenido visible del proyecto (sin node_modules, dist, .git)"
echo
find . \
  -path "./node_modules" -prune -o \
  -path "./dist" -prune -o \
  -path "./.git" -prune -o \
  -type f -print | sed 's;[^/]*/;|__;g;s;__; |;g'
