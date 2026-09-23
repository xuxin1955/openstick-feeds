#!/bin/sh
. /lib/functions.sh
. /usr/share/libubox/jshn.sh

case "$1" in
    list)
        echo '{ "exec": { "cmd": "string" } }'
        ;;
    call)
        case "$2" in
            exec)
                read -r input
                json_load "$input"
                json_get_var command cmd
                [ -z "$command" ] && { echo '{"error": "Empty command"}'; exit 1; }

                PORT="/dev/wwan0at1"
                LOCKFILE="/var/lock/modem_at.lock"
                OUTFILE="/tmp/modem_at.out"

                > "$OUTFILE"

                (
                    flock -x 200
                    cat "$PORT" > "$OUTFILE" &
                    CAT_PID=$!
                    sleep 0.2

                    echo -e "${command}\r" > "$PORT"

                    for i in $(seq 1 50); do
                        if grep -q -E "OK|ERROR" "$OUTFILE"; then
                            break
                        fi
                        sleep 0.1
                    done

                    kill $CAT_PID 2>/dev/null || true
                ) 200> "$LOCKFILE"

                result=$(cat "$OUTFILE" | tr -d '\r')

                json_init
                json_add_string "response" "$result"
                json_dump
                ;;
        esac
        ;;
esac