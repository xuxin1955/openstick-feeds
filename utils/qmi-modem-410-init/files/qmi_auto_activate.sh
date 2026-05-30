#!/bin/sh
set -eu

# 默认配置
DEVICE="/dev/wwan0qmi0"
SLOT="1"
DEVICE_PATH="qcom-soc"
TRIGGER_PATTERN="Refresh stage: end-with-success"
BROKEN_PATTERN="Cannot read from istream: connection broken"
MODE="monitor"   # 或 "once"

# inhibit 时间，建议不要太短
INHIBIT_TIMEOUT="0.6"

# 后台激活锁，避免并发执行多个激活流程
LOCKDIR="/tmp/qmi_auto_activate.lock"

usage() {
    echo "Usage: $0 [--once] [--device DEVICE] [--slot SLOT] [--device-path PATH] [--pattern PATTERN]"
    exit 1
}

# 解析命令行参数
while [ $# -gt 0 ]; do
    case "$1" in
        --once)
            MODE="once"
            shift
            ;;
        --device)
            [ $# -ge 2 ] || usage
            DEVICE="$2"
            shift 2
            ;;
        --slot)
            [ $# -ge 2 ] || usage
            SLOT="$2"
            shift 2
            ;;
        --device-path)
            [ $# -ge 2 ] || usage
            DEVICE_PATH="$2"
            shift 2
            ;;
        --pattern)
            [ $# -ge 2 ] || usage
            TRIGGER_PATTERN="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            ;;
    esac
done

# 检查 qmicli
if ! command -v qmicli >/dev/null 2>&1; then
    echo "错误: qmicli 未找到，请安装 libqmi-utils" >&2
    exit 1
fi

# 执行 qmicli 命令，失败时输出错误并退出
run_qmicli() {
    if ! output=$(qmicli -d "$DEVICE" -p "$@" 2>&1); then
        echo "错误: qmicli 命令执行失败: $*" >&2
        echo "$output" >&2
        exit 1
    fi

    echo "$output"
}

# 从 card_status 中提取指定槽位的 Personalization state
get_personalization_state() {
    echo "$1" | awk -v slot="$SLOT" '
        $0 ~ "Slot \\[" slot "\\]:" {
            in_slot = 1
            next
        }

        in_slot && /Slot \[[0-9]+\]:/ {
            exit
        }

        in_slot && /Personalization state:/ {
            split($0, a, ":")
            gsub(/^[[:space:]\047]+|[[:space:]\047]+$/, "", a[2])
            print a[2]
            exit
        }
    '
}

# 优先从指定槽位中提取 USIM Application ID
get_usim_app_id() {
    echo "$1" | awk -v slot="$SLOT" '
        $0 ~ "Slot \\[" slot "\\]:" {
            in_slot = 1
            next
        }

        in_slot && /Slot \[[0-9]+\]:/ {
            exit
        }

        in_slot && /Application type:/ {
            line = tolower($0)
            if (line ~ /usim/) {
                found_usim = 1
            } else {
                found_usim = 0
            }
        }

        in_slot && found_usim && /Application ID:/ {
            getline
            gsub(/[[:space:]\047]/, "", $0)
            print
            exit
        }
    '
}

# 从指定槽位中提取第一个 Application ID，作为 fallback
get_first_app_id() {
    echo "$1" | awk -v slot="$SLOT" '
        $0 ~ "Slot \\[" slot "\\]:" {
            in_slot = 1
            next
        }

        in_slot && /Slot \[[0-9]+\]:/ {
            exit
        }

        in_slot && /Application ID:/ {
            getline
            gsub(/[[:space:]\047]/, "", $0)
            print
            exit
        }
    '
}

# 安全 sleep，兼容部分不支持小数 sleep 的系统
safe_sleep() {
    duration="$1"
    # 优先尝试系统 sleep，部分 BusyBox 支持小数
    if sleep "$duration" 2>/dev/null; then
        return 0
    fi
    # 如果 sleep 不支持小数，尝试使用 usleep
    if command -v usleep >/dev/null 2>&1 && command -v awk >/dev/null 2>&1; then
        usec=$(awk -v s="$duration" 'BEGIN { printf "%d", s * 1000000 }')
        if [ "$usec" -gt 0 ] 2>/dev/null; then
            usleep "$usec" 2>/dev/null && return 0
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
    # 最后兜底
    sleep 1
}
# 等待某个 PID 退出
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
# 安全执行 mmcli inhibit
# 逻辑：
# 1. 启动 mmcli --inhibit-device
# 2. 保持 INHIBIT_TIMEOUT 秒
# 3. 发送 INT，模拟 Ctrl+C，正常释放 inhibit
# 4. 如果不退出，发送 TERM
# 5. 如果还不退出，发送 KILL
run_mmcli_inhibit() {
    if ! command -v mmcli >/dev/null 2>&1; then
        echo "警告: mmcli 不存在，跳过 inhibit 操作"
        return 0
    fi
    inhibit_log="/tmp/qmi_mmcli_inhibit_$$.log"
    rm -f "$inhibit_log"
    echo "执行 mmcli inhibit，设备路径: $DEVICE_PATH，持续时间: ${INHIBIT_TIMEOUT}s"
    mmcli --inhibit-device="$DEVICE_PATH" >"$inhibit_log" 2>&1 &
    inhibit_pid="$!"
    echo "mmcli inhibit PID: $inhibit_pid"
    # 保持 inhibit 指定时间
    safe_sleep "$INHIBIT_TIMEOUT"
    # 如果 mmcli 已经自己退出，检查一下结果
    if ! kill -0 "$inhibit_pid" 2>/dev/null; then
        inhibit_rc=0
        wait "$inhibit_pid" 2>/dev/null || inhibit_rc="$?"
        if [ "$inhibit_rc" -ne 0 ]; then
            echo "警告: mmcli inhibit 提前退出，返回码: $inhibit_rc" >&2
            if [ -s "$inhibit_log" ]; then
                echo "mmcli 输出:" >&2
                cat "$inhibit_log" >&2
            fi
        else
            echo "mmcli inhibit 已正常结束"
        fi
        rm -f "$inhibit_log"
        return 0
    fi
    echo "准备释放 mmcli inhibit，先发送 INT 信号..."
    # 首选 INT，等价于 Ctrl+C，通常 mmcli 会正常释放 inhibit
    kill -INT "$inhibit_pid" 2>/dev/null || true
    if wait_pid_exit "$inhibit_pid" 10 0.1; then
        echo "mmcli inhibit 已通过 INT 正常释放"
        rm -f "$inhibit_log"
        return 0
    fi
    echo "警告: mmcli inhibit 收到 INT 后未退出，发送 TERM..." >&2
    kill -TERM "$inhibit_pid" 2>/dev/null || true
    if wait_pid_exit "$inhibit_pid" 10 0.1; then
        echo "mmcli inhibit 已通过 TERM 释放"
        rm -f "$inhibit_log"
        return 0
    fi
    echo "严重警告: mmcli inhibit 收到 TERM 后仍未退出，发送 KILL..." >&2
    kill -KILL "$inhibit_pid" 2>/dev/null || true
    if wait_pid_exit "$inhibit_pid" 10 0.1; then
        echo "mmcli inhibit 已被 KILL 强制结束"
        rm -f "$inhibit_log"
        return 0
    fi
    echo "严重错误: mmcli inhibit 进程无法被杀掉，PID: $inhibit_pid" >&2
    echo "这可能导致 modem 仍处于 inhibit 状态，请手动检查。" >&2
    if [ -s "$inhibit_log" ]; then
        echo "mmcli 输出:" >&2
        cat "$inhibit_log" >&2
    fi
    rm -f "$inhibit_log"
    # 这里仍然 return 0，避免整个激活脚本因为 inhibit 清理失败而中断。
    # 但日志里会有严重错误提示。
    return 0
}

# 激活逻辑：检查 SIM 卡状态，若缺失则激活配置会话
activate_if_sim_missing() {
    echo "执行激活检查..."
    echo "获取卡状态..."

    card_status=$(run_qmicli --uim-get-card-status)

    personalization_state=$(get_personalization_state "$card_status")

    if [ -z "$personalization_state" ]; then
        echo "错误: 未能从卡状态中获取卡槽 $SLOT 的 Personalization state" >&2
        exit 1
    fi

    echo "卡槽 $SLOT 的个人化状态: $personalization_state"

    state_lower=$(echo "$personalization_state" | tr '[:upper:]' '[:lower:]')

    if [ "$state_lower" = "ready" ]; then
        echo "SIM 卡已就绪，无需激活。"
        exit 0
    fi

    echo "SIM 卡缺失或未就绪，当前状态: $personalization_state"
    echo "准备激活配置会话..."

    app_id=$(get_usim_app_id "$card_status")

    if [ -z "$app_id" ]; then
        echo "未找到 USIM 应用，回退到卡槽 $SLOT 的第一个 Application ID"
        app_id=$(get_first_app_id "$card_status")
    fi

    if [ -z "$app_id" ]; then
        echo "错误: 未找到卡槽 $SLOT 的 Application ID" >&2
        exit 1
    fi

    echo "找到 Application ID: $app_id"

    activate_cmd="--uim-change-provisioning-session=slot=$SLOT,activate=yes,session-type=primary-gw-provisioning,aid=$app_id"

    echo "执行激活命令: qmicli -d $DEVICE -p $activate_cmd"

    if ! output=$(qmicli -d "$DEVICE" -p "$activate_cmd" 2>&1); then
        echo "错误: 激活配置会话失败" >&2
        echo "$output" >&2
        exit 1
    fi

    echo "$output"
    echo "激活配置会话成功"

    run_mmcli_inhibit

    sleep 1

    echo "设备重新探测完成，请检查 SIM 卡状态。"
    exit 0
}

# 后台启动激活流程，带锁，避免并发
start_activation_background() {
    (
        # 避免继承主监控进程的 trap，防止后台激活退出时误杀监控 qmicli
        trap - EXIT INT TERM

        if mkdir "$LOCKDIR" 2>/dev/null; then
            trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT
            activate_if_sim_missing
        else
            echo "已有激活流程正在执行，跳过本次触发。"
            exit 0
        fi
    ) &
}

# once 模式
if [ "$MODE" = "once" ]; then
    activate_if_sim_missing
fi

# =========================
# monitor 模式
# =========================

echo "开始监控 qmicli 输出，触发词：'$TRIGGER_PATTERN'"
echo "设备: $DEVICE, 卡槽: $SLOT, 设备路径: $DEVICE_PATH"
echo "按 Ctrl+C 停止监控"

FIFO="/tmp/qmi_auto_activate_$$.fifo"
qmicli_pid=""

stop_monitor_process() {
    pid="$1"

    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "停止 qmicli 监控进程: $pid"
        kill "$pid" 2>/dev/null || true

        sleep 2

        if kill -0 "$pid" 2>/dev/null; then
            echo "qmicli 监控进程未正常退出，强制杀掉: $pid"
            kill -9 "$pid" 2>/dev/null || true
        fi

        wait "$pid" 2>/dev/null || true
    fi
}

cleanup() {
    echo "清理监控资源..."

    if [ -n "${qmicli_pid:-}" ]; then
        stop_monitor_process "$qmicli_pid"
    fi

    rm -f "$FIFO"
}

on_signal_exit() {
    trap - EXIT INT TERM
    cleanup
    exit 0
}

trap cleanup EXIT
trap on_signal_exit INT TERM

rm -f "$FIFO"

if ! mkfifo "$FIFO"; then
    echo "错误: 创建 FIFO 失败: $FIFO" >&2
    exit 1
fi

while true; do
    echo "启动 qmicli 监控进程..."

    if command -v stdbuf >/dev/null 2>&1; then
        echo "使用 stdbuf 确保实时输出"
        stdbuf -oL -eL qmicli -d "$DEVICE" -p --uim-monitor-refresh-all >"$FIFO" 2>&1 &
    else
        echo "警告: stdbuf 未安装，输出可能有延迟。"
        qmicli -d "$DEVICE" -p --uim-monitor-refresh-all >"$FIFO" 2>&1 &
    fi

    qmicli_pid="$!"
    echo "qmicli 监控进程 PID: $qmicli_pid"

    restart_reason="qmicli 监控进程退出"

    while IFS= read -r line || [ -n "$line" ]; do
        echo "$line"

        case "$line" in
            *"$TRIGGER_PATTERN"*)
                echo "检测到刷新成功，执行激活检查..."
                start_activation_background
                ;;

            *"$BROKEN_PATTERN"*)
                echo "检测到 qmicli 连接断开异常: $BROKEN_PATTERN"
                echo "准备重启 qmicli 监控进程..."
                restart_reason="qmicli connection broken"
                stop_monitor_process "$qmicli_pid"
                break
                ;;
        esac
    done <"$FIFO"

    if [ -n "${qmicli_pid:-}" ]; then
        stop_monitor_process "$qmicli_pid"
        qmicli_pid=""
    fi

    echo "监控进程已结束，原因: $restart_reason"
    echo "1秒后重新启动监听..."
    sleep 1
done
