#!/bin/bash
# ========================================
# sdb_stop_critical.sh - 关闭 CriticalMode
# ========================================

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 显示帮助
function show_help() {
    cat << EOF
Usage:
    sdb_stop_critical.sh [command] [options]

Commands:
    stop_critical     Stop CriticalMode

Options:
    -h, --help          Show help message
    -c, --conf <file>   Specify config file
    -l, --location <loc>Specify Location
    -H, --hostname <host>Specify hostname(s)
    -n, --nodename <node>Specify nodename(s)
    -d, --domain <domain>Specify domain(s)
    -f, --file <file>   Specify node information file
    --check             Check node status before stopping

Examples:
    sdb_stop_critical.sh -c config/config.js
    sdb_stop_critical.sh -l GuangZhou
    sdb_stop_critical.sh --check
    sdb_stop_critical.sh -f location1

Notes:
    By default, all CriticalMode will be disabled
    Use --check to verify node status before disabling
EOF
}

# 主函数
function main() {
    local conf_val=""
    local loc_val=""
    local host_val=""
    local nod_val=""
    local dom_val=""
    local file_val=""
    local check_val=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--conf)
                conf_val="$2"
                shift 2
                ;;
            -l|--location)
                loc_val="$2"
                shift 2
                ;;
            -H|--hostname)
                host_val="$2"
                shift 2
                ;;
            -n|--nodename)
                nod_val="$2"
                shift 2
                ;;
            -d|--domain)
                dom_val="$2"
                shift 2
                ;;
            -f|--file)
                file_val="$2"
                shift 2
                ;;
            --check)
                check_val="1"
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 检查配置文件
    if [ ! -f "$PROJECT_ROOT/config/config.js" ]; then
        echo "Error: Config file not found: $PROJECT_ROOT/config/config.js"
        exit 1
    fi

    # 构建参数列表，用 ; 分隔
    local cmd="var mode=\"stop_critical\""
    cmd="$cmd; var projectRoot=\"$PROJECT_ROOT\""
    if [ -n "$conf_val" ]; then
        cmd="$cmd; var c=\"$conf_val\""
    fi
    if [ -n "$loc_val" ]; then
        cmd="$cmd; var l=\"$loc_val\""
    fi
    if [ -n "$host_val" ]; then
        cmd="$cmd; var H=\"$host_val\""
    fi
    if [ -n "$nod_val" ]; then
        cmd="$cmd; var n=\"$nod_val\""
    fi
    if [ -n "$dom_val" ]; then
        cmd="$cmd; var d=\"$dom_val\""
    fi
    if [ -n "$file_val" ]; then
        cmd="$cmd; var file=\"$file_val\""
    fi
    if [ -n "$check_val" ]; then
        cmd="$cmd; var check=1"
    fi

    exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "$cmd"
}

main "$@"
exit $?
