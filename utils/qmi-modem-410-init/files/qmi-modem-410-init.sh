#!/bin/sh
# QMI Modem Initialization Script

MODEL_FILE="/sys/firmware/devicetree/base/model"
LOG_FILE="/var/log/qmi-modem-init.log"
MAX_RETRIES=10
RETRY_DELAY=5
DEVICE_PATH="qcom-soc"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

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

activate_sim() {
    log "Activating SIM for models matching: $ActiveSimModelKeyWords"
    
    APPLICATION_ID=$(qmicli -d /dev/wwan0qmi0 -p --uim-get-card-status 2>/dev/null | \
                    awk '/Application ID:/ {getline; gsub(/[[:space:]]/, ""); print $0; exit}')
    
    if [ -z "$APPLICATION_ID" ]; then
        log "Failed to get Application ID"
        return 1
    fi
    
    log "Found Application ID: $APPLICATION_ID"
    
    # Activate new session
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
    if echo "$MODEL" | grep -qE "$ActiveSimModelKeyWords"; then
        activate_sim
    fi

    sleep 1
    
    # Set SMS Default Storage
    echo -e 'AT+CPMS="ME","ME","ME"\r' > /dev/wwan0at1

    sleep 1
    
    timeout 0.6 mmcli --inhibit-device="$DEVICE_PATH" || true
    
    log "QMI modem initialization completed"
    return 0
}

# Run main function
main "$@"
