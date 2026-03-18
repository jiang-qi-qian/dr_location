// dr_location 容灾工具配置文件
// ========================================

// 登录参数
sdbCoord = "localhost:11810"
sdbUser = "sdbadmin"
sdbPassword = "sdbadmin"
sdbToken = ""
sdbCipherFile = ""

// ========================================
// 配置集群 Location 信息
// key 为 Location，value 为目标（只支持 hostname）
// 将所有 value 的 Location 设置为 key
// 可以读取 show 模式输出的文本文件格式作为输入
// ========================================
initLocationObject = {
    "GuangZhou": [
        "host1", "host2", "host3", "host4", "host5", "host6", "host7", "host8", "host9", "host10",
        "host11", "host12", "host13", "host14", "host15", "host16", "host17", "host18", "host19", "host20",
        "host21", "host22", "host23", "host24", "host25", "host26", "host27", "host28", "host29", "host30",
        "host31", "host32", "host33", "host34", "host35", "host36", "host37", "host38", "host39", "host40",
    ],
    "ShenZhen": [
        "host41", "host42", "host43", "host44", "host45", "host46", "host47", "host48", "host49", "host50",
        "host51", "host52", "host53", "host54", "host55", "host56", "host57", "host58", "host59", "host60",
    ],
};

// 不为空时，使用 sdb_init_location.sh init 后将设置 activeLocation 为配置值
activeLocation = ""

// ========================================
// 切主配置
// ========================================
// 按照快照 SDB_SNAP_CONFIGS RunStatusWeightDesp 和 RunStatusWeight 中新增字段识别
// db.snapshot(SDB_SNAP_CONFIGS, new SdbSnapshotOption().options({IgnoreDefault:true,ShowRunStatus:true}))
// 0 -> RunStatusWeightDesp: "Maintenance"/"Critical"，对包含此字段的节点按 RunStatusWeight 进行重新选主
// 1 -> RunStatusWeightDesp: "ActiveLocation"，对包含此字段的节点按 RunStatusWeight 进行重新选主
// 2 -> RunStatusWeight: <weight>，对所有节点按 RunStatusWeight 进行重新选主
// 包含更低级别，如 1 包含 0|1，2 包含 0|1|2
reelectLevel = "0|1|2"

// ========================================
// MaintenanceMode 和 CriticalMode 运行最低、最高窗口时间，单位分钟
// ========================================
minKeepTime = 100
maxKeepTime = 1000

// ========================================
// 是否强制开启 MaintenanceMode
// ========================================
enforceMaintenance = true

// ========================================
// 是否强制开启 CriticalMode（可能会造成数据回滚丢失）
// ========================================
enforceCritical = false

// ========================================
// DC 中 MaintenanceMode 支持 Location, host(所有node，单机多副本)
// DC 中 CriticalMode 支持 Location，host(第一个node，单机多副本)
// ========================================
