#!/bin/bash
# ========================================
# sdb_init_location.sh - 初始化和展示 Location 信息
# ========================================

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 显示帮助
function show_help() {
    cat << EOF
Usage:
    sdb_init_location.sh [command] [options]

Commands:
    show          Show current cluster location information
    check         Check location configuration against expected
    init          Initialize location configuration

Options:
    -h, --help          Show help message
    -c, --conf <file>   Specify config file
    -f, --file <file>   Specify location file

Examples:
    sdb_init_location.sh
    sdb_init_location.sh show
    sdb_init_location.sh check -c config/config.js
    sdb_init_location.sh init -c config/config.js
    sdb_init_location.sh show -f location.txt

For show mode, the generated location file can be modified and used with init -f file:
EOF
}

# 主函数
function main() {
    local command=""
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
            -f|--file)
                options+=("-f" "$2")
                eval_args+=("-f" "\"$2\"")
                shift 2
                ;;
            show)
                command="show"
                eval_args+=("show")
                shift
                ;;
            check)
                command="check"
                eval_args+=("check")
                shift
                ;;
            init)
                command="init"
                eval_args+=("init")
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
    if [ -z "$command" ]; then
        command="show"
    fi

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
