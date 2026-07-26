# Local developer commands only — Render does not use this file.
ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
PYTHON := $(shell if [ -x "$(ROOT).venv/bin/python" ]; then echo "$(ROOT).venv/bin/python"; else echo python3; fi)

.PHONY: test test-backend install-dev

install-dev:
	$(PYTHON) -m pip install -r backend/requirements-dev.txt

test: test-backend

test-backend:
	cd backend && $(PYTHON) -m pytest
