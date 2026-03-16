#!/bin/bash
# ========================================
# sdb_start_critical.sh - 开启 CriticalMode
# ========================================

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 显示帮助
function show_help() {
    cat << EOF
Usage:
    sdb_start_critical.sh [command] [options]

Commands:
    start_critical    Start CriticalMode

Options:
    -h, --help          Show help message
    -c, --conf <file>   Specify config file
    -l, --location <loc>Specify Location
    -H, --hostname <host>Specify hostname(s)
    -n, --nodename <node>Specify nodename(s)
    -d, --domain <domain>Specify domain(s)
    -f, --file <file>   Specify node information file

Examples:
    sdb_start_critical.sh -c config/config.js
    sdb_start_critical.sh -l GuangZhou
    sdb_start_critical.sh -H host1,host2
    sdb_start_critical.sh -f location1

Notes:
    CriticalMode will set these nodes to be primary during re-election
    This may cause data rollback if not used properly
    Use with caution and follow proper DR procedures
EOF
}

# 主函数
function main() {
    local command="start_critical"
    local options=()
    local eval_args=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--conf)
                options+=("-c" "$2")
                eval_args+=("-c" "\"$2\"")
                shift 2
                ;;
            -l|--location)
                options+=("-l" "$2")
                eval_args+=("-l" "\"$2\"")
                shift 2
                ;;
            -H|--hostname)
                options+=("-H" "$2")
                eval_args+=("-H" "\"$2\"")
                shift 2
                ;;
            -n|--nodename)
                options+=("-n" "$2")
                eval_args+=("-n" "\"$2\"")
                shift 2
                ;;
            -d|--domain)
                options+=("-d" "$2")
                eval_args+=("-d" "\"$2\"")
                shift 2
                ;;
            -f|--file)
                options+=("-f" "$2")
                eval_args+=("-f" "\"$2\"")
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

    # 调用main.js，使用-e参数传递JavaScript代码
    local js_code="loadConfig(\"config.js\");"
    for arg in "${eval_args[@]}"; do
        js_code="$js_code $arg"
    done

    exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "$js_code"
}

main "$@"
