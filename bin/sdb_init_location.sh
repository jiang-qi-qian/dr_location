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
            -f|--file)
                options+=("-f" "$2")
                shift 2
                ;;
            show)
                shift
                # 使用 -c 指定配置文件后，执行 show 命令
                exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "loadConfig('config.js'); show"
                ;;
            check)
                shift
                exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "loadConfig('config.js'); check"
                ;;
            init)
                shift
                exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "loadConfig('config.js'); init"
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 默认显示
    if [ ! -f "$PROJECT_ROOT/config/config.js" ]; then
        echo "Error: Config file not found: $PROJECT_ROOT/config/config.js"
        exit 1
    fi

    exec sdb -f "$PROJECT_ROOT/bin/main.js" -e "loadConfig('config.js'); show"
}

main "$@"
