#!/bin/sh
i=0
while [ $i -lt 30 ]; do
	if mmcli -L 2>/dev/null | grep -q Modem; then
		mmcli -m any --enable >/dev/null 2>&1
		break
	fi
	i=$((i + 1))
	sleep 1
done

if mmcli -m any 2>/dev/null | grep -qE 'sim-missing|sim: none'; then
	exec /opt/simadmin/simadmin serve --host 0.0.0.0 --port 3000
fi

i=0
while [ $i -lt 30 ]; do
	mmcli -m any 2>/dev/null | grep -q 'packet service state: attached' && break
	i=$((i + 1))
	sleep 2
done

sleep 15

exec /opt/simadmin/simadmin serve --host 0.0.0.0 --port 3000
