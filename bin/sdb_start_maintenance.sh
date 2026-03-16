#!/bin/bash
# ========================================
# sdb_start_maintenance.sh - 开启 MaintenanceMode
# ========================================

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 显示帮助
function show_help() {
    cat << EOF
Usage:
    sdb_start_maintenance.sh [command] [options]

Commands:
    start_maintenance  Start MaintenanceMode

Options:
    -h, --help          Show help message
    -c, --conf <file>   Specify config file
    -l, --location <loc>Specify Location
    -H, --hostname <host>Specify hostname(s)
    -n, --nodename <node>Specify nodename(s)
    -d, --domain <domain>Specify domain(s)
    -f, --file <file>   Specify node information file

Examples:
    sdb_start_maintenance.sh -c config/config.js
    sdb_start_maintenance.sh -l GuangZhou
    sdb_start_maintenance.sh -H host1,host2
    sdb_start_maintenance.sh -f location1

Notes:
    MaintenanceMode will prevent these nodes from being primary during re-election
    It's safe to enable MaintenanceMode on healthy nodes for testing purposes
EOF
}

# 主函数
function main() {
    local options=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--conf)
                options+=("-c" "$2")
                shift 2
                ;;
            -l|--location)
                options+=("-l" "$2")
                shift 2
                ;;
            -H|--hostname)
                options+=("-H" "$2")
                shift 2
                ;;
            -n|--nodename)
                options+=("-n" "$2")
                shift 2
                ;;
            -d|--domain)
                options+=("-d" "$2")
                shift 2
                ;;
            -f|--file)
                options+=("-f" "$2")
                shift 2
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

    # 构建参数列表
    local params=""
    if [ -n "$options[c]" ]; then
        params="-c \"$options[c]\""
    fi
    if [ -n "$options[l]" ]; then
        params="$params -l \"$options[l]\""
    fi
    if [ -n "$options[H]" ]; then
        params="$params -H \"$options[H]\""
    fi
    if [ -n "$options[n]" ]; then
        params="$params -n \"$options[n]\""
    fi
    if [ -n "$options[d]" ]; then
        params="$params -d \"$options[d]\""
    fi
    if [ -n "$options[f]" ]; then
        params="$params -f \"$options[f]\""
    fi

    exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "loadConfig('config.js'); start_maintenance $params"
}

main "$@"
