#!/bin/sh

[ -z "$1" ] || [ -z "$2" ] && { echo "Usage: sms_send <number> <text>"; exit 1; }

PORT="/dev/wwan0at1"
LOCKFILE="/var/lock/modem_at.lock"

NUM_HEX=$(echo -n "$1" | hexdump -v -e '/1 "%02X"')
MSG_HEX=$(echo -n "$2" | hexdump -v -e '/1 "%02X"')

NUM_UCS2=$(echo "$NUM_HEX" | awk '
{
    out=""
    for(i=1; i<=length($0); i+=2) {
        out = out "00" substr($0, i, 2)
    }
    print out
}')

MSG_UCS2=$(echo "$MSG_HEX" | awk '
function hex2dec(h) { return index("0123456789ABCDEF", h) - 1; }
{
    out = ""
    i = 1
    len = length($0)
    while (i <= len) {
        b1 = hex2dec(substr($0, i, 1)) * 16 + hex2dec(substr($0, i+1, 1))
        if (b1 < 128) {
            out = out sprintf("%04X", b1)
            i += 2
        } else if (b1 >= 192 && b1 < 224) {
            b2 = hex2dec(substr($0, i+2, 1)) * 16 + hex2dec(substr($0, i+3, 1))
            val = (b1 % 32) * 64 + (b2 % 64)
            out = out sprintf("%04X", val)
            i += 4
        } else if (b1 >= 224 && b1 < 240) {
            b2 = hex2dec(substr($0, i+2, 1)) * 16 + hex2dec(substr($0, i+3, 1))
            b3 = hex2dec(substr($0, i+4, 1)) * 16 + hex2dec(substr($0, i+5, 1))
            val = (b1 % 16) * 4096 + (b2 % 64) * 64 + (b3 % 64)
            out = out sprintf("%04X", val)
            i += 6
        } else {
            i += 8
        }
    }
    print out
}')

(
    flock -x 200
    exec 3> "$PORT"

    printf "AT+CSCS=\"UCS2\"\r" >&3
    sleep 1

    printf "AT+CMGF=1\r" >&3
    sleep 1

    printf "AT+CSMP=17,167,0,8\r" >&3
    sleep 1

    printf "AT+CMGS=\"%s\"\r" "$NUM_UCS2" >&3
    sleep 1

    printf "%s\032" "$MSG_UCS2" >&3
    sleep 5

    printf "AT+CSCS=\"GSM\"\r" >&3
    sleep 1

    exec 3>&-
) 200> "$LOCKFILE"