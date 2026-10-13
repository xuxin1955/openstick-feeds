#!/bin/sh
ROLE_PATH="/sys/class/udc/ci_hdrc.0/device/driver/ci_hdrc.0/role"
MODE="$(uci get gc.config.mode 2>/dev/null)"

if grep -q gadget "$ROLE_PATH" && [ "$MODE" = "gadget" ]; then
	/etc/init.d/gc restart
fi
