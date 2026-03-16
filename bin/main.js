// dr_location 工具 - 主入口文件
// 使用方式: sdb -f bin/main.js -e "var mode = 'show'; ..."

// 在文件开头加载配置文件
import('config/config.js');

// 全局配置（从配置文件中导入）
var config = {
    scriptDir: new File(__FILE__).parent().path(),
    projectRoot: new File(__FILE__).parent().parent().path(),
    defaultConfig: "config/config.js",
    defaultOutput: "output/location.txt"
};

// 显示帮助信息
function showHelp() {
    var helpText =
        "Usage: sdb -f bin/main.js -e \"var mode = 'command'; ...\"\n\n" +
        "Commands:\n" +
        "  show          Show current cluster location information\n" +
        "  check         Check location configuration against expected\n" +
        "  init          Initialize location configuration\n" +
        "  start_maintenance  Start MaintenanceMode\n" +
        "  stop_maintenance   Stop MaintenanceMode\n" +
        "  start_critical     Start CriticalMode\n" +
        "  stop_critical      Stop CriticalMode\n" +
        "  restore          Restore cluster (stop all modes)\n\n" +
        "Variables:\n" +
        "  mode          Command name\n" +
        "  c             Config file path\n" +
        "  file          Node information file\n" +
        "  l             Location name\n" +
        "  H             Hostname(s)\n" +
        "  n             Nodename(s)\n" +
        "  d             Domain(s)\n" +
        "  check         Enable check before stopping mode (1 or 0)\n\n" +
        "Examples:\n" +
        "  sdb -f bin/main.js -e \"var mode = 'show'\"\n" +
        "  sdb -f bin/main.js -e \"var mode = 'check'\"\n" +
        "  sdb -f bin/main.js -e \"var mode = 'init'\"\n" +
        "  sdb -f bin/main.js -e \"var mode = 'start_maintenance'; var l = 'GuangZhou'\"\n" +
        "  sdb -f bin/main.js -e \"var mode = 'stop_maintenance'; var H = 'host1,host2'; var check = 1\"\n" +
        "  sdb -f bin/main.js -e \"var mode = 'restore'\"";

    print(helpText);
}

// 加载配置（仅检查配置文件中的变量是否存在）
function loadConfig() {
    try {
        // 检查配置文件中的关键变量是否存在
        var requiredVars = [
            'sdbCoord', 'sdbUser', 'sdbPassword',
            'initLocationObject', 'activeLocation',
            'reelectLevel', 'minKeepTime', 'maxKeepTime'
        ];

        var missingVars = [];
        for (var i = 0; i < requiredVars.length; i++) {
            if (typeof window[requiredVars[i]] === 'undefined') {
                missingVars.push(requiredVars[i]);
            }
        }

        if (missingVars.length > 0) {
            print("Error: Missing required config variables: " + missingVars.join(', '));
            exit(1);
        }

        // 将配置文件中的变量复制到 config 对象
        config.sdbCoord = sdbCoord;
        config.sdbUser = sdbUser;
        config.sdbPassword = sdbPassword;
        config.sdbToken = sdbToken;
        config.sdbCipherFile = sdbCipherFile;
        config.initLocationObject = initLocationObject;
        config.activeLocation = activeLocation;
        config.reelectLevel = reelectLevel;
        config.minKeepTime = minKeepTime;
        config.maxKeepTime = maxKeepTime;
        config.enforceMaintenance = enforceMaintenance;
        config.enforceCritical = enforceCritical;

        return config;
    } catch (e) {
        print("Error: Failed to load config: " + e.message);
        exit(1);
    }
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

    // 显示帮助
    if (args.length > 0 && (args[0] === "-h" || args[0] === "--help")) {
        showHelp();
        exit(0);
    }

    try {
        // 加载配置
        loadConfig();

        // 初始化连接
        if (!connectToSdb()) {
            print("Error: Failed to connect to SequoiaDB");
            exit(1);
        }

        // 执行所有参数中的 JavaScript 语句
        // 参数格式: var mode = 'show'; var file = 'xxx';
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            if (arg && arg.trim() !== "") {
                try {
                    eval(arg);
                } catch (e) {
                    print("Error: Failed to execute: " + arg);
                    print("Error: " + e.message);
                    exit(1);
                }
            }
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
function executeShow() {
    var nodeInfo = readNodeFile(file);

    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    var locationFile = nodeInfo ? (config.projectRoot + "/output/location.txt") : file;
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
function executeCheck() {
    var nodeInfo = readNodeFile(file);

    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    var locationFile = nodeInfo ? (config.projectRoot + "/output/location.txt") : file;
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
        if (initLocationObject) {
            print("\nExpected Locations:");
            print(JSON.stringify(initLocationObject, null, 2));
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
function executeStartMaintenance() {
    var nodeInfo = readNodeFile(file);

    if (location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.startMaintenanceMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.startMaintenanceMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.startMaintenanceMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.startMaintenanceMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("MaintenanceMode started");
}

// 执行 stop_maintenance 命令
function executeStopMaintenance() {
    var nodeInfo = readNodeFile(file);

    if (check) {
        print("Checking node status before stopping MaintenanceMode...");
        if (!checkNodes("maintenance")) {
            print("Error: Some nodes are not OK, cannot stop MaintenanceMode");
            exit(1);
        }
    }

    if (location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.stopMaintenanceMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.stopMaintenanceMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.stopMaintenanceMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.stopMaintenanceMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("MaintenanceMode stopped");
}

// 执行 start_critical 命令
function executeStartCritical() {
    var nodeInfo = readNodeFile(file);

    if (location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.startCriticalMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.startCriticalMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.startCriticalMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.startCriticalMode({ Domain: nodeInfo.domains[i] });
        }
    }

    print("CriticalMode started");
}

// 执行 stop_critical 命令
function executeStopCritical() {
    var nodeInfo = readNodeFile(file);

    if (check) {
        print("Checking node status before stopping CriticalMode...");
        if (!checkNodes("critical")) {
            print("Error: Some nodes are not OK, cannot stop CriticalMode");
            exit(1);
        }
    }

    if (location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.stopCriticalMode({ Location: nodeInfo.locations[i] });
        }
    }
    if (hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.stopCriticalMode({ Hostname: nodeInfo.hostnames[i] });
        }
    }
    if (nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.stopCriticalMode({ NodeName: nodeInfo.nodenames[i] });
        }
    }
    if (domains && nodeInfo) {
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
