# dr_location 工具使用说明

## 概述

dr_location 是基于 SequoiaDB Location 机制的容灾工具，支持维护模式和紧急容灾模式的管理。

## 目录结构

```
dr_location/
├── bin/                          # 可执行脚本和入口文件
│   ├── main.js                   # 主JS入口文件（通过sdb调用）
│   ├── sdb_init_location.sh      # 初始化和查看Location信息
│   ├── sdb_start_maintenance.sh  # 开启维护模式
│   ├── sdb_stop_maintenance.sh   # 关闭维护模式
│   ├── sdb_start_critical.sh     # 开启紧急模式
│   ├── sdb_stop_critical.sh      # 关闭紧急模式
│   ├── sdb_restore_cluster.sh    # 恢复集群到正常状态
│   └── README.md                 # 本文件
├── config/                       # 配置文件目录
│   └── config.js                 # 主配置文件
├── lib/                          # 库文件目录
│   └── dr_location.js            # 逻辑层（旧版本，逐步废弃）
├── output/                       # 输出文件目录
│   └── location.txt              # Location分析结果文件
└── README.md                     # 主文档
```

## 使用方式

### 方式一：直接使用 sdb 命令（推荐）

使用 sdb 命令直接调用 main.js，这是推荐的方式：

```bash
# 查看Location信息
sdb -f bin/main.js show

# 检查Location配置
sdb -f bin/main.js check -c config/config.js

# 初始化Location配置
sdb -f bin/main.js init -c config/config.js

# 开启维护模式
sdb -f bin/main.js start_maintenance -l GuangZhou
sdb -f bin/main.js start_maintenance -H host1,host2
sdb -f bin/main.js start_maintenance -f location1

# 关闭维护模式
sdb -f bin/main.js stop_maintenance -l GuangZhou
sdb -f bin/main.js stop_maintenance -H host1,host2
sdb -f bin/main.js stop_maintenance -f location1
sdb -f bin/main.js stop_maintenance --check

# 开启紧急模式
sdb -f bin/main.js start_critical -l GuangZhou

# 关闭紧急模式
sdb -f bin/main.js stop_critical -l GuangZhou
sdb -f bin/main.js stop_critical --check

# 恢复集群
sdb -f bin/main.js restore -c config/config.js
```

### 方式二：使用包装脚本

旧的 shell 包装脚本仍然可用，但建议使用方式一：

```bash
# 查看Location信息
./bin/sdb_init_location.sh
./bin/sdb_init_location.sh show
./bin/sdb_init_location.sh show -f location.txt

# 检查Location配置
./bin/sdb_init_location.sh check -c config/config.js

# 初始化Location配置
./bin/sdb_init_location.sh init -c config/config.js

# 开启维护模式
./bin/sdb_start_maintenance.sh -l GuangZhou
./bin/sdb_start_maintenance.sh -H host1,host2
./bin/sdb_start_maintenance.sh -f location1

# 关闭维护模式
./bin/sdb_stop_maintenance.sh -l GuangZhou
./bin/sdb_stop_maintenance.sh -H host1,host2
./bin/sdb_stop_maintenance.sh -f location1
./bin/sdb_stop_maintenance.sh --check

# 开启紧急模式
./bin/sdb_start_critical.sh -l GuangZhou

# 关闭紧急模式
./bin/sdb_stop_critical.sh -l GuangZhou
./bin/sdb_stop_critical.sh --check

# 恢复集群
./bin/sdb_restore_cluster.sh -c config/config.js
```

## 命令详解

### show - 查看Location信息

查看当前集群的Location配置和状态。

```bash
sdb -f bin/main.js show
```

### check - 检查Location配置

对比当前集群Location配置与配置文件中的期望配置。

```bash
sdb -f bin/main.js check -c config/config.js
```

### init - 初始化Location配置

根据配置文件设置集群的Location信息。

```bash
sdb -f bin/main.js init -c config/config.js
```

配置文件格式：
```javascript
initLocationObject={
    "GuangZhou": ["host1", "host2", "host3"],
    "ShenZhen": ["host4", "host5"]
};

activeLocation="GuangZhou";
```

### start_maintenance - 开启维护模式

在指定的节点或Location上开启维护模式。

```bash
# 按Location
sdb -f bin/main.js start_maintenance -l GuangZhou

# 按主机名（多个用逗号分隔）
sdb -f bin/main.js start_maintenance -H host1,host2

# 按节点名（多个用逗号分隔）
sdb -f bin/main.js start_maintenance -n host1:11820,host2:11830

# 按域名
sdb -f bin/main.js start_maintenance -d domain1

# 按文件
sdb -f bin/main.js start_maintenance -f location1
```

### stop_maintenance - 关闭维护模式

关闭指定的维护模式节点。

```bash
# 按Location
sdb -f bin/main.js stop_maintenance -l GuangZhou

# 按主机名
sdb -f bin/main.js stop_maintenance -H host1,host2

# 按节点名
sdb -f bin/main.js stop_maintenance -n host1:11820

# 按域名
sdb -f bin/main.js stop_maintenance -d domain1

# 按文件
sdb -f bin/main.js stop_maintenance -f location1

# 停止前检查节点状态
sdb -f bin/main.js stop_maintenance --check
```

### start_critical - 开启紧急模式

在指定的节点或Location上开启紧急模式。

```bash
# 按Location
sdb -f bin/main.js start_critical -l GuangZhou

# 按主机名
sdb -f bin/main.js start_critical -H host1,host2

# 按节点名
sdb -f bin/main.js start_critical -n host1:11820

# 按文件
sdb -f bin/main.js start_critical -f location1
```

### stop_critical - 关闭紧急模式

关闭指定的紧急模式节点。

```bash
# 按Location
sdb -f bin/main.js stop_critical -l GuangZhou

# 按主机名
sdb -f bin/main.js stop_critical -H host1,host2

# 按节点名
sdb -f bin/main.js stop_critical -n host1:11820

# 按文件
sdb -f bin/main.js stop_critical -f location1

# 停止前检查节点状态
sdb -f bin/main.js stop_critical --check
```

### restore - 恢复集群

关闭所有已开启的维护模式和紧急模式。

```bash
sdb -f bin/main.js restore
```

## 配置文件

配置文件位于 `config/config.js`，包含以下配置项：

```javascript
// 登录参数
sdbCoord="host1:11810"
sdbUser="sdbadmin"
sdbPassword="sdbadmin"
sdbToken="sequoiadb"
sdbCipherFile="/home/sdbadmin/passwd"

// Location配置
initLocationObject={
    "GuangZhou": ["host1", "host2", "host3"],
    "ShenZhen": ["host4", "host5"]
};

// 活跃Location
activeLocation="GuangZhou";

// 切主过滤级别
// 0: Maintenance/Critical状态节点不参与选主
// 1: ActiveLocation状态节点不参与选主
// 2: 按RunStatusWeight权重选主
reelectLevel="0|1|2";

// 模式保持时间窗口（分钟）
minKeepTime=100
maxKeepTime=1000

// 是否强制开启维护模式
enforceMaintenance=true

// 是否强制开启紧急模式（谨慎使用，可能导致数据回滚）
enforceCritical=false
```

## 文件格式

### Location节点信息文件

格式示例：
```
[location]
GuangZhou

[hostname]
host1
host2

[nodename]
host1:11820
host2:11830

[domain]
domain1
domain2
```

## 选项说明

- `-h, --help`: 显示帮助信息
- `-c, --conf <file>`: 指定配置文件
- `-f, --file <file>`: 指定节点信息文件
- `-l, --location <loc>`: 指定Location
- `-H, --hostname <host>`: 指定主机名（多个用逗号分隔）
- `-n, --nodename <node>`: 指定节点名（多个用逗号分隔）
- `-d, --domain <domain>`: 指定域名（多个用逗号分隔）
- `--check`: 操作前检查节点状态

## 注意事项

1. **权限要求**：确保运行用户有足够的权限操作SequoiaDB集群
2. **网络连接**：确保能够连接到协调节点
3. **数据安全**：
   - CriticalMode可能导致数据回滚，请谨慎使用
   - 建议在恢复前先在测试环境验证
4. **备份建议**：操作前建议备份配置和重要数据
5. **模式冲突**：同一节点不能同时处于维护模式和紧急模式

## 故障排除

### 连接失败

```bash
# 检查协调节点是否可达
sdb -s host1:11810 -u sdbadmin -p sdbadmin

# 检查配置文件中的连接参数
cat config/config.js
```

### 权限不足

```bash
# 检查用户权限
sdb -c "db.isAdministrator()"
```

### 配置错误

```bash
# 验证配置文件语法
cat config/config.js | node -c
```

## 迁移指南

如果您之前使用旧版本（通过source调用lib.js）：

1. **停止使用source方式**：新的main.js不再需要source lib.js
2. **更新调用方式**：从 `sdb -f lib/dr_location.js` 改为 `sdb -f bin/main.js`
3. **检查参数**：确保参数格式与新的命令匹配

## 技术支持

如有问题，请查阅：
- 主文档：`../README.md`
- 上下文文档：`../CONTEXT.md`
- 设计方案：`../location容灾设计方案.txt`
