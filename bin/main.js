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
    // 如果已经连接，直接返回
    if (db !== null) {
        return true;
    }

    // 检查连接是否成功
    try {
        // 设置连接参数（使用全局变量）
        if (sdbCipherFile && new File(sdbCipherFile).exist()) {
            var cipherUser = CipherUser(sdbUser);
            cipherUser.cipherFile(sdbCipherFile);
            db = new Sdb(sdbCoord.split(':')[0], parseInt(sdbCoord.split(':')[1] || '11810'), cipherUser);
        } else {
            db = new Sdb(sdbCoord.split(':')[0], parseInt(sdbCoord.split(':')[1] || '11810'), sdbUser, sdbPassword);
        }
        // 获取全局 db 和 dc 对象
        dc = db.getDC();

        return true;
    } catch (e) {
        db = null;
        dc = null;
        print("Error connecting to SequoiaDB: " + e.message);
        return false;
    }
}

// 断开连接
function disconnectFromSdb() {
    // 清空全局对象
    db = null;
    dc = null;
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

    var pad = function(num) {
        return String(num).length < 2 ? '0' + String(num) : String(num);
    };
    return year + "-" +
           pad(month) + "-" +
           pad(day) + "-" +
           pad(hour) + "." +
           pad(minute) + "." +
           pad(second);
}

// 重复字符串辅助函数
var repeatStr = function(str, count) {
    var result = "";
    for (var i = 0; i < count; i++) {
        result += str;
    }
    return result;
};

// 常量：重复的等号，用于分隔线
var separator = repeatStr("=", 20);

// 获取 Location 分析结果
function analyzeLocation(locationFile) {
    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    try {
        dc.locationAnalyze({}, locationFile);
        return true;
    } catch (e) {
        print("Error in location analyze: " + e.message);
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
        return result;
    } catch (e) {
        print("Error in location analyze: " + e.message);
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
        return modes;
    } catch (e) {
        print("Error getting group mode info: " + e.message);
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

            var option = new SdbSnapshotOption().options({IgnoreDefault:true,ShowRunStatus:true});
            var groupInfo = db.snapshot(SDB_SNAP_CONFIGS, option.cond({Name: groupName}));
            if (groupInfo) {
                var groupObj = groupInfo.toObj();
                if (groupObj.Group) {
                    for (var i = 0; i < groupObj.Group.length; i++) {
                        var nodeObj = groupObj.Group[i];

                        // 检查节点状态
                        if (nodeObj.Status && nodeObj.Status !== "OK") {
                            hasError = true;
                            print("\n  ✗ " + nodeObj.NodeName + ": " + nodeObj.Status);
                        }

                        // 显示运行状态信息（如果有）
                        if (nodeObj.RunStatusWeightDesp) {
                            print("    - " + nodeObj.NodeName + " RunStatusWeightDesp: " + nodeObj.RunStatusWeightDesp + ", RunStatusWeight: " + nodeObj.RunStatusWeight);
                        }
                    }
                }
            }
        }
        cursor.close();

        return !hasError;
    } catch (e) {
        print("Error checking nodes: " + e.message);
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
                print("\nDisabling MaintenanceMode for group: " + modes[i].GroupName);
                dc.stopMaintenanceMode({ GroupName: modes[i].GroupName });
                count++;
            }
        }

        return count > 0;
    } catch (e) {
        print("Error stopping all maintenance modes: " + e.message);
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
                print("\nDisabling CriticalMode for group: " + modes[i].GroupName);
                dc.stopCriticalMode({ GroupName: modes[i].GroupName });
                count++;
            }
        }

        return count > 0;
    } catch (e) {
        print("Error stopping all critical modes: " + e.message);
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

        print("\nFound " + totalGroups + " groups in the cluster\n");

        // 检查异常节点
        var cursor = db.snapshot(SDB_SNAP_CONFIGS, { Type: "group" });
        while (cursor.next()) {
            var obj = cursor.current().toObj();
            for (var i = 0; i < obj.Group.length; i++) {
                var node = obj.Group[i];
                if (node.Status && node.Status !== "OK") {
                    cursor.close();
                    return false;
                }
            }
        }
        cursor.close();

        return true;
    } catch (e) {
        print("Error checking cluster health: " + e.message);
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
    var pad = function(num) {
        return String(num).length < 2 ? '0' + String(num) : String(num);
    };
    return pad(hours) + ":" + pad(mins);
}

// 格式化时间戳为秒级
function formatTimestampToSeconds(timestamp) {
    if (typeof timestamp === "string") {
        var parts = timestamp.split("-");
        if (parts.length >= 3) {
            var pad = function(num) {
                return String(num).length < 2 ? '0' + String(num) : String(num);
            };
            return parts[0] + "-" +
                   pad(parts[1]) + "-" +
                   pad(parts[2]) + " " +
                   pad(parts[3]) + ":" +
                   pad(parts[4]) + ":" +
                   pad(parts[5]);
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
        print("\nNo locations configured.");
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
        print("\nNo GroupMode information available.");
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
    print("\n" + separator);
    print("Location Analysis Result - " + getCurrentTimestamp());
    print(separator);
    print("\n");

    // 读取分析结果
    var resultFile = new File(locationFile);
    if (!resultFile.exist()) {
        print("\nError: Location file not found: " + locationFile);
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
    print("\n");

    print("\n" + separator);
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
            if (typeof requiredVars[i] === 'undefined') {
                missingVars.push(requiredVars[i]);
            }
        }

        if (missingVars.length > 0) {
            print("Error: Missing required config variables: " + missingVars.join(', '));
            throw new Error("Missing required config variables: " + missingVars.join(', '));
        }

        // 配置文件中的变量已通过 import 直接导入到全局作用域
        return true;
    } catch (e) {
        print("Error: Failed to load config: " + e.message);
        throw new Error("Failed to load config: " + e.message);
    }
}

// 读取节点信息文件
function readNodeFile(filePath) {
    if (!filePath) {
        return null;
    }

    var file = new File(filePath);
    if (!file.exist()) {
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
    try {
        print("=" + separator);
        print("SequoiaDB Location Disaster Recovery Tool");
        print("=" + separator);
        print();

        // 参数验证
        if (!validateMode()) {
            return;
        }

        // 加载配置
        loadConfig();

        // 执行对应命令
        // 参数通过 sdb -e 传入后直接在全局作用域可用
        // 先验证所有参数
        validateParameters();

        switch (mode) {
            case 'show':
                executeShow();
                break;
            case 'check':
                executeCheck();
                break;
            case 'init':
                executeInit();
                break;
            case 'start_maintenance':
                executeStartMaintenance();
                break;
            case 'stop_maintenance':
                executeStopMaintenance();
                break;
            case 'start_critical':
                executeStartCritical();
                break;
            case 'stop_critical':
                executeStopCritical();
                break;
            case 'restore':
                executeRestore();
                break;
        }

        print("\n" + separator);
        print("Operation completed successfully");
        print(separator);
        print("\n");
    } catch (e) {
        print("\nError" + "              " + e.message);
        if (e.stack) {
            print("\nStack trace:");
            var stackLines = e.stack.split('\n');
            for (var i = 0; i < stackLines.length; i++) {
                print("\n  " + stackLines[i]);
            }
        }
        print("\n");
    } finally {
        // 统一在函数结束时释放连接
        disconnectFromSdb();
    }
}

// 验证 mode 参数
function validateMode() {
    print("\nCommand: " + mode);

    if (!mode) {
        print("\nError: No command specified");
        print("Please provide a command using: sdb -f bin/main.js -e \"var mode='command'\"");
        return false;
    }

    var validModes = [
        'show', 'check', 'init', 'start_maintenance', 'stop_maintenance',
        'start_critical', 'stop_critical', 'restore'
    ];

    if (-1 == validModes.indexOf(mode)) {
        print("\nError: Unknown mode: " + mode);
        print("Available modes: " + validModes.join(', '));
        return false;
    }

    return true;
}

// 验证所有参数
function validateParameters() {
    print("\nValidating parameters...");
    var errors = [];

    // 检查必需的参数
    switch (mode) {
        case 'show':
        case 'check':
        case 'init':
        case 'restore':
            // 这些命令不需要 file 参数
            break;

        case 'start_maintenance':
        case 'stop_maintenance':
        case 'start_critical':
        case 'stop_critical':
            // 如果提供了 file 参数，验证文件是否存在
            if (file && file !== "") {
                var nodeInfo = readNodeFile(file);
                if (!nodeInfo) {
                    errors.push("Node information file not found or invalid: " + file);
                }
            }
            break;
    }

    // 检查 location 参数（用于 stop_maintenance 和 stop_critical 的 --check 选项）
    if (typeof check === 'undefined') {
        // 如果 check 未定义，默认值为 0（不检查）
        check = 0;
    }

    // 检查 check 参数是否为有效值
    if (check !== undefined && check !== "" && check !== null) {
        if (typeof check !== 'number' && typeof check !== 'boolean') {
            errors.push("check parameter must be a number (1 or 0) or boolean");
        } else if (check !== 0 && check !== 1 && check !== true && check !== false) {
            errors.push("check parameter must be 0, 1, true, or false");
        }
    }

    if (errors.length > 0) {
        print("\nParameter validation errors:");
        for (var i = 0; i < errors.length; i++) {
            print("  - " + errors[i]);
        }
        throw new Error("Invalid parameters");
    }

    print("\nParameters are valid");
    return true;
}

// 显示当前参数信息
function printParameterInfo() {
    print("\n" + separator);
    print("Execution Parameters");
    print(separator);
    print("  Mode:        " + mode);
    print("  Config File: " + (c ? c : "not specified"));
    print("  Project Root:" + (projectRoot ? projectRoot : "not specified"));
    print("  File:        " + (file ? file : "not specified"));
    print("  Location:    " + (l ? l : "not specified"));
    print("  Hostnames:   " + (H ? H : "not specified"));
    print("  Nodenames:   " + (n ? n : "not specified"));
    print("  Domains:     " + (d ? d : "not specified"));
    print("  Check:       " + check);
    print(separator);
}

// 执行 show 命令
function executeShow() {
    printParameterInfo();
    print("\nExecuting show command...");

    var nodeInfo = readNodeFile(file);

    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    var locationFile = nodeInfo ? (projectRoot + "/output/location.txt") : file;
    print("\nRunning location analysis...");
    dc.locationAnalyze({}, locationFile);

    print("\n" + separator);
    print("Location Information");
    print(separator);

    var displayFile = new File(locationFile);
    if (displayFile.exist()) {
        print(displayFile.read());
        displayFile.close();
        print("\n");
    } else {
        print("\nWarning: Location file not found: " + locationFile);
    }

    print("\n" + separator);
    print("Analysis completed successfully");
    print(separator);
}

// 执行 check 命令
function executeCheck() {
    printParameterInfo();
    print("\nExecuting check command...");

    var nodeInfo = readNodeFile(file);

    if (!connectToSdb()) {
        throw new Error("Failed to connect to SequoiaDB");
    }

    var locationFile = nodeInfo ? (projectRoot + "/output/location.txt") : file;
    print("\nRunning location analysis...");
    dc.locationAnalyze({}, locationFile);

    print("\n" + separator);
    print("Location Check Results");
    print(separator);

    var displayFile = new File(locationFile);
    if (displayFile.exist()) {
        print(displayFile.read());
        displayFile.close();

        // 读取配置文件中的期望Location
        if (initLocationObject) {
            print("\n" + separator);
            print("Expected Locations from Config File");
            print(separator);
            print(JSON.stringify(initLocationObject, null, 2));
        }
    } else {
        print("\nWarning: Location file not found: " + locationFile);
    }

    print("\n" + separator);
    print("Check completed successfully");
    print(separator);
}

// 执行 init 命令
function executeInit() {
    printParameterInfo();
    print("\nExecuting init command...");

    var locations = initLocationObject;
    if (!locations || Object.keys(locations).length === 0) {
        throw new Error("initLocationObject is not configured in config.js");
    }

    print("\nConfiguration Summary:");
    print("  Total Locations: " + Object.keys(locations).length);
    for (var location in locations) {
        var hosts = locations[location];
        print("    - " + location + ": " + hosts.length + " host(s)");
    }

    if (activeLocation && activeLocation !== "") {
        print("  Active Location: " + activeLocation);
    } else {
        print("  Active Location: Not set");
    }

    print("\nInitializing location configuration...");

    var count = 0;
    for (var location in locations) {
        var hosts = locations[location];
        if (Array.isArray(hosts) && hosts.length > 0) {
            var firstHost = hosts[0];
            print("\n  Setting location for host " + firstHost + " -> " + location);

            try {
                dc.setLocation(firstHost, location);
                count++;
            } catch (e) {
                print("  Warning: Failed to set location for " + firstHost + ": " + e.message);
            }
        }
    }

    if (count > 0) {
        print("\n" + separator);
        print("Successfully set locations for " + count + " host(s)");
        print(separator);

        if (activeLocation && activeLocation !== "") {
            print("\nSetting active location: " + activeLocation);
            try {
                dc.setActiveLocation(activeLocation);
                print("\nActive location set successfully: " + activeLocation);
            } catch (e) {
                print("\nWarning: Failed to set active location: " + e.message);
            }
        }
    } else {
        throw new Error("No locations were set");
    }

    print("\nInitialization completed successfully");
}

// 执行 start_maintenance 命令
function executeStartMaintenance() {
    printParameterInfo();
    print("\nExecuting start_maintenance command...");

    print("\nConfiguration:");
    print("  MinKeepTime: " + minKeepTime + " minutes");
    print("  MaxKeepTime: " + maxKeepTime + " minutes");
    print("  Enforce: " + enforceMaintenance);

    var nodeInfo = readNodeFile(file);

    var locationsCount = 0;
    var hostnamesCount = 0;
    var nodenamesCount = 0;
    var domainsCount = 0;

    if (nodeInfo && nodeInfo.locations && nodeInfo.locations.length > 0) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            var loc = nodeInfo.locations[i];
            print("\n  Starting MaintenanceMode for Location: " + loc);
            try {
                dc.startMaintenanceMode({
                    Location: loc,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                locationsCount++;
            } catch (e) {
                print("  Warning: Failed to start MaintenanceMode for location " + loc + ": " + e.message);
            }
        }
    } else if (location) {
        print("\n  Starting MaintenanceMode for Location: " + location);
        try {
            dc.startMaintenanceMode({
                Location: location,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            locationsCount++;
        } catch (e) {
            print("  Warning: Failed to start MaintenanceMode for location " + location + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.hostnames && nodeInfo.hostnames.length > 0) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            var host = nodeInfo.hostnames[i];
            print("\n  Starting MaintenanceMode for Host: " + host);
            try {
                dc.startMaintenanceMode({
                    Hostname: host,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                hostnamesCount++;
            } catch (e) {
                print("  Warning: Failed to start MaintenanceMode for host " + host + ": " + e.message);
            }
        }
    } else if (hostnames) {
        print("\n  Starting MaintenanceMode for Host: " + hostnames);
        try {
            dc.startMaintenanceMode({
                Hostname: hostnames,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            hostnamesCount++;
        } catch (e) {
            print("  Warning: Failed to start MaintenanceMode for host " + hostnames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.nodenames && nodeInfo.nodenames.length > 0) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            var node = nodeInfo.nodenames[i];
            print("\n  Starting MaintenanceMode for Node: " + node);
            try {
                dc.startMaintenanceMode({
                    NodeName: node,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                nodenamesCount++;
            } catch (e) {
                print("  Warning: Failed to start MaintenanceMode for node " + node + ": " + e.message);
            }
        }
    } else if (nodenames) {
        print("\n  Starting MaintenanceMode for Node: " + nodenames);
        try {
            dc.startMaintenanceMode({
                NodeName: nodenames,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            nodenamesCount++;
        } catch (e) {
            print("  Warning: Failed to start MaintenanceMode for node " + nodenames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.domains && nodeInfo.domains.length > 0) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            var domain = nodeInfo.domains[i];
            print("\n  Starting MaintenanceMode for Domain: " + domain);
            try {
                dc.startMaintenanceMode({
                    Domain: domain,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                domainsCount++;
            } catch (e) {
                print("  Warning: Failed to start MaintenanceMode for domain " + domain + ": " + e.message);
            }
        }
    } else if (domains) {
        print("\n  Starting MaintenanceMode for Domain: " + domains);
        try {
            dc.startMaintenanceMode({
                Domain: domains,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            domainsCount++;
        } catch (e) {
            print("  Warning: Failed to start MaintenanceMode for domain " + domains + ": " + e.message);
        }
    }

    print("\n" + separator);
    print("MaintenanceMode Started");
    print(separator);
    print("  Locations:  " + locationsCount);
    print("  Hostnames:  " + hostnamesCount);
    print("  Nodenames:  " + nodenamesCount);
    print("  Domains:    " + domainsCount);
    print("  Total:      " + (locationsCount + hostnamesCount + nodenamesCount + domainsCount));
    print(separator);
}

// 执行 stop_maintenance 命令
function executeStopMaintenance() {
    printParameterInfo();
    print("\nExecuting stop_maintenance command...");

    var nodeInfo = readNodeFile(file);

    var locationsCount = 0;
    var hostnamesCount = 0;
    var nodenamesCount = 0;
    var domainsCount = 0;

    // 检查节点状态（如果指定了 --check）
    if (check) {
        print("\nChecking node status before stopping MaintenanceMode...");
        print("Mode: maintenance");
        if (!checkNodes("maintenance")) {
            print("\n" + separator);
            print("Error: Some nodes are not OK, cannot stop MaintenanceMode");
            print(separator);
            throw new Error("Some nodes are not OK, cannot stop MaintenanceMode");
        }
        print("Node status check passed - all nodes are OK");
    }

    if (nodeInfo && nodeInfo.locations && nodeInfo.locations.length > 0) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            var loc = nodeInfo.locations[i];
            print("\n  Stopping MaintenanceMode for Location: " + loc);
            try {
                dc.stopMaintenanceMode({ Location: loc });
                locationsCount++;
            } catch (e) {
                print("  Warning: Failed to stop MaintenanceMode for location " + loc + ": " + e.message);
            }
        }
    } else if (location) {
        print("\n  Stopping MaintenanceMode for Location: " + location);
        try {
            dc.stopMaintenanceMode({ Location: location });
            locationsCount++;
        } catch (e) {
            print("  Warning: Failed to stop MaintenanceMode for location " + location + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.hostnames && nodeInfo.hostnames.length > 0) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            var host = nodeInfo.hostnames[i];
            print("\n  Stopping MaintenanceMode for Host: " + host);
            try {
                dc.stopMaintenanceMode({ Hostname: host });
                hostnamesCount++;
            } catch (e) {
                print("  Warning: Failed to stop MaintenanceMode for host " + host + ": " + e.message);
            }
        }
    } else if (hostnames) {
        print("\n  Stopping MaintenanceMode for Host: " + hostnames);
        try {
            dc.stopMaintenanceMode({ Hostname: hostnames });
            hostnamesCount++;
        } catch (e) {
            print("  Warning: Failed to stop MaintenanceMode for host " + hostnames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.nodenames && nodeInfo.nodenames.length > 0) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            var node = nodeInfo.nodenames[i];
            print("\n  Stopping MaintenanceMode for Node: " + node);
            try {
                dc.stopMaintenanceMode({ NodeName: node });
                nodenamesCount++;
            } catch (e) {
                print("  Warning: Failed to stop MaintenanceMode for node " + node + ": " + e.message);
            }
        }
    } else if (nodenames) {
        print("\n  Stopping MaintenanceMode for Node: " + nodenames);
        try {
            dc.stopMaintenanceMode({ NodeName: nodenames });
            nodenamesCount++;
        } catch (e) {
            print("  Warning: Failed to stop MaintenanceMode for node " + nodenames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.domains && nodeInfo.domains.length > 0) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            var domain = nodeInfo.domains[i];
            print("\n  Stopping MaintenanceMode for Domain: " + domain);
            try {
                dc.stopMaintenanceMode({ Domain: domain });
                domainsCount++;
            } catch (e) {
                print("  Warning: Failed to stop MaintenanceMode for domain " + domain + ": " + e.message);
            }
        }
    } else if (domains) {
        print("\n  Stopping MaintenanceMode for Domain: " + domains);
        try {
            dc.stopMaintenanceMode({ Domain: domains });
            domainsCount++;
        } catch (e) {
            print("  Warning: Failed to stop MaintenanceMode for domain " + domains + ": " + e.message);
        }
    }

    print("\n" + separator);
    print("MaintenanceMode Stopped");
    print(separator);
    print("  Locations:  " + locationsCount);
    print("  Hostnames:  " + hostnamesCount);
    print("  Nodenames:  " + nodenamesCount);
    print("  Domains:    " + domainsCount);
    print("  Total:      " + (locationsCount + hostnamesCount + nodenamesCount + domainsCount));
    print(separator);
}

// 执行 start_critical 命令
function executeStartCritical() {
    printParameterInfo();
    print("\nExecuting start_critical command...");

    if (enforceCritical) {
        print("\nWARNING: CriticalMode can cause data rollback and data loss!");
        print("Make sure you understand the risks before proceeding.");
    }

    print("\nConfiguration:");
    print("  MinKeepTime: " + minKeepTime + " minutes");
    print("  MaxKeepTime: " + maxKeepTime + " minutes");
    print("  Enforce: " + enforceCritical);

    var nodeInfo = readNodeFile(file);

    var locationsCount = 0;
    var hostnamesCount = 0;
    var nodenamesCount = 0;
    var domainsCount = 0;

    if (nodeInfo && nodeInfo.locations && nodeInfo.locations.length > 0) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            var loc = nodeInfo.locations[i];
            print("\n  Starting CriticalMode for Location: " + loc);
            try {
                dc.startCriticalMode({
                    Location: loc,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                locationsCount++;
            } catch (e) {
                print("  Warning: Failed to start CriticalMode for location " + loc + ": " + e.message);
            }
        }
    } else if (location) {
        print("\n  Starting CriticalMode for Location: " + location);
        try {
            dc.startCriticalMode({
                Location: location,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            locationsCount++;
        } catch (e) {
            print("  Warning: Failed to start CriticalMode for location " + location + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.hostnames && nodeInfo.hostnames.length > 0) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            var host = nodeInfo.hostnames[i];
            print("\n  Starting CriticalMode for Host: " + host);
            try {
                dc.startCriticalMode({
                    Hostname: host,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                hostnamesCount++;
            } catch (e) {
                print("  Warning: Failed to start CriticalMode for host " + host + ": " + e.message);
            }
        }
    } else if (hostnames) {
        print("\n  Starting CriticalMode for Host: " + hostnames);
        try {
            dc.startCriticalMode({
                Hostname: hostnames,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            hostnamesCount++;
        } catch (e) {
            print("  Warning: Failed to start CriticalMode for host " + hostnames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.nodenames && nodeInfo.nodenames.length > 0) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            var node = nodeInfo.nodenames[i];
            print("\n  Starting CriticalMode for Node: " + node);
            try {
                dc.startCriticalMode({
                    NodeName: node,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                nodenamesCount++;
            } catch (e) {
                print("  Warning: Failed to start CriticalMode for node " + node + ": " + e.message);
            }
        }
    } else if (nodenames) {
        print("\n  Starting CriticalMode for Node: " + nodenames);
        try {
            dc.startCriticalMode({
                NodeName: nodenames,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            nodenamesCount++;
        } catch (e) {
            print("  Warning: Failed to start CriticalMode for node " + nodenames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.domains && nodeInfo.domains.length > 0) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            var domain = nodeInfo.domains[i];
            print("\n  Starting CriticalMode for Domain: " + domain);
            try {
                dc.startCriticalMode({
                    Domain: domain,
                    MinKeepTime: minKeepTime,
                    MaxKeepTime: maxKeepTime
                });
                domainsCount++;
            } catch (e) {
                print("  Warning: Failed to start CriticalMode for domain " + domain + ": " + e.message);
            }
        }
    } else if (domains) {
        print("\n  Starting CriticalMode for Domain: " + domains);
        try {
            dc.startCriticalMode({
                Domain: domains,
                MinKeepTime: minKeepTime,
                MaxKeepTime: maxKeepTime
            });
            domainsCount++;
        } catch (e) {
            print("  Warning: Failed to start CriticalMode for domain " + domains + ": " + e.message);
        }
    }

    print("\n" + separator);
    print("CriticalMode Started");
    print(separator);
    print("  Locations:  " + locationsCount);
    print("  Hostnames:  " + hostnamesCount);
    print("  Nodenames:  " + nodenamesCount);
    print("  Domains:    " + domainsCount);
    print("  Total:      " + (locationsCount + hostnamesCount + nodenamesCount + domainsCount));
    print(separator);
}

// 执行 stop_critical 命令
function executeStopCritical() {
    printParameterInfo();
    print("\nExecuting stop_critical command...");

    var nodeInfo = readNodeFile(file);

    var locationsCount = 0;
    var hostnamesCount = 0;
    var nodenamesCount = 0;
    var domainsCount = 0;

    // 检查节点状态（如果指定了 --check）
    if (check) {
        print("\nChecking node status before stopping CriticalMode...");
        print("Mode: critical");
        if (!checkNodes("critical")) {
            print("\n" + separator);
            print("Error: Some nodes are not OK, cannot stop CriticalMode");
            print(separator);
            throw new Error("Some nodes are not OK, cannot stop CriticalMode");
        }
        print("Node status check passed - all nodes are OK");
    }

    if (nodeInfo && nodeInfo.locations && nodeInfo.locations.length > 0) {
        for (var i = 0; i < nodeInfo.locations.length; i++) {
            var loc = nodeInfo.locations[i];
            print("\n  Stopping CriticalMode for Location: " + loc);
            try {
                dc.stopCriticalMode({ Location: loc });
                locationsCount++;
            } catch (e) {
                print("  Warning: Failed to stop CriticalMode for location " + loc + ": " + e.message);
            }
        }
    } else if (location) {
        print("\n  Stopping CriticalMode for Location: " + location);
        try {
            dc.stopCriticalMode({ Location: location });
            locationsCount++;
        } catch (e) {
            print("  Warning: Failed to stop CriticalMode for location " + location + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.hostnames && nodeInfo.hostnames.length > 0) {
        for (var i = 0; i < nodeInfo.hostnames.length; i++) {
            var host = nodeInfo.hostnames[i];
            print("\n  Stopping CriticalMode for Host: " + host);
            try {
                dc.stopCriticalMode({ Hostname: host });
                hostnamesCount++;
            } catch (e) {
                print("  Warning: Failed to stop CriticalMode for host " + host + ": " + e.message);
            }
        }
    } else if (hostnames) {
        print("\n  Stopping CriticalMode for Host: " + hostnames);
        try {
            dc.stopCriticalMode({ Hostname: hostnames });
            hostnamesCount++;
        } catch (e) {
            print("  Warning: Failed to stop CriticalMode for host " + hostnames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.nodenames && nodeInfo.nodenames.length > 0) {
        for (var i = 0; i < nodeInfo.nodenames.length; i++) {
            var node = nodeInfo.nodenames[i];
            print("\n  Stopping CriticalMode for Node: " + node);
            try {
                dc.stopCriticalMode({ NodeName: node });
                nodenamesCount++;
            } catch (e) {
                print("  Warning: Failed to stop CriticalMode for node " + node + ": " + e.message);
            }
        }
    } else if (nodenames) {
        print("\n  Stopping CriticalMode for Node: " + nodenames);
        try {
            dc.stopCriticalMode({ NodeName: nodenames });
            nodenamesCount++;
        } catch (e) {
            print("  Warning: Failed to stop CriticalMode for node " + nodenames + ": " + e.message);
        }
    }

    if (nodeInfo && nodeInfo.domains && nodeInfo.domains.length > 0) {
        for (var i = 0; i < nodeInfo.domains.length; i++) {
            var domain = nodeInfo.domains[i];
            print("\n  Stopping CriticalMode for Domain: " + domain);
            try {
                dc.stopCriticalMode({ Domain: domain });
                domainsCount++;
            } catch (e) {
                print("  Warning: Failed to stop CriticalMode for domain " + domain + ": " + e.message);
            }
        }
    } else if (domains) {
        print("\n  Stopping CriticalMode for Domain: " + domains);
        try {
            dc.stopCriticalMode({ Domain: domains });
            domainsCount++;
        } catch (e) {
            print("  Warning: Failed to stop CriticalMode for domain " + domains + ": " + e.message);
        }
    }

    print("\n" + separator);
    print("CriticalMode Stopped");
    print(separator);
    print("  Locations:  " + locationsCount);
    print("  Hostnames:  " + hostnamesCount);
    print("  Nodenames:  " + nodenamesCount);
    print("  Domains:    " + domainsCount);
    print("  Total:      " + (locationsCount + hostnamesCount + nodenamesCount + domainsCount));
    print(separator);
}

// 执行 restore 命令
function executeRestore() {
    printParameterInfo();
    print("\nExecuting restore command...");

    print("\n" + separator);
    print("Cluster Restore Operation");
    print(separator);

    print("\nStep 1: Checking cluster health status...");
    if (!checkClusterHealth()) {
        print("Warning: Cluster is not in healthy state");
        print("  Some nodes may have issues. Continue at your own risk.");
    } else {
        print("Cluster health status: OK - all nodes are healthy");
    }

    print("\nStep 2: Stopping all MaintenanceMode...");
    var maintenanceCount = stopAllMaintenanceMode();
    if (maintenanceCount > 0) {
        print("  Stopped " + maintenanceCount + " MaintenanceMode instance(s)");
    } else {
        print("  No MaintenanceMode instances found");
    }

    print("\nStep 3: Stopping all CriticalMode...");
    var criticalCount = stopAllCriticalMode();
    if (criticalCount > 0) {
        print("  Stopped " + criticalCount + " CriticalMode instance(s)");
    } else {
        print("  No CriticalMode instances found");
    }

    print("\nStep 4: Verifying cluster restoration...");
    var totalModes = maintenanceCount + criticalCount;
    if (totalModes > 0) {
        var modeInfo = getGroupModeInfo();
        if (modeInfo.length === 0) {
            print("  Cluster restored successfully - all modes cleared");
        } else {
            print("  Warning: Some modes still active");
            print("  Active modes:");
            for (var i = 0; i < modeInfo.length; i++) {
                print("    - " + modeInfo[i].GroupName + " [" + modeInfo[i].GroupMode + "]");
            }
        }
    } else {
        print("  Cluster already in normal state - no modes to clear");
    }

    print("\n" + separator);
    print("Cluster Restore Completed");
    print(separator);
    print("  MaintenanceMode stopped: " + maintenanceCount);
    print("  CriticalMode stopped: " + criticalCount);
    print("  Total modes cleared: " + totalModes);
    print(separator);
}

// 调用主函数
main();
