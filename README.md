# SequoiaDB Location 容灾工具

基于 Location 机制的 SequoiaDB 容灾管理工具，提供 Location 配置、MaintenanceMode 和 CriticalMode 管理功能。

## 目录结构

```
dr_location/
├── bin/                          # 工具脚本
│   ├── sdb_init_location.sh      # 初始化和展示 Location 信息
│   ├── sdb_start_maintenance.sh  # 开启 MaintenanceMode
│   ├── sdb_stop_maintenance.sh   # 关闭 MaintenanceMode
│   ├── sdb_start_critical.sh     # 开启 CriticalMode
│   ├── sdb_stop_critical.sh      # 关闭 CriticalMode
│   └── sdb_restore_cluster.sh    # 恢复集群到正常状态
├── config/                       # 配置文件
│   └── config.js                 # 主配置文件
├── lib/                          # 工具库
│   └── lib.js                    # JavaScript 工具库
└── output/                       # 输出目录
    └── location.txt              # Location 信息输出文件
```

## 功能说明

### 1. Location 配置管理

#### sdb_init_location.sh

用于初始化、收集和检查集群的 Location 配置。

**子命令：**

- **show**: 展示当前集群的 Location 信息
  ```bash
  sdb_init_location.sh show
  sdb_init_location.sh show -f location.txt
  ```

- **check**: 对比当前 Location 配置与预期配置
  ```bash
  sdb_init_location.sh check
  sdb_init_location.sh check -f location.txt
  ```

- **init**: 根据配置文件初始化 Location 配置
  ```bash
  sdb_init_location.sh init -c config.js
  ```

### 2. MaintenanceMode 管理

#### sdb_start_maintenance.sh

开启指定节点的 MaintenanceMode。

**使用场景：**
- 容灾切换演练
- 节点维护前的保护
- 测试目的

**用法：**
```bash
# 对整个 Location 开启
sdb_start_maintenance.sh -l GuangZhou

# 对特定主机开启
sdb_start_maintenance.sh -H host1

# 对特定节点开启
sdb_start_maintenance.sh -n host1:11820

# 对特定域开启
sdb_start_maintenance.sh -d domain1
```

#### sdb_stop_maintenance.sh

关闭已开启的 MaintenanceMode。

**用法：**
```bash
# 关闭指定 Location 的 MaintenanceMode
sdb_stop_maintenance.sh -l GuangZhou

# 关闭指定主机的 MaintenanceMode
sdb_stop_maintenance.sh -H host1

# 关闭所有 MaintenanceMode（带检查）
sdb_stop_maintenance.sh --check

# 关闭指定节点
sdb_stop_maintenance.sh -n host1:11820
```

### 3. CriticalMode 管理

#### sdb_start_critical.sh

开启指定节点的 CriticalMode。

**使用场景：**
- 正式容灾切换
- 故障转移

**注意：** CriticalMode 可能导致数据回滚，需谨慎使用。

**用法：**
```bash
# 对整个 Location 开启
sdb_start_critical.sh -l GuangZhou

# 对特定主机开启
sdb_start_critical.sh -H host1

# 对特定节点开启
sdb_start_critical.sh -n host1:11820

# 对特定域开启
sdb_start_critical.sh -d domain1
```

#### sdb_stop_critical.sh

关闭已开启的 CriticalMode。

**用法：**
```bash
# 关闭指定 Location 的 CriticalMode
sdb_stop_critical.sh -l GuangZhou

# 关闭指定主机的 CriticalMode
sdb_stop_critical.sh -H host1

# 关闭所有 CriticalMode（带检查）
sdb_stop_critical.sh --check

# 关闭指定节点
sdb_stop_critical.sh -n host1:11820
```

### 4. 集群恢复

#### sdb_restore_cluster.sh

将集群恢复到正常状态，关闭所有 MaintenanceMode 和 CriticalMode。

**用法：**
```bash
sdb_restore_cluster.sh -c config.js
```

**功能：**
1. 检查集群健康状态
2. 关闭所有 MaintenanceMode
3. 关闭所有 CriticalMode
4. 显示恢复后的状态

## 配置文件 (config.js)

### 必需配置

```javascript
// 登录参数
sdbCoord = "localhost:11810"
sdbUser = "sdbadmin"
sdbPassword = "sdbadmin"
sdbToken = "sequoiadb"
sdbCipherFile = "/home/sdbadmin/passwd"

// Location 配置
initLocationObject = {
    "GuangZhou": ["host1", "host2", ...],
    "ShenZhen": ["host41", "host42", ...]
};

// ActiveLocation
activeLocation = "GuangZhou"

// 切主配置
reelectLevel = "0|1|2"

// 时间窗口配置（分钟）
minKeepTime = 100
maxKeepTime = 1000

// 强制开启配置
enforceMaintenance = true
enforceCritical = false
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `sdbCoord` | Coord 节点地址 |
| `sdbUser` | 用户名 |
| `sdbPassword` | 密码 |
| `initLocationObject` | Location 映射配置 |
| `activeLocation` | 默认活跃 Location |
| `reelectLevel` | 切主过滤级别 |
| `minKeepTime` | 最小保持时间 |
| `maxKeepTime` | 最大保持时间 |
| `enforceMaintenance` | 强制开启 MaintenanceMode |
| `enforceCritical` | 强制开启 CriticalMode |

## 使用流程

### 1. 配置 Location

```bash
# 修改 config.js 中的 initLocationObject 和 activeLocation
vim config/config.js

# 初始化 Location 配置
./bin/sdb_init_location.sh init -c config.js

# 查看结果
./bin/sdb_init_location.sh show -f output/location.txt
```

### 2. 容灾切换演练

```bash
# 开启 MaintenanceMode（演练用）
./bin/sdb_start_maintenance.sh -l GuangZhou

# 测试完成，关闭 MaintenanceMode
./bin/sdb_stop_maintenance.sh -l GuangZhou
```

### 3. 正式容灾切换

```bash
# 开启 CriticalMode
./bin/sdb_start_critical.sh -l GuangZhou

# 执行故障转移后
./bin/sdb_stop_critical.sh -l GuangZhou
```

### 4. 集群恢复

```bash
# 检查集群状态并恢复
./bin/sdb_restore_cluster.sh -c config.js
```

## DC 接口说明

工具通过以下 sdbdc 接口实现容灾功能：

### Location 配置

- `dc.setLocation(hostname, location)` - 设置主机 Location
- `dc.setActiveLocation(location)` - 设置集群 ActiveLocation
- `dc.locationAnalyze()` - 获取 Location 分析结果

### GroupMode 管理

- `dc.startMaintenanceMode(options)` - 开启 MaintenanceMode
- `dc.stopMaintenanceMode(options)` - 关闭 MaintenanceMode
- `dc.startCriticalMode(options)` - 开启 CriticalMode
- `dc.stopCriticalMode(options)` - 关闭 CriticalMode

### 切主功能

- `dc.reelectAnalyze(option, run)` - 切主分析
  - `option.HostName` - 指定主机
  - `option.Location` - 指定 Location
  - `option.Domain` - 指定域
  - `option.FilterLevel` - 过滤级别: GroupMode, Location, Weight
  - `run` - 是否执行切主

## 注意事项

1. **CriticalMode 安全性**
   - CriticalMode 可能导致数据回滚
   - 仅在正式容灾场景使用
   - 遵循标准 DR 流程

2. **节点健康检查**
   - 使用 `--check` 参数验证节点状态
   - 确保节点正常后再关闭 Mode

3. **权限要求**
   - 需要 sdbadmin 权限
   - 配置文件中包含密码或密钥文件

4. **备份建议**
   - 在执行 CriticalMode 前备份数据
   - 记录操作日志

## 示例

### 双中心容灾配置

```javascript
initLocationObject = {
    "GuangZhou": [
        "host1", "host2", "host3", "host4", "host5",
        "host6", "host7", "host8", "host9", "host10",
        "host11", "host12", "host13", "host14", "host15",
        "host16", "host17", "host18", "host19", "host20"
    ],
    "ShenZhen": [
        "host21", "host22", "host23", "host24", "host25",
        "host26", "host27", "host28", "host29", "host30"
    ]
};

activeLocation = "GuangZhou";
```

### 三中心容灾配置

```javascript
initLocationObject = {
    "GuangZhou": [
        "host1", "host2", "host3", "host4", "host5"
    ],
    "ShenZhen": [
        "host6", "host7", "host8", "host9", "host10"
    ],
    "Hangzhou": [
        "host11", "host12", "host13", "host14", "host15"
    ]
};

activeLocation = "GuangZhou";
```

## 故障排查

### 连接失败

```
Error: Failed to connect to SequoiaDB
```

**解决方案：**
- 检查 `sdbCoord` 配置是否正确
- 检查网络连接
- 验证用户名和密码

### 权限不足

```
Error: Failed to start MaintenanceMode
```

**解决方案：**
- 确保使用 sdbadmin 用户
- 检查配置文件中的密码

### Location 配置错误

```
Error: No location configured for host
```

**解决方案：**
- 运行 `sdb_init_location.sh init` 初始化配置
- 检查 `initLocationObject` 配置

## 技术支持

如有问题，请联系：
- 技术支持团队
- SequoiaDB 官方文档

## 许可证

本工具基于 SequoiaDB 源码开发，遵循 Apache 2.0 许可证。
