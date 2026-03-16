// dr_location 工具库 - 核心逻辑层
// ====================

var lib = {};

// 全局配置
var config = {
    coordHost: "localhost:11810",
    user: "sdbadmin",
    password: "sdbadmin",
    cipherFile: null,
    initLocationObject: {},
    activeLocation: "",
    reelectLevel: "0|1|2",
    minKeepTime: 100,
    maxKeepTime: 1000,
    enforceMaintenance: true,
    enforceCritical: false
};

// 连接到 SequoiaDB
function connectToSdb() {
    var sdb_cmd = "sdb";

    // 设置连接参数
    if (config.cipherFile && new File(config.cipherFile).exists()) {
        sdb_cmd = sdb_cmd + " -i " + config.cipherFile + " -u " + config.user + " -p ''";
    } else {
        sdb_cmd = sdb_cmd + " -u " + config.user + " -p '" + config.password + "'";
    }

    sdb_cmd = sdb_cmd + " -s " + config.coordHost;

    // 执行连接命令
    var result = new File("/dev/null");
    var error = new File("/dev/stderr");
    system(sdb_cmd, result, error);

    return (result.read() !== "");
}

// 断开连接
function disconnectFromSdb() {
    // sdb 客户端自动管理连接
    return true;
}

// 读取配置文件
function loadConfig(configFile) {
    var file = new File(configFile);
    if (!file.exists()) {
        throw new Error("Config file not found: " + configFile);
    }

    var content = file.read();
    file.close();

    // 使用 Function 构造函数来读取配置文件中的变量
    try {
        // 提取所有赋值语句
        var vars = content.match(/\b(\w+)\s*=\s*(.+?);?$/gm);

        if (vars) {
            for (var i = 0; i < vars.length; i++) {
                var match = vars[i].match(/(\w+)\s*=\s*(.+?);?$/);
                if (match) {
                    var varName = match[1];
                    var varValue = match[2].trim();

                    // 尝试解析为 JSON 对象
                    try {
                        if (varValue.startsWith("{") && varValue.endsWith("}")) {
                            config[varName] = JSON.parse(varValue);
                        } else {
                            config[varName] = varValue;
                        }
                    } catch (e) {
                        config[varName] = varValue;
                    }
                }
            }
        }
    } catch (e) {
        throw new Error("Failed to parse config file: " + e.message);
    }
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

// 初始化 Location 配置
function initLocation() {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        if (Object.keys(config.initLocationObject).length === 0) {
            throw new Error("initLocationObject is not configured in config.js");
        }

        // 遍历每个 Location
        for (var location in config.initLocationObject) {
            var hosts = config.initLocationObject[location];

            if (Array.isArray(hosts) && hosts.length > 0) {
                var first_host = hosts[0];
                print("Setting location for host: " + first_host + " -> " + location);

                try {
                    dc.setLocation(first_host, location);
                } catch (e) {
                    print("Warning: Failed to set location for " + first_host + ": " + e.message);
                }
            }
        }

        // 设置 ActiveLocation
        if (config.activeLocation && config.activeLocation !== "") {
            print("Setting active location: " + config.activeLocation);
            dc.setActiveLocation(config.activeLocation);
        }

        disconnectFromSdb();
        return true;
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

// 导出 API
lib.connectToSdb = connectToSdb;
lib.disconnectFromSdb = disconnectFromSdb;
lib.loadConfig = loadConfig;
lib.analyzeLocation = analyzeLocation;
lib.analyzeLocationToObj = analyzeLocationToObj;
lib.initLocation = initLocation;
lib.getGroupModeInfo = getGroupModeInfo;
lib.startMaintenanceMode = startMaintenanceMode;
lib.stopMaintenanceMode = stopMaintenanceMode;
lib.startCriticalMode = startCriticalMode;
lib.stopCriticalMode = stopCriticalMode;
lib.checkNodes = checkNodes;
lib.stopAllMaintenanceMode = stopAllMaintenanceMode;
lib.stopAllCriticalMode = stopAllCriticalMode;
lib.checkClusterHealth = checkClusterHealth;
lib.printLocationAnalyzeResult = printLocationAnalyzeResult;
lib.printTableHeader = printTableHeader;
lib.printLocationInfo = printLocationInfo;
lib.printGroupModeInfo = printGroupModeInfo;
lib.printExceptionInfo = printExceptionInfo;

print("lib.js loaded successfully");
