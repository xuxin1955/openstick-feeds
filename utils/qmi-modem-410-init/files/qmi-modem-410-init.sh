#!/bin/sh
# QMI Modem Initialization Script

MODEL_FILE="/sys/firmware/devicetree/base/model"
LOG_FILE="/var/log/qmi-modem-init.log"
MAX_RETRIES=10
RETRY_DELAY=5
DEVICE_PATH="qcom-soc"

# inhibit 保持时间
INHIBIT_TIMEOUT="0.6"

# mmcli inhibit 退出等待参数
INHIBIT_EXIT_RETRIES=10
INHIBIT_EXIT_INTERVAL="0.1"
INHIBIT_SIGNAL_ATTEMPTS=3

# 全局 inhibit PID，用于 trap 清理
INHIBIT_PID=""

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_file_content() {
    file="$1"

    [ -s "$file" ] || return 0

    while IFS= read -r line || [ -n "$line" ]; do
        log "$line"
    done < "$file"
}

safe_sleep() {
    duration="$1"

    # 优先尝试系统 sleep。
    # 部分 BusyBox sleep 支持小数，部分不支持。
    if sleep "$duration" 2>/dev/null; then
        return 0
    fi

    # OpenWrt/BusyBox 常见 usleep，单位是微秒。
    if command -v usleep >/dev/null 2>&1; then
        if command -v awk >/dev/null 2>&1; then
            usec=$(awk -v s="$duration" 'BEGIN { printf "%d", s * 1000000 }')
            if [ "$usec" -gt 0 ] 2>/dev/null; then
                usleep "$usec" 2>/dev/null && return 0
            fi
        fi
    fi

    # 有些系统 usleep 是 busybox applet，但没有独立 symlink。
    if command -v busybox >/dev/null 2>&1; then
        if command -v awk >/dev/null 2>&1; then
            usec=$(awk -v s="$duration" 'BEGIN { printf "%d", s * 1000000 }')
            if [ "$usec" -gt 0 ] 2>/dev/null; then
                busybox usleep "$usec" 2>/dev/null && return 0
            fi
        fi
    fi

    # 兜底，避免报错导致脚本异常。
    sleep 1
}

wait_pid_exit() {
    pid="$1"
    retries="$2"
    interval="$3"

    while [ "$retries" -gt 0 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            wait "$pid" 2>/dev/null || true
            return 0
        fi

        safe_sleep "$interval"
        retries=$((retries - 1))
    done

    return 1
}

signal_mmcli_inhibit_and_wait() {
    pid="$1"
    sig="$2"
    sig_name="$3"
    attempts="$4"

    attempt=1

    while [ "$attempt" -le "$attempts" ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            wait "$pid" 2>/dev/null || true
            return 0
        fi

        log "Sending $sig_name to mmcli inhibit process, pid=$pid, attempt=$attempt/$attempts"

        kill "-$sig" "$pid" 2>/dev/null || true

        if wait_pid_exit "$pid" "$INHIBIT_EXIT_RETRIES" "$INHIBIT_EXIT_INTERVAL"; then
            log "mmcli inhibit process exited after $sig_name"
            return 0
        fi

        attempt=$((attempt + 1))
    done

    return 1
}

cleanup_mmcli_inhibit() {
    pid="$INHIBIT_PID"

    [ -n "$pid" ] || return 0

    if ! kill -0 "$pid" 2>/dev/null; then
        wait "$pid" 2>/dev/null || true
        INHIBIT_PID=""
        return 0
    fi

    log "Cleaning up remaining mmcli inhibit process, pid=$pid"

    # 优先 INT，等价 Ctrl+C，mmcli 通常会正常释放 inhibit。
    if signal_mmcli_inhibit_and_wait "$pid" "INT" "SIGINT" "$INHIBIT_SIGNAL_ATTEMPTS"; then
        INHIBIT_PID=""
        return 0
    fi

    # 然后 TERM。
    if signal_mmcli_inhibit_and_wait "$pid" "TERM" "SIGTERM" "$INHIBIT_SIGNAL_ATTEMPTS"; then
        INHIBIT_PID=""
        return 0
    fi

    # 最后 KILL。
    if signal_mmcli_inhibit_and_wait "$pid" "KILL" "SIGKILL" "$INHIBIT_SIGNAL_ATTEMPTS"; then
        INHIBIT_PID=""
        return 0
    fi

    log "ERROR: Failed to terminate mmcli inhibit process, pid=$pid. Modem may remain inhibited."
    INHIBIT_PID=""
    return 1
}

run_mmcli_inhibit() {
    inhibit_log="/tmp/qmi-mmcli-inhibit-$$.log"

    if ! command -v mmcli >/dev/null 2>&1; then
        log "mmcli not found, skipping modem inhibit"
        return 0
    fi

    rm -f "$inhibit_log"

    log "Starting mmcli inhibit for device path: $DEVICE_PATH, timeout=${INHIBIT_TIMEOUT}s"

    mmcli --inhibit-device="$DEVICE_PATH" > "$inhibit_log" 2>&1 &
    INHIBIT_PID="$!"

    log "mmcli inhibit started, pid=$INHIBIT_PID"

    # 保持 inhibit 指定时间
    safe_sleep "$INHIBIT_TIMEOUT"

    # 如果 mmcli 已经提前退出，记录状态和输出
    if ! kill -0 "$INHIBIT_PID" 2>/dev/null; then
        wait "$INHIBIT_PID" 2>/dev/null
        rc="$?"

        if [ "$rc" -eq 0 ]; then
            log "mmcli inhibit exited normally before release signal"
        else
            log "mmcli inhibit exited early with rc=$rc"
            log_file_content "$inhibit_log"
        fi

        INHIBIT_PID=""
        rm -f "$inhibit_log"
        return 0
    fi

    log "Releasing mmcli inhibit, pid=$INHIBIT_PID"

    # 释放 inhibit，优先 SIGINT
    if signal_mmcli_inhibit_and_wait "$INHIBIT_PID" "INT" "SIGINT" "$INHIBIT_SIGNAL_ATTEMPTS"; then
        INHIBIT_PID=""
        rm -f "$inhibit_log"
        log "mmcli inhibit released by SIGINT"
        return 0
    fi

    log "WARNING: mmcli inhibit did not exit after SIGINT, trying SIGTERM"

    if signal_mmcli_inhibit_and_wait "$INHIBIT_PID" "TERM" "SIGTERM" "$INHIBIT_SIGNAL_ATTEMPTS"; then
        INHIBIT_PID=""
        rm -f "$inhibit_log"
        log "mmcli inhibit released by SIGTERM"
        return 0
    fi

    log "WARNING: mmcli inhibit did not exit after SIGTERM, trying SIGKILL"

    if signal_mmcli_inhibit_and_wait "$INHIBIT_PID" "KILL" "SIGKILL" "$INHIBIT_SIGNAL_ATTEMPTS"; then
        INHIBIT_PID=""
        rm -f "$inhibit_log"
        log "mmcli inhibit killed by SIGKILL"
        return 0
    fi

    log "ERROR: mmcli inhibit process could not be terminated, pid=$INHIBIT_PID"
    log_file_content "$inhibit_log"

    INHIBIT_PID=""
    rm -f "$inhibit_log"

    # 这里返回 0，避免初始化流程因为 inhibit 清理失败而整体失败。
    # 但日志中会有 ERROR，需要人工检查。
    return 0
}

# 脚本被中断或退出时，尝试清理 inhibit 进程
trap 'cleanup_mmcli_inhibit; exit 130' INT
trap 'cleanup_mmcli_inhibit; exit 143' TERM
trap 'cleanup_mmcli_inhibit' EXIT

check_qmi_device() {
    local retry=0
    while [ $retry -lt $MAX_RETRIES ]; do
        if [ -c "/dev/wwan0qmi0" ]; then
            return 0
        fi
        log "QMI device not found, retry $((retry+1))/$MAX_RETRIES"
        sleep $RETRY_DELAY
        retry=$((retry+1))
    done
    return 1
}

reset_eps_apn() {
    log "Resetting EPS APN for models matching: $ResetEpsApnModelKeyWords"
    if qmicli -d /dev/wwan0qmi0 -p --wds-modify-profile="3gpp,3,apn='',pdp-type=IPV4V6,auth=NONE,username='',password=''"; then
        log "EPS APN reset successful"
        return 0
    else
        log "Failed to reset EPS APN"
        return 1
    fi
}

reset_wf2_eps_apn() {
    log "Resetting wf2 EPS APN"
    qmicli -d /dev/wwan0qmi0 -p --wds-delete-profile="3gpp,2"
    qmicli -d /dev/wwan0qmi0 -p --wds-delete-profile="3gpp,3"
    qmicli -d /dev/wwan0qmi0 -p --wds-delete-profile="3gpp,4"
    qmicli -d /dev/wwan0qmi0 -p --wds-delete-profile="3gpp,5"
    if qmicli -d /dev/wwan0qmi0 -p --wds-modify-profile="3gpp,1,apn='',pdp-type=IPV4V6,auth=NONE,username='',password=''"; then
        log "wf2 EPS APN reset successful"
        return 0
    else
        log "Failed to reset EPS APN"
        return 1
    fi
}

repower_sim() {
    log "Repower Sim"
    qmicli -d /dev/wwan0qmi0 -p --uim-sim-power-off=1
    sleep 1
    qmicli -d /dev/wwan0qmi0 -p --uim-sim-power-on=1
    sleep 1
    qmicli -d /dev/wwan0qmi0 -p --uim-reset
}

activate_sim() {
    log "Activating SIM for models matching: $ActiveSimModelKeyWords"

    # 获取完整的卡状态输出
    local card_status
    card_status=$(qmicli -d /dev/wwan0qmi0 -p --uim-get-card-status 2>/dev/null)
    if [ -z "$card_status" ]; then
        log "Failed to get card status"
        return 1
    fi

    # 优先提取类型为 usim 的 Application ID
    APPLICATION_ID=$(echo "$card_status" | awk '
        /Application type:/ && /usim/ { found=1 }
        found && /Application ID:/ {
            getline
            gsub(/[[:space:]]/, "")
            print $0
            exit
        }
    ')

    if [ -z "$APPLICATION_ID" ]; then
        # 回退：未找到 usim，使用第一个 Application ID，兼容旧设备
        log "USIM application not found, falling back to first application"
        APPLICATION_ID=$(echo "$card_status" | awk '
            /Application ID:/ {
                getline
                gsub(/[[:space:]]/, "")
                print $0
                exit
            }
        ')
        if [ -z "$APPLICATION_ID" ]; then
            log "Failed to get any Application ID"
            return 1
        fi
    fi

    log "Found Application ID: $APPLICATION_ID"

    # 激活 provisioning session
    if qmicli -d /dev/wwan0qmi0 -p --uim-change-provisioning-session="slot=1,activate=yes,session-type=primary-gw-provisioning,aid=$APPLICATION_ID"; then
        log "Successfully activated provisioning session with AID: $APPLICATION_ID"
        return 0
    else
        log "Failed to activate provisioning session"
        return 1
    fi
}

main() {
    log "Starting QMI modem initialization"

    # Check if model file exists
    if [ ! -f "$MODEL_FILE" ]; then
        log "Model file not found: $MODEL_FILE"
        return 1
    fi

    # Read model
    MODEL=$(cat "$MODEL_FILE" 2>/dev/null)
    log "Device model: $MODEL"

    # Define model keywords
    ResetEpsApnModelKeyWords="uz801|jz02v10|gexing-sp970|ufi-wf2"
    ActiveSimModelKeyWords="gexing-sp970"

    # Wait for QMI device
    if ! check_qmi_device; then
        log "QMI device not found after maximum retries"
        return 1
    fi

    # Reset EPS APN if needed
    if echo "$MODEL" | grep -qE "$ResetEpsApnModelKeyWords"; then
        if echo "$MODEL" | grep -qE "ufi-wf2"; then
            reset_wf2_eps_apn
        else
            reset_eps_apn
        fi
    fi

    sleep 1

    # Activate SIM if needed
    #if echo "$MODEL" | grep -qE "$ActiveSimModelKeyWords"; then
    #    activate_sim
    #fi

    sleep 1

    # Set SMS Default Storage
    if [ -c "/dev/wwan0at1" ]; then
        printf 'AT+CPMS="ME","ME","ME"\r' > /dev/wwan0at1
        log "SMS default storage set to ME"
    else
        log "AT port /dev/wwan0at1 not found, skipping SMS storage setup"
    fi

    sleep 3

    # 安全执行 modem inhibit
    #run_mmcli_inhibit

    repower_sim

    log "QMI modem initialization completed"
    return 0
}

# Run main function
main "$@"
exit "$?"
