#!/bin/bash
echo "📍 Estructura del proyecto en: $(pwd)"
echo

find . \
  -path "./node_modules" -prune -o \
  -path "./dist" -prune -o \
  -path "./.git" -prune -o \
  -path "./.next" -prune -o \
  -path "./.cache" -prune -o \
  -type d -print | sed 's;[^/]*/;|__;g;s;__; |;g'

echo
echo "🚫 Carpetas ocultadas automáticamente:"
echo "   node_modules, dist, .git, .next, .cache"
