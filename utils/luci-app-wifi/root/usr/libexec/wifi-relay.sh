#!/bin/sh

STA_SEC="wifi_relay_sta"
STA_NET="wwan"
SCAN_FILE="/tmp/wifi-relay-scan.json"
SELF="/usr/libexec/wifi-relay.sh"

json_esc() {
	printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

fw_attach_wwan() {
	local net="$1" z zn n has found=0

	[ -n "$net" ] || return 1
	[ -f /etc/config/firewall ] || return 0

	for z in $(uci show firewall 2>/dev/null | sed -n 's/^firewall\.\([^=]*\)=zone$/\1/p'); do
		zn="$(uci -q get "firewall.$z.name" 2>/dev/null | sed "s/['\"]//g")"
		[ "$zn" = "wan" ] || continue
		found=1
		has=0
		for n in $(uci -q get "firewall.$z.network" 2>/dev/null | sed "s/['\"]//g"); do
			[ "$n" = "$net" ] && has=1
		done
		[ "$has" = 1 ] || uci add_list "firewall.$z.network=$net"
	done

	if [ "$found" = 0 ]; then
		for z in $(uci show firewall 2>/dev/null | sed -n 's/^firewall\.\([^=]*\)=zone$/\1/p'); do
			[ "$(uci -q get "firewall.$z.masq" 2>/dev/null | sed "s/['\"]//g")" = "1" ] || continue
			found=1
			has=0
			for n in $(uci -q get "firewall.$z.network" 2>/dev/null | sed "s/['\"]//g"); do
				[ "$n" = "$net" ] && has=1
			done
			[ "$has" = 1 ] || uci add_list "firewall.$z.network=$net"
			break
		done
	fi

	if [ "$found" = 0 ]; then
		uci set firewall.wifi_relay_wan=zone
		uci set firewall.wifi_relay_wan.name=wan
		uci set firewall.wifi_relay_wan.input=REJECT
		uci set firewall.wifi_relay_wan.output=ACCEPT
		uci set firewall.wifi_relay_wan.forward=REJECT
		uci set firewall.wifi_relay_wan.masq=1
		uci set firewall.wifi_relay_wan.mtu_fix=1
		uci add_list firewall.wifi_relay_wan.network=wan
		uci add_list firewall.wifi_relay_wan.network="$net"
		uci set firewall.wifi_relay_fwd=forwarding
		uci set firewall.wifi_relay_fwd.src=lan
		uci set firewall.wifi_relay_fwd.dest=wan
	fi

	uci commit firewall
	return 0
}

ap_iface() {
	iw dev 2>/dev/null | awk '/Interface/{i=$2} /type AP/{print i; exit}'
}

ap_channel() {
	local ap="${1:-$(ap_iface)}"
	[ -n "$ap" ] || return 1
	iwinfo "$ap" info 2>/dev/null | sed -n 's/.*Channel:[ ]*\([0-9]\{1,\}\).*/\1/p' | head -1
}

ap_radio() {
	local s m d
	for s in $(uci show wireless 2>/dev/null | sed -n 's/^\(wireless\.[^.]*\)\.mode=.*/\1/p' | sort -u); do
		m="$(uci -q get "$s.mode" | sed "s/['\"]//g")"
		[ "$m" = "ap" ] || continue
		d="$(uci -q get "$s.device" | sed "s/['\"]//g")"
		[ -n "$d" ] && { printf '%s' "$d"; return; }
	done
	printf 'radio0'
}

sta_ifname() {
	local n
	n="$(ubus call network.wireless status 2>/dev/null | jsonfilter -e '@.*.interfaces[@.config.mode="sta"].ifname' 2>/dev/null | head -1)"
	[ -n "$n" ] || n="$(iw dev 2>/dev/null | awk '/Interface/{i=$2} /type managed/{print i; exit}')"
	printf '%s' "$n"
}

scan_write() {
	local ap
	ap="$(ap_iface)"
	if [ -z "$ap" ]; then
		printf '[]' > "$SCAN_FILE"
		return 1
	fi
	{
		printf '['
		iwinfo "$ap" scan 2>/dev/null | awk '
			function esc(s) { gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s); return s }
			function emit() {
				if (bssid == "" || ssid == "") return
				if (n++) printf ","
				printf "{\"ssid\":\"%s\",\"bssid\":\"%s\",\"channel\":%d,\"signal\":%d,\"enc\":\"%s\"}", esc(ssid), bssid, chan + 0, sig + 0, esc(enc)
			}
			/Cell/ && /Address:/ {
				emit()
				bssid = ""; ssid = ""; chan = 0; sig = 0; enc = ""
				for (i = 1; i <= NF; i++) {
					if ($i == "Address:") { bssid = $(i + 1); break }
					if ($i ~ /^Address:.+/) { bssid = substr($i, 9); break }
				}
			}
			/ESSID:/ {
				s = $0
				if (match(s, /ESSID:[ ]*"/)) {
					sub(/^.*ESSID:[ ]*"/, "", s)
					sub(/".*$/, "", s)
					ssid = s
				}
				else {
					ssid = ""
				}
			}
			/Channel:/ {
				if (match($0, /Channel:[ ]*[0-9]+/)) {
					s = substr($0, RSTART, RLENGTH)
					sub(/Channel:[ ]*/, "", s)
					chan = s + 0
				}
			}
			/Signal/ {
				if (match($0, /-?[0-9]+[ ]*dBm/)) {
					s = substr($0, RSTART, RLENGTH)
					sub(/[ ]*dBm/, "", s)
					sig = s + 0
				}
			}
			/Encryption:/ {
				s = $0
				sub(/^.*Encryption:[ ]*/, "", s)
				sub(/[ \t]+$/, "", s)
				enc = s
			}
			END { emit() }
		'
		printf ']'
	} > "$SCAN_FILE"
}

do_scan() {
	scan_write
	echo "OK"
}

do_status() {
	local up="false" addr="" ssid="" st ifn raw sig ap ap_ssid ch dis linked="false"

	st="$(ubus call "network.interface.$STA_NET" status 2>/dev/null)"
	if [ -n "$st" ]; then
		[ "$(printf '%s' "$st" | jsonfilter -e '@.up' 2>/dev/null)" = "true" ] && up="true"
		addr="$(printf '%s' "$st" | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)"
	fi

	ssid="$(uci -q get "wireless.$STA_SEC.ssid")"
	dis="$(uci -q get "wireless.$STA_SEC.disabled")"
	ifn="$(sta_ifname)"

	if [ -n "$ifn" ]; then
		raw="$(ubus call iwinfo info "{\"device\":\"$ifn\"}" 2>/dev/null | jsonfilter -e '@.signal' 2>/dev/null)"
		case "$raw" in
			''|*[!0-9-]*) ;;
			*)
				if [ "$raw" -lt 0 ] && [ "$raw" -ge -120 ]; then
					sig="$raw"
					linked="true"
				fi
				;;
		esac
	fi

	ap="$(ap_iface)"
	ap_ssid=""
	[ -n "$ap" ] && ap_ssid="$(iwinfo "$ap" info 2>/dev/null | sed -n 's/.*ESSID: "\(.*\)"/\1/p' | head -1)"
	ch=""
	[ -n "$ap" ] && ch="$(ap_channel "$ap")"

	printf '{"up":%s,"linked":%s,"address":"%s","ssid":"%s","ap":"%s","ap_ssid":"%s","ap_channel":"%s","iface":"%s","signal":"%s","disabled":"%s"}\n' \
		"$up" "$linked" "$(json_esc "$addr")" "$(json_esc "$ssid")" \
		"$(json_esc "$ap")" "$(json_esc "$ap_ssid")" "$(json_esc "$ch")" \
		"$(json_esc "$ifn")" "$(json_esc "$sig")" "$(json_esc "$dis")"
}

do_configure() {
	local ssid="$1" enc="$2" key="$3" bssid="$4" delay="${5:-0}" s
	[ -n "$ssid" ] || { echo "ERR empty-ssid"; return 1; }
	case "$delay" in ''|*[!0-9]*) delay=0 ;; esac

	if ! uci -q get "wireless.$STA_SEC" >/dev/null 2>&1; then
		uci set "wireless.$STA_SEC=wifi-iface"
		uci set "wireless.$STA_SEC.mode=sta"
		uci set "wireless.$STA_SEC.network=$STA_NET"
	fi
	uci set "wireless.$STA_SEC.device=$(ap_radio)"

	uci set "wireless.$STA_SEC.ssid=$ssid"
	uci set "wireless.$STA_SEC.encryption=$enc"
	case "$enc" in
		none)
			uci -q delete "wireless.$STA_SEC.key"
			uci -q delete "wireless.$STA_SEC.key1"
			;;
		wep)
			uci set "wireless.$STA_SEC.key=1"
			uci set "wireless.$STA_SEC.key1=$key"
			;;
		*)
			uci set "wireless.$STA_SEC.key=$key"
			uci -q delete "wireless.$STA_SEC.key1"
			;;
	esac

	if [ -n "$bssid" ]; then
		uci set "wireless.$STA_SEC.bssid=$bssid"
	else
		uci -q delete "wireless.$STA_SEC.bssid"
	fi
	uci set "wireless.$STA_SEC.disabled=0"

	if ! uci -q get "network.$STA_NET" >/dev/null 2>&1; then
		uci set "network.$STA_NET=interface"
		uci set "network.$STA_NET.proto=dhcp"
	fi

	fw_attach_wwan "$STA_NET"

	for s in $(uci show wireless 2>/dev/null | sed -n "s/^wireless\.\([^.]*\)\.mode=.*/\1/p"); do
		[ "$s" = "$STA_SEC" ] && continue
		[ "$(uci -q get "wireless.$s.mode" | sed "s/['\"]//g")" = "sta" ] || continue
		[ "$(uci -q get "wireless.$s.network" | sed "s/['\"]//g")" = "$STA_NET" ] || continue
		uci -q delete "wireless.$s"
	done

	[ "$delay" -gt 0 ] 2>/dev/null && sleep "$delay"
	uci commit wireless
	uci commit network
	sync

	logger -t wifi-relay "configured $ssid, reboot in 5s"
	if command -v setsid >/dev/null 2>&1; then
		setsid sh -c "sleep 5; reboot" </dev/null >/dev/null 2>&1 &
	else
		sh -c "sleep 5; reboot" </dev/null >/dev/null 2>&1 &
	fi
	echo "OK $ssid reboot"
}

do_disconnect() {
	if ! uci -q get "wireless.$STA_SEC" >/dev/null 2>&1; then
		echo "NOSTA"
		return 0
	fi
	uci set "wireless.$STA_SEC.disabled=1"
	uci commit wireless
	wifi reload >/dev/null 2>&1
	ubus call network reload
	logger -t wifi-relay "STA disabled and reloaded"
	echo "OK"
}

case "$1" in
	scan)        do_scan ;;
	status)      do_status ;;
	configure)   shift; do_configure "$@" ;;
	disconnect)  do_disconnect ;;
	fwsetup)     fw_attach_wwan "$STA_NET" && echo "OK" ;;
	*)           echo "usage: $0 {scan|status|configure|disconnect|fwsetup}"; exit 1 ;;
esac
