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
    local command="stop_critical"
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
            --check)
                options+=("--check")
                eval_args+=("--check")
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

    # 调用main.js，使用-e参数传递JavaScript代码
    local js_code="loadConfig(\"config.js\");"
    for arg in "${eval_args[@]}"; do
        js_code="$js_code $arg"
    done

    exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "$js_code"
}

main "$@"
