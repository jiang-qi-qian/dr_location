// dr_location 工具 - 主入口文件
// 使用方式: sdb -f bin/main.js [command] [options]

// 全局配置
var config = {
    scriptDir: new File(__FILE__).parent().path(),
    projectRoot: new File(__FILE__).parent().parent().path(),
    defaultConfig: "config/config.js",
    defaultOutput: "output/location.txt"
};

// 解析命令行参数（从命令行位置参数）
function parseArgumentsFromPositional(args) {
    var command = "show"; // 默认命令
    var options = {};

    for (var i = 0; i < args.length; i++) {
        var arg = args[i];

        // 命令模式
        if (["show", "check", "init", "start_maintenance", "stop_maintenance",
             "start_critical", "stop_critical", "restore"].indexOf(arg) !== -1) {
            command = arg;
        }
        // 选项模式
        else if (arg === "-c" || arg === "--conf") {
            options.config = args[i + 1];
            i++;
        }
        else if (arg === "-f" || arg === "--file") {
            options.file = args[i + 1];
            i++;
        }
        else if (arg === "-l" || arg === "--location") {
            options.location = args[i + 1];
            i++;
        }
        else if (arg === "-H" || arg === "--hostname") {
            options.hostnames = args[i + 1];
            i++;
        }
        else if (arg === "-n" || arg === "--nodename") {
            options.nodenames = args[i + 1];
            i++;
        }
        else if (arg === "-d" || arg === "--domain") {
            options.domains = args[i + 1];
            i++;
        }
        else if (arg === "--check") {
            options.check = true;
        }
        else if (arg.startsWith("-")) {
            print("Unknown option: " + arg);
            showHelp();
            exit(1);
        }
    }

    return { command, options };
}

// 解析 -e 参数的 JavaScript 代码
function parseArgumentsFromEvaluate(args) {
    // args 包含所有通过 -e 传递的 JavaScript 代码片段
    var combined = args.join(" ");
    var command = "show";
    var options = {};

    // 提取命令（第一个非选项参数）
    var tokens = combined.trim().split(/\s+/);
    var i = 0;

    if (tokens.length > 0) {
        var firstToken = tokens[0];
        if (["show", "check", "init", "start_maintenance", "stop_maintenance",
             "start_critical", "stop_critical", "restore"].indexOf(firstToken) !== -1) {
            command = firstToken;
            i++;
        }
    }

    // 解析选项
    while (i < tokens.length) {
        var token = tokens[i];
        if (token === "-c" || token === "--conf") {
            if (i + 1 < tokens.length) {
                options.config = tokens[i + 1];
                i += 2;
            } else {
                i++;
            }
        }
        else if (token === "-f" || token === "--file") {
            if (i + 1 < tokens.length) {
                options.file = tokens[i + 1];
                i += 2;
            } else {
                i++;
            }
        }
        else if (token === "-l" || token === "--location") {
            if (i + 1 < tokens.length) {
                options.location = tokens[i + 1];
                i += 2;
            } else {
                i++;
            }
        }
        else if (token === "-H" || token === "--hostname") {
            if (i + 1 < tokens.length) {
                options.hostnames = tokens[i + 1];
                i += 2;
            } else {
                i++;
            }
        }
        else if (token === "-n" || token === "--nodename") {
            if (i + 1 < tokens.length) {
                options.nodenames = tokens[i + 1];
                i += 2;
            } else {
                i++;
            }
        }
        else if (token === "-d" || token === "--domain") {
            if (i + 1 < tokens.length) {
                options.domains = tokens[i + 1];
                i += 2;
            } else {
                i++;
            }
        }
        else if (token === "--check") {
            options.check = true;
            i++;
        }
        else {
            i++;
        }
    }

    return { command, options };
}

// 显示帮助信息
function showHelp() {
    var helpText = "Usage: sdb -f bin/main.js -e [JavaScript code]\n\n" +
                   "Commands:\n" +
                   "  show          Show current cluster location information\n" +
                   "  check         Check location configuration against expected\n" +
                   "  init          Initialize location configuration\n" +
                   "  start_maintenance  Start MaintenanceMode\n" +
                   "  stop_maintenance   Stop MaintenanceMode\n" +
                   "  start_critical     Start CriticalMode\n" +
                   "  stop_critical      Stop CriticalMode\n" +
                   "  restore          Restore cluster (stop all modes)\n\n" +
                   "Options:\n" +
                   "  -h, --help          Show help message\n" +
                   "  -c, --conf <file>   Specify config file\n" +
                   "  -f, --file <file>   Specify node information file\n" +
                   "  -l, --location <loc>Specify Location\n" +
                   "  -H, --hostname <host>Specify hostname(s)\n" +
                   "  -n, --nodename <node>Specify nodename(s)\n" +
                   "  -d, --domain <domain>Specify domain(s)\n" +
                   "  --check             Check node status before stopping mode\n\n" +
                   "Examples:\n" +
                   "  sdb -f bin/main.js -e \"loadConfig('config/config.js'); show\"\n" +
                   "  sdb -f bin/main.js -e \"loadConfig('config/config.js'); check\"\n" +
                   "  sdb -f bin/main.js -e \"loadConfig('config/config.js'); init\"\n" +
                   "  sdb -f bin/main.js -e \"loadConfig('config/config.js'); start_maintenance -l GuangZhou\"\n" +
                   "  sdb -f bin/main.js -e \"loadConfig('config/config.js'); stop_maintenance -H host1,host2\"\n" +
                   "  sdb -f bin/main.js -e \"loadConfig('config/config.js'); restore\"";

    print(helpText);
}

// 加载配置
function loadConfig(configPath) {
    if (!configPath) {
        configPath = config.scriptDir + "/../config/config.js";
    }

    var configFile = new File(configPath);
    if (!configFile.exists()) {
        print("Error: Config file not found: " + configPath);
        exit(1);
    }

    var content = configFile.read();
    configFile.close();

    // 提取配置变量
    var match;
    var configRegex = /\b(\w+)\s*=\s*(.+?);?$/gm;
    while ((match = configRegex.exec(content)) !== null) {
        var varName = match[1];
        var varValue = match[2].trim();

        try {
            if (varValue.startsWith("{")) {
                config[varName] = JSON.parse(varValue);
            } else if (varValue.startsWith('"') && varValue.endsWith('"')) {
                config[varName] = varValue.substring(1, varValue.length - 1);
            } else if (varValue.match(/^\d+$/)) {
                config[varName] = parseInt(varValue, 10);
            } else if (varValue.match(/^true$/i)) {
                config[varName] = true;
            } else if (varValue.match(/^false$/i)) {
                config[varName] = false;
            } else {
                config[varName] = varValue;
            }
        } catch (e) {
            config[varName] = varValue;
        }
    }

    return config;
}

// 读取节点信息文件
function readNodeFile(filePath) {
    if (!filePath) {
        return null;
    }

    var file = new File(filePath);
    if (!file.exists()) {
        print("Warning: Node file not found: " + filePath);
        return null;
    }

    var content = file.read();
    file.close();

    var nodeInfo = {
        locations: [],
        hostnames: [],
        nodenames: [],
        domains: []
    };

    var lines = content.split('\n');
    var currentSection = null;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        if (line === "") continue;

        if (line.startsWith("[location]")) {
            currentSection = "locations";
        } else if (line.startsWith("[hostname]")) {
            currentSection = "hostnames";
        } else if (line.startsWith("[nodename]")) {
            currentSection = "nodenames";
        } else if (line.startsWith("[domain]")) {
            currentSection = "domains";
        } else if (currentSection) {
            if (line.startsWith("#")) continue;
            if (line.startsWith("//")) continue;
            if (currentSection === "locations") {
                nodeInfo.locations.push(line);
            } else if (currentSection === "hostnames") {
                nodeInfo.hostnames.push(line);
            } else if (currentSection === "nodenames") {
                nodeInfo.nodenames.push(line);
            } else if (currentSection === "domains") {
                nodeInfo.domains.push(line);
            }
        }
    }

    return nodeInfo;
}

// 主函数
function main() {
    var args = Array.prototype.slice.call(arguments);

    // 检查是否有 -e 参数（新的调用方式）
    var hasEvaluateArg = false;
    for (var i = 0; i < args.length; i++) {
        if (args[i] === "-e") {
            hasEvaluateArg = true;
            break;
        }
    }

    var result;
    if (hasEvaluateArg) {
        // 新的调用方式：从 -e 参数解析
        result = parseArgumentsFromEvaluate(args);
    } else {
        // 旧的调用方式：从位置参数解析
        result = parseArgumentsFromPositional(args);
    }

    var command = result.command;
    var options = result.options;

    // 显示帮助
    if (options.help || command === "help") {
        showHelp();
        exit(0);
    }

    // 加载配置
    var configPath = options.config || config.defaultConfig;
    loadConfig(configPath);

    try {
        // 初始化连接
        if (!connectToSdb()) {
            print("Error: Failed to connect to SequoiaDB");
            exit(1);
        }

        switch (command) {
            case "show":
                executeShow(options.file);
                break;

            case "check":
                executeCheck(options.file);
                break;

            case "init":
                executeInit();
                break;

            case "start_maintenance":
                executeStartMaintenance(options);
                break;

            case "stop_maintenance":
                executeStopMaintenance(options);
                break;

            case "start_critical":
                executeStartCritical(options);
                break;

            case "stop_critical":
                executeStopCritical(options);
                break;

            case "restore":
                executeRestore();
                break;

            default:
                print("Unknown command: " + command);
                showHelp();
                exit(1);
        }

        disconnectFromSdb();
        exit(0);

    } catch (e) {
        disconnectFromSdb();
        print("Error: " + e.message);
        print(e.stack);
        exit(1);
    }
}

// 执行 show 命令
function executeShow(file) {
    var nodeInfo = readNodeFile(file);

    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    var locationFile = nodeInfo ? (config.scriptDir + "/../output/location.txt") : file;
    dc.locationAnalyze({}, locationFile);
    disconnectFromSdb();

    print("\n" + "=".repeat(60));
    print("Location Information");
    print("=".repeat(60));

    var displayFile = new File(locationFile);
    if (displayFile.exists()) {
        print(displayFile.read());
        displayFile.close();
    } else {
        print("Warning: Location file not found: " + locationFile);
    }

    print("\n" + "=".repeat(60));
}

// 执行 check 命令
function executeCheck(file) {
    var nodeInfo = readNodeFile(file);

    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    var locationFile = nodeInfo ? (config.scriptDir + "/../output/location.txt") : file;
    dc.locationAnalyze({}, locationFile);
    disconnectFromSdb();

    print("\n" + "=".repeat(60));
    print("Location Check Results");
    print("=".repeat(60));

    var displayFile = new File(locationFile);
    if (displayFile.exists()) {
        print(displayFile.read());
        displayFile.close();

        // 读取配置文件中的期望Location
        var configFile = new File(configPath);
        if (configFile.exists()) {
            var configContent = configFile.read();
            configFile.close();

            var configRegex = /(\w+)\s*=\s*(.+?);?$/gm;
            var match;
            var expectedLocs = [];
            while ((match = configRegex.exec(configContent)) !== null) {
                if (match[1] === "initLocationObject") {
                    try {
                        expectedLocs = JSON.parse(match[2]);
                        print("\nExpected Locations:");
                        print(JSON.stringify(expectedLocs, null, 2));
                    } catch (e) {
                        // ignore
                    }
                }
            }
        }
    } else {
        print("Warning: Location file not found: " + locationFile);
    }

    print("\n" + "=".repeat(60));
}

// 执行 init 命令
function executeInit() {
    print("Initializing location configuration...");

    var locations = config.initLocationObject;
    if (!locations || Object.keys(locations).length === 0) {
        throw new Error("initLocationObject is not configured in config.js");
    }

    var count = 0;
    for (var location in locations) {
        var hosts = locations[location];
        if (Array.isArray(hosts) && hosts.length > 0) {
            var firstHost = hosts[0];
            print("Setting location for host " + firstHost + " -> " + location);

            try {
                dc.setLocation(firstHost, location);
                count++;
            } catch (e) {
                print("Warning: Failed to set location for " + firstHost + ": " + e.message);
            }
        }
    }

    if (count > 0) {
        print("\nSuccessfully set locations for " + count + " host(s)");
    } else {
        throw new Error("No locations were set");
    }

    if (config.activeLocation && config.activeLocation !== "") {
        print("Setting active location: " + config.activeLocation);
        dc.setActiveLocation(config.activeLocation);
    }
}

// 执行 start_maintenance 命令
function executeStartMaintenance(options) {
    var nodeInfo = readNodeFile(options.file);
    var filter = {};

    if (options.location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.startMaintenanceMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (options.hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.startMaintenanceMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (options.nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.startMaintenanceMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (options.domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.startMaintenanceMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("MaintenanceMode started");
}

// 执行 stop_maintenance 命令
function executeStopMaintenance(options) {
    var nodeInfo = readNodeFile(options.file);
    var filter = {};

    if (options.check) {
        print("Checking node status before stopping MaintenanceMode...");
        if (!checkNodes("maintenance")) {
            print("Error: Some nodes are not OK, cannot stop MaintenanceMode");
            exit(1);
        }
    }

    if (options.location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.stopMaintenanceMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (options.hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.stopMaintenanceMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (options.nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.stopMaintenanceMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (options.domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.stopMaintenanceMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("MaintenanceMode stopped");
}

// 执行 start_critical 命令
function executeStartCritical(options) {
    var nodeInfo = readNodeFile(options.file);
    var filter = {};

    if (options.location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.startCriticalMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (options.hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.startCriticalMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (options.nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.startCriticalMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (options.domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.startCriticalMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("CriticalMode started");
}

// 执行 stop_critical 命令
function executeStopCritical(options) {
    var nodeInfo = readNodeFile(options.file);
    var filter = {};

    if (options.check) {
        print("Checking node status before stopping CriticalMode...");
        if (!checkNodes("critical")) {
            print("Error: Some nodes are not OK, cannot stop CriticalMode");
            exit(1);
        }
    }

    if (options.location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.stopCriticalMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (options.hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.stopCriticalMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (options.nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.stopCriticalMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (options.domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.stopCriticalMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("CriticalMode stopped");
}

// 执行 restore 命令
function executeRestore() {
    print("Restoring cluster...");

    if (!checkClusterHealth()) {
        print("Warning: Cluster is not in healthy state");
    }

    print("Stopping all MaintenanceMode...");
    stopAllMaintenanceMode();

    print("Stopping all CriticalMode...");
    stopAllCriticalMode();

    print("Cluster restored successfully");
}

// 调用主函数
main(Array.prototype.slice.call(arguments));
