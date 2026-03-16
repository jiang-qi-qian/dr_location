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
    sdb_init_location.sh check
    sdb_init_location.sh init

EOF
}

# 主函数
function main() {
    local command=""
    local conf_val=""
    local file_val=""
    local params=""

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
            -f|--file)
                file_val="$2"
                shift 2
                ;;
            show)
                command="show"
                shift
                ;;
            check)
                command="check"
                shift
                ;;
            init)
                command="init"
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
    local cmd="var mode=\"$command\""
    if [ -n "$conf_val" ]; then
        cmd="$cmd; var c=\"$conf_val\""
    fi
    if [ -n "$file_val" ]; then
        cmd="$cmd; var file=\"$file_val\""
    fi

    exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "$cmd"
}

main "$@"
