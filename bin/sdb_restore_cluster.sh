#!/bin/bash
# ========================================
# sdb_restore_cluster.sh - 恢复集群到正常状态
# ========================================

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 显示帮助
function show_help() {
    cat << EOF
Usage:
    sdb_restore_cluster.sh [options]

Options:
    -h, --help          Show help message
    -c, --conf <file>   Specify config file

Example:
    sdb_restore_cluster.sh -c config/config.js

Notes:
    This script will:
    1. Check if all nodes are healthy
    2. Disable all MaintenanceMode
    3. Disable all CriticalMode
    4. Restore the cluster to normal operation
    Use this only after a DR failover or when cluster is stable
EOF
}

# 主函数
function main() {
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
