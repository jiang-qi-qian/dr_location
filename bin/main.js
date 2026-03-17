// dr_location 工具 - 主入口文件
// 使用方式: sdb -f bin/main.js -e "var mode = 'show'; ..."

// 在文件开头加载配置文件
import('../config/config.js');

// 全局 db 和 dc 对象
var db = null;
var dc = null;

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

// 连接到 SequoiaDB
function connectToSdb() {
    var sdb_cmd = "sdb";

    // 设置连接参数（使用全局变量）
    if (sdbCipherFile && new File(sdbCipherFile).exists()) {
        var cipherUser = CipherUser(sdbUser);
        cipherUser.cipherFile(sdbCipherFile);
        sdb = new Sdb(sdbCoord.split(':')[0], parseInt(sdbCoord.split(':')[1] || '11810'), cipherUser);
    } else {
        sdb = new Sdb(sdbCoord.split(':')[0], parseInt(sdbCoord.split(':')[1] || '11810'), sdbUser, sdbPassword);
    }

    // 检查连接是否成功
    try {
        // 获取全局 db 和 dc 对象
        db = sdb;
        dc = sdb.getDC();

        // 测试连接
        db.getCS("SYSCat").getCL("$CMD", {}, {});

        return true;
    } catch (e) {
        return false;
    }
}

// 断开连接
function disconnectFromSdb() {
    // sdb 客户端自动管理连接
    return true;
}

// 获取当前时间戳
function getCurrentTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();

    return year + "-" +
           String(month).padStart(2, '0') + "-" +
           String(day).padStart(2, '0') + "-" +
           String(hour).padStart(2, '0') + "." +
           String(minute).padStart(2, '0') + "." +
           String(second).padStart(2, '0');
}

// 获取 Location 分析结果
function analyzeLocation(locationFile) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        dc.locationAnalyze({}, locationFile);
        disconnectFromSdb();
        return true;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 获取 Location 分析结果（不保存到文件）
function analyzeLocationToObj() {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        var result = dc.locationAnalyze({}, null);
        disconnectFromSdb();
        return result;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 获取当前 GroupMode 信息
function getGroupModeInfo() {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        var modes = [];
        var cursor = db.list(SDB_LIST_GROUPMODES);
        while (cursor.next()) {
            var modeObj = cursor.current().toObj();
            modes.push({
                GroupName: modeObj.GroupName,
                GroupMode: modeObj.GroupMode || "",
                UpdateTime: modeObj.UpdateTime || "",
                MaxTime: modeObj.MaxTime || "",
                MinTime: modeObj.MinTime || ""
            });
        }
        cursor.close();
        disconnectFromSdb();
        return modes;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 启动 MaintenanceMode
function startMaintenanceMode(options) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        dc.startMaintenanceMode(options);
        disconnectFromSdb();
        return true;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 停止 MaintenanceMode
function stopMaintenanceMode(options) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        dc.stopMaintenanceMode(options);
        disconnectFromSdb();
        return true;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 启动 CriticalMode
function startCriticalMode(options) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        dc.startCriticalMode(options);
        disconnectFromSdb();
        return true;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 停止 CriticalMode
function stopCriticalMode(options) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        dc.stopCriticalMode(options);
        disconnectFromSdb();
        return true;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 检查节点状态
function checkNodes(mode) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        var hasError = false;

        if (mode === "maintenance") {
            var filter = { GroupMode: "maintenance" };
        } else {
            var filter = { GroupMode: "critical" };
        }

        var cursor = db.list(SDB_LIST_GROUPMODES, filter);
        while (cursor.next()) {
            var modeObj = cursor.current().toObj();
            var groupName = modeObj.GroupName;

            var groupInfo = db.snapshot(SDB_SNAP_CONFIGS, { Name: groupName });
            if (groupInfo) {
                var groupObj = groupInfo.toObj();
                if (groupObj.Group) {
                    for (var i = 0; i < groupObj.Group.length; i++) {
                        var nodeObj = groupObj.Group[i];
                        if (nodeObj.Status && nodeObj.Status !== "OK") {
                            hasError = true;
                            print("  ✗ " + nodeObj.NodeName + ": " + nodeObj.Status);
                        }
                    }
                }
            }
        }
        cursor.close();
        disconnectFromSdb();

        return !hasError;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 关闭所有 MaintenanceMode
function stopAllMaintenanceMode() {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        var modes = getGroupModeInfo();
        var count = 0;

        for (var i = 0; i < modes.length; i++) {
            if (modes[i].GroupMode === "maintenance") {
                print("Disabling MaintenanceMode for group: " + modes[i].GroupName);
                dc.stopMaintenanceMode({ GroupName: modes[i].GroupName });
                count++;
            }
        }

        disconnectFromSdb();
        return count > 0;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 关闭所有 CriticalMode
function stopAllCriticalMode() {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        var modes = getGroupModeInfo();
        var count = 0;

        for (var i = 0; i < modes.length; i++) {
            if (modes[i].GroupMode === "critical") {
                print("Disabling CriticalMode for group: " + modes[i].GroupName);
                dc.stopCriticalMode({ GroupName: modes[i].GroupName });
                count++;
            }
        }

        disconnectFromSdb();
        return count > 0;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 检查集群健康状态
function checkClusterHealth() {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        var totalGroups = 0;
        var cursor = db.snapshot(SDB_SNAP_CONFIGS, { Type: "group" });
        while (cursor.next()) {
            totalGroups++;
        }
        cursor.close();

        print("Found " + totalGroups + " groups in the cluster");

        // 检查异常节点
        var cursor = db.snapshot(SDB_SNAP_CONFIGS, { Type: "group" });
        while (cursor.next()) {
            var obj = cursor.current().toObj();
            for (var i = 0; i < obj.Group.length; i++) {
                var node = obj.Group[i];
                if (node.Status && node.Status !== "OK") {
                    cursor.close();
                    disconnectFromSdb();
                    return false;
                }
            }
        }
        cursor.close();
        disconnectFromSdb();

        return true;
    } catch (e) {
        disconnectFromSdb();
        throw e;
    }
}

// 格式化持续时间
function formatDuration(minutes) {
    if (minutes === null || minutes === undefined) {
        return "";
    }
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    return String(hours).padStart(2, '0') + ":" + String(mins).padStart(2, '0');
}

// 格式化时间戳为秒级
function formatTimestampToSeconds(timestamp) {
    if (typeof timestamp === "string") {
        var parts = timestamp.split("-");
        if (parts.length >= 3) {
            return parts[0] + "-" +
                   String(parts[1]).padStart(2, '0') + "-" +
                   String(parts[2]).padStart(2, '0') + " " +
                   String(parts[3]).padStart(2, '0') + ":" +
                   String(parts[4]).padStart(2, '0') + ":" +
                   String(parts[5]).padStart(2, '0');
        }
    }
    return timestamp;
}

// 打印表格标题
function printTableHeader(headers, rowLength) {
    var headerLine = "|";
    for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        var padding = Math.floor((rowLength - header.length) / 2);
        headerLine += " " + " ".repeat(padding) + header + " ".repeat(padding + 1);
    }
    headerLine += "|";
    print(headerLine);

    var separatorLine = "|";
    for (var i = 0; i < headers.length; i++) {
        separatorLine += " " + "-".repeat(rowLength) + " ";
    }
    separatorLine += "|";
    print(separatorLine);
}

// 打印表格行
function printTableRow(row, rowLength) {
    var line = "|";
    for (var i = 0; i < row.length; i++) {
        var cell = row[i];
        var padding = Math.floor((rowLength - cell.length) / 2);
        line += " " + " ".repeat(padding) + cell + " ".repeat(padding + 1);
    }
    line += "|";
    print(line);
}

// 打印 Location 信息表格
function printLocationInfo(locationInfo, groupModeInfo) {
    var locations = [];
    for (var i = 0; i < locationInfo.length; i++) {
        locations.push(locationInfo[i].LocationName);
    }
    locations.sort();

    if (locations.length === 0) {
        print("No locations configured.");
        return;
    }

    var maxLocNameLen = 0;
    for (var i = 0; i < locations.length; i++) {
        if (locations[i].length > maxLocNameLen) {
            maxLocNameLen = locations[i].length;
        }
    }
    var rowLength = maxLocNameLen + 8;

    printTableHeader(["Location", "Status"], rowLength);

    for (var i = 0; i < locations.length; i++) {
        var locName = locations[i];
        var isActive = false;
        var groupStatus = "";

        for (var j = 0; j < locationInfo.length; j++) {
            if (locationInfo[j].LocationName === locName) {
                isActive = (locationInfo[j].ActiveStatus === "All");
                groupStatus = locationInfo[j].GroupStatus;
                break;
            }
        }

        var statusStr = locName;
        if (isActive) {
            statusStr += "(active)";
        }

        var modeStr = "";
        if (groupStatus !== "") {
            modeStr = "[" + groupStatus + "]";
        }

        printTableRow([statusStr, modeStr], rowLength);
    }
}

// 打印 GroupMode 信息表格
function printGroupModeInfo(groupModeInfo, maxKeepTime) {
    if (groupModeInfo.length === 0) {
        print("No GroupMode information available.");
        return;
    }

    var maxGroupNameLen = 0;
    for (var i = 0; i < groupModeInfo.length; i++) {
        var nameLen = groupModeInfo[i].GroupName.length;
        if (nameLen > maxGroupNameLen) {
            maxGroupNameLen = nameLen;
        }
    }

    var headers = ["Group", "Mode", "Start Time", "Duration (min)", "Remaining (min)", "Max End Time"];
    var rowLength = maxGroupNameLen + 25;

    printTableHeader(headers, rowLength);

    for (var i = 0; i < groupModeInfo.length; i++) {
        var modeInfo = groupModeInfo[i];
        var mode = modeInfo.GroupMode || "";
        var startTime = modeInfo.UpdateTime || "";
        var duration = calculateDurationMinutes(startTime);
        var remaining = calculateRemainingMinutes(startTime, maxKeepTime);
        var maxEndTime = startTime;
        if (maxKeepTime !== null && maxKeepTime !== undefined) {
            var maxEnd = new Date(formatTimestampToSeconds(startTime));
            maxEnd.setMinutes(maxEnd.getMinutes() + maxKeepTime);
            maxEndTime = formatTimestampToSeconds(maxEnd);
        }

        printTableRow([
            modeInfo.GroupName,
            mode,
            formatTimestampToSeconds(startTime),
            duration,
            remaining,
            formatTimestampToSeconds(maxEndTime)
        ], rowLength);
    }
}

// 计算持续时间（分钟）
function calculateDurationMinutes(startTime) {
    if (!startTime) {
        return null;
    }
    var start = new Date(formatTimestampToSeconds(startTime));
    var now = new Date();
    var diffMs = now - start;
    var diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins;
}

// 计算剩余时间（分钟）
function calculateRemainingMinutes(startTime, maxKeepTime) {
    if (!startTime || maxKeepTime === null || maxKeepTime === undefined) {
        return null;
    }
    var start = new Date(formatTimestampToSeconds(startTime));
    var end = new Date(start.getTime() + maxKeepTime * 60 * 1000);
    var now = new Date();
    var diffMs = end - now;
    var diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins;
}

// 打印完整的 Location 分析结果
function printLocationAnalyzeResult(locationFile, groupModeInfo, maxKeepTime) {
    print("\n" + "=".repeat(60));
    print("Location Analysis Result - " + getCurrentTimestamp());
    print("=".repeat(60));

    // 读取分析结果
    var resultFile = new File(locationFile);
    if (!resultFile.exists()) {
        print("Error: Location file not found: " + locationFile);
        return;
    }

    var resultContent = resultFile.read();
    resultFile.close();

    // 解析 JSON
    var result = JSON.parse(resultContent);

    print("\n[Location Info]");
    printLocationInfo(result.LocationInfo, groupModeInfo);

    if (groupModeInfo && groupModeInfo.length > 0) {
        print("\n[Mode Info]");
        printGroupModeInfo(groupModeInfo, maxKeepTime);
    }

    printExceptionInfo(result.ExceptionHostInfo);
    printExceptionInfo(result.ExceptionGroupInfo);

    print("\n[Summary]");
    print("  Matched Host Num:  " + result.MatchedHostNum);
    print("  Matched Group Num: " + result.MatchedGroupNum);
    print("  Matched Node Num:  " + result.MatchedNodeNum);
    print("  Active Location:   " + (result.ActiveLocation ? result.ActiveLocation : "Not configured"));

    print("\n" + "=".repeat(60));
}

// 打印异常信息
function printExceptionInfo(exceptionInfo) {
    if (!exceptionInfo) {
        return;
    }

    // 打印异常主机
    if (exceptionInfo.NoLocationHost && exceptionInfo.NoLocationHost.length > 0) {
        print("\n[ExceptionHostInfo] No Location Hosts:");
        var headers = ["Host", "Issue"];
        var rowLength = 40;
        printTableHeader(headers, rowLength);
        for (var i = 0; i < exceptionInfo.NoLocationHost.length; i++) {
            printTableRow([exceptionInfo.NoLocationHost[i], "No location configured"], rowLength);
        }
    }

    if (exceptionInfo.PartialLocationHost && exceptionInfo.PartialLocationHost.length > 0) {
        print("\n[ExceptionHostInfo] Partial Location Hosts:");
        var headers = ["Host", "Issue"];
        var rowLength = 40;
        printTableHeader(headers, rowLength);
        for (var i = 0; i < exceptionInfo.PartialLocationHost.length; i++) {
            printTableRow([exceptionInfo.PartialLocationHost[i], "Mixed location nodes"], rowLength);
        }
    }

    if (exceptionInfo.MultiLocationHost && exceptionInfo.MultiLocationHost.length > 0) {
        print("\n[ExceptionHostInfo] Multi Location Hosts:");
        var headers = ["Host", "Issue"];
        var rowLength = 40;
        printTableHeader(headers, rowLength);
        for (var i = 0; i < exceptionInfo.MultiLocationHost.length; i++) {
            printTableRow([exceptionInfo.MultiLocationHost[i], "Nodes in multiple locations"], rowLength);
        }
    }

    // 打印异常组
    if (exceptionInfo.NoLocationGroup && exceptionInfo.NoLocationGroup.length > 0) {
        print("\n[ExceptionGroupInfo] No Location Groups:");
        var headers = ["Group", "Issue"];
        var rowLength = 40;
        printTableHeader(headers, rowLength);
        for (var i = 0; i < exceptionInfo.NoLocationGroup.length; i++) {
            printTableRow([exceptionInfo.NoLocationGroup[i], "No location configured"], rowLength);
        }
    }

    if (exceptionInfo.PartialLocationGroup && exceptionInfo.PartialLocationGroup.length > 0) {
        print("\n[ExceptionGroupInfo] Partial Location Groups:");
        var headers = ["Group", "Issue"];
        var rowLength = 40;
        printTableHeader(headers, rowLength);
        for (var i = 0; i < exceptionInfo.PartialLocationGroup.length; i++) {
            printTableRow([exceptionInfo.PartialLocationGroup[i], "Mixed location nodes"], rowLength);
        }
    }

    if (exceptionInfo.OneLocationGroup && exceptionInfo.OneLocationGroup.length > 0) {
        print("\n[ExceptionGroupInfo] One Location Groups:");
        var headers = ["Group", "Issue"];
        var rowLength = 40;
        printTableHeader(headers, rowLength);
        for (var i = 0; i < exceptionInfo.OneLocationGroup.length; i++) {
            printTableRow([exceptionInfo.OneLocationGroup[i], "Single location configured"], rowLength);
        }
    }
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

        // 配置文件中的变量已通过 import 直接导入到全局作用域
        return true;
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

    var locationFile = nodeInfo ? (projectRoot + "/output/location.txt") : file;
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

    var locationFile = nodeInfo ? (projectRoot + "/output/location.txt") : file;
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

    var locations = initLocationObject;
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

    if (activeLocation && activeLocation !== "") {
        print("Setting active location: " + activeLocation);
        dc.setActiveLocation(activeLocation);
    }
}

// 执行 start_maintenance 命令
function executeStartMaintenance() {
    var nodeInfo = readNodeFile(file);

    if (location && nodeInfo) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            dc.startMaintenanceMode({
                Location: nodeInfo.locations[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
        }
    }
    if (hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.startMaintenanceMode({
                Hostname: nodeInfo.hostnames[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
        }
    }
    if (nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.startMaintenanceMode({
                NodeName: nodeInfo.nodenames[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
        }
    }
    if (domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.startMaintenanceMode({
                Domain: nodeInfo.domains[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
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
            dc.startCriticalMode({
                Location: nodeInfo.locations[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
        }
    }
    if (hostnames && nodeInfo) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            dc.startCriticalMode({
                Hostname: nodeInfo.hostnames[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
        }
    }
    if (nodenames && nodeInfo) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            dc.startCriticalMode({
                NodeName: nodeInfo.nodenames[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
        }
    }
    if (domains && nodeInfo) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            dc.startCriticalMode({
                Domain: nodeInfo.domains[i],
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
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
