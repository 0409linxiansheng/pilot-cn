/* pilot-cn —— Pilot 管理面板中文翻译（运行时注入，不改前端源码）
 *
 * 原理：面板是 Vue SPA，文案硬编码英文。本脚本在页面加载后遍历 DOM，按「整段
 *       精确匹配」把英文换成中文，并用 MutationObserver 处理后续动态渲染。
 *
 * 为什么运行时注入：翻译只存在于 cn/ 层 + 一个极小的后端补丁里，上游 Pilot
 *       升级不会覆盖（见 cn/patches/README.md）。
 *
 * 扩展：往下面的 Object.assign(DICT, {...}) 里加 '英文原文': '中文' 即可，
 *       刷新页面生效（服务端每次请求都重读本文件，无需重启）。
 */
(function () {
  'use strict';
  var DICT = {};

  // ─────────────────────────── 导航 / 板块 ───────────────────────────
  Object.assign(DICT, {
    'Sites': '站点', 'Site': '站点', 'All sites': '全部站点', 'Storage': '存储',
    'Marketplace': '应用市场', 'Insights': '洞察', 'Analytics': '分析', 'Updates': '更新',
    'Update': '更新', 'Tasks': '任务', 'Logs': '日志', 'Dev tools': '开发工具',
    'Dev Tools': '开发工具', 'Developer Tools': '开发者工具', 'DB analyzer': '数据库分析',
    'SQL playground': 'SQL 沙盒', 'Code editor': '代码编辑器', 'Utility': '工具',
    'Business': '业务', 'Activity': '活动', 'Server': '服务器', 'Database': '数据库',
    'Databases': '数据库', 'Integrations': '集成', 'Setup': '安装向导', 'System': '系统',
    'Central': '中央服务', 'Payments': '支付', 'General': '通用', 'Notifications': '通知',
    'Localization': '本地化', 'Home': '首页', 'Other': '其他', 'Featured': '精选',
    'Settings': '设置', 'Backups': '备份', 'Backup': '备份', 'Restore': '还原',
    'Migrate': '迁移', 'Apps': '应用', 'App': '应用', 'Domains': '域名', 'Domain': '域名',
    'Security': '安全', 'Sessions': '会话', 'Account': '账号', 'Marketplace app': '市场应用',
    'System Info': '系统信息', 'Quick actions': '快捷操作', 'Custom': '自定义', 'Custom...': '自定义…',
    'All categories': '全部分类', 'Categories': '分类', 'Category': '分类'
  });

  // ─────────────────────────── 操作 / 按钮 ───────────────────────────
  Object.assign(DICT, {
    'Save': '保存', 'Save Changes': '保存更改', 'Saved': '已保存', 'Cancel': '取消',
    'Close': '关闭', 'Open': '打开', 'Delete': '删除', 'Remove': '移除', 'Edit': '编辑',
    'Rename': '重命名', 'Add': '添加', 'New': '新建', 'Create': '创建', 'Copy': '复制',
    'Copy all': '全部复制', 'Copied': '已复制', 'Download': '下载', 'Upload': '上传',
    'Install': '安装', 'Uninstall': '卸载', 'Enable': '启用', 'Disable': '禁用',
    'Connect': '连接', 'Disconnect': '断开连接', 'Verify': '验证', 'Regenerate': '重新生成',
    'Retry': '重试', 'Refresh': '刷新', 'Search': '搜索', 'Filter': '筛选', 'Block': '阻止',
    'Allow': '允许', 'Back': '返回', 'Next': '下一步', 'Prev': '上一步', 'Continue': '继续',
    'Confirm': '确认', 'Actions': '操作', 'Action': '操作', 'Load more': '加载更多',
    'Show less': '收起', 'View': '查看', 'View jobs': '查看任务', 'View analytics': '查看分析',
    'View details': '查看详情', 'View Details': '查看详情', 'View activity': '查看活动',
    'View site': '查看站点', 'View task': '查看任务', 'Details': '详情', 'Hide details': '隐藏详情',
    'Show details': '显示详情', 'Show error output': '显示错误输出', 'Hide error output': '隐藏错误输出',
    'Try again.': '请重试。', 'Skip': '跳过', 'Start': '启动', 'Stop': '停止', 'Restart': '重启',
    'Restarting services': '正在重启服务…', 'Run': '运行', 'Execute': '执行', 'Build': '构建',
    'Build assets': '构建资源', 'Build Assets': '构建资源', 'Discard': '放弃',
    'Keep editing': '继续编辑', 'Drag to reorder': '拖动排序', 'Select': '选择',
    'Select all': '全选', 'Unselect all': '取消全选', 'Grid view': '网格视图',
    'List view': '列表视图', 'Per Page': '每页', 'Revert': '回退', 'Reset': '重置',
    'Login': '登录', 'Log in': '登录', 'Logout': '退出登录', 'Log out': '退出登录',
    'Sign in': '登录', 'Sign In': '登录', 'Sign out': '退出登录', 'Sign in again': '重新登录',
    'Login as admin': '以管理员登录', 'Change password': '修改密码', 'Reset password': '重置密码',
    'Mark all as read': '全部标为已读', 'Paste': '粘贴', 'Write': '写入', 'Read': '读取',
    'View details': '查看详情', 'Permanently delete': '永久删除', 'Make primary': '设为主域名'
  });

  // ─────────────────────────── 状态 ───────────────────────────
  Object.assign(DICT, {
    'Status': '状态', 'State': '状态', 'Active': '活跃', 'Inactive': '未激活',
    'Running': '运行中', 'Pending': '待处理', 'Paused': '已暂停', 'Queued': '排队中',
    'Stopped': '已停止', 'Completed': '已完成', 'Success': '成功', 'Succeeded': '成功',
    'Failed': '失败', 'Error': '错误', 'Warning': '警告', 'Broken': '异常', 'Idle': '空闲',
    'Off': '关闭', 'On': '开启', 'Enabled': '已启用', 'Disabled': '已禁用',
    'Creating': '创建中…', 'Migrating': '迁移中…', 'Backing up': '备份中…', 'Updating': '更新中…',
    'Recovering': '恢复中…', 'Recovered': '已恢复', 'Reverted': '已回滚', 'Retrying': '重试中…',
    'Retry queued': '已排队重试', 'Needs attention': '需要关注', 'Already installed': '已安装',
    'Unavailable': '不可用', 'Installed': '已安装', 'Waiting for configuration': '等待配置',
    'Waiting for approval…': '等待批准…', 'Starting…': '启动中…', 'Preparing': '准备中…',
    'Admin active': '管理员在线', 'Logged in as admin': '已以管理员登录',
    'Logging in as admin': '正在以管理员登录…', 'Password changed': '密码已修改',
    'Query failed': '查询失败', 'Query failed.': '查询失败。', 'Bad input.': '输入无效。',
    'Legacy error.': '历史错误。', 'Unknown': '未知', 'Not specified': '未指定',
    'Not enforced yet': '尚未实施', 'Included': '已包含', 'Excluded': '已排除',
    'Required': '必填', 'Optional': '可选', 'Recommended': '推荐', 'Danger': '危险',
    'Attention': '注意', 'Heads up': '提示', 'Note': '备注', 'Live': '在线', 'Alpha': 'Alpha',
    'Community': '社区版', 'Development': '开发', 'Production': '生产', 'Local only': '仅本地',
    'Read-only': '只读', 'Public': '公开', 'Private': '私有', 'Primary': '主', 'Secondary': '次',
    'Expires': '过期时间', 'Expiry': '有效期', 'Never': '从不', 'Unsaved changes': '有未保存的更改',
    'Uploaded': '已上传', 'Added': '已添加', 'Removed': '已移除', 'Updated': '已更新',
    'Deleted': '已删除', 'Approved': '已批准', 'Truncated': '已截断'
  });

  // ─────────────────────────── 安装向导 / Bench ───────────────────────────
  Object.assign(DICT, {
    'New bench': '新建 Bench', 'New Bench': '新建 Bench', 'Bench name': 'Bench 名称',
    'Manage Benches': '管理 Bench 列表', 'Switch bench': '切换 Bench', 'Switch Bench': '切换 Bench',
    'Drop bench': '删除 Bench', 'Drop Bench': '删除 Bench', 'Update Bench': '更新 Bench',
    'Pilot Version': 'Pilot 版本', 'Current version': '当前版本', 'Update available': '有可用更新',
    'You\'re on the latest version.': '已是最新版本。', 'Reconnecting to bench': '正在重连 Bench…',
    'Reconnecting to the server...': '正在重连服务器…', 'Frappe Bench Administrator': 'Frappe Bench 管理员',
    'Customize your bench': '定制你的 Bench', 'Setting up your bench': '正在初始化 Bench…',
    'Finishing setup': '收尾中…', 'Setup complete': '安装完成', 'Site setup is complete': '站点安装完成',
    'Ready, opening setup…': '就绪，正在打开安装向导…', 'Open setup now': '立即开始安装',
    'Bench created, bringing up setup…': 'Bench 已创建，正在启动安装向导…',
    'Opens automatically when ready.': '就绪后会自动打开。', 'Checking every few seconds': '每隔几秒检查一次',
    'This may take a few minutes': '这可能需要几分钟', 'Wizard Setup': '安装向导',
    'Create a site to get started on this bench.': '创建一个站点以开始使用此 Bench。',
    'Choose and configure your database': '选择并配置数据库',
    'Choose apps': '选择应用', 'Repository URL': '仓库地址', 'Repository': '仓库',
    'Public repository': '公开仓库', 'Frappe repository': 'Frappe 仓库',
    'Frappe repository is required.': '必须提供 Frappe 仓库。', 'Initial branch': '初始分支',
    'Frappe branch': 'Frappe 分支', 'Frappe branch is required.': '必须提供 Frappe 分支。',
    'Frappe Cloud v1': 'Frappe Cloud v1', 'From Frappe': '来自 Frappe', 'Frappe Marketplace': 'Frappe 应用市场',
    'Pilot': 'Pilot', 'Bench': 'Bench', 'Benches': 'Bench 列表'
  });

  // ─────────────────────────── 站点 ───────────────────────────
  Object.assign(DICT, {
    'Site actions': '站点操作', 'Site config': '站点配置', 'Site files': '站点文件',
    'Site name': '站点名称', 'Site uptime': '站点在线时长', 'New site': '新建站点',
    'New Site': '新建站点', 'Create Site': '创建站点', 'Drop Site': '删除站点', 'Drop site': '删除站点',
    'Rename Site': '重命名站点', 'Rename site': '重命名站点', 'Reset Site': '重置站点',
    'Reset site': '重置站点', 'Reinstall Site': '重装站点', 'Restore Site': '还原站点',
    'Restore site': '还原站点', 'Setup site': '初始化站点', 'Change site': '切换站点',
    'Choose a site': '选择站点', 'Choose site': '选择站点', 'Select site': '选择站点',
    'No sites on this bench yet': '此 Bench 还没有站点', 'Other site': '其他站点',
    'Remote site': '远程站点', 'Site on Frappe Cloud': 'Frappe Cloud 上的站点',
    'No sites match your search or status filter.': '没有符合搜索或状态筛选的站点。',
    'Site name is required.': '必须填写站点名称。',
    'Site name must be a valid hostname.': '站点名称必须是合法主机名。',
    'Type the site name to confirm': '输入站点名称以确认',
    'Give this site a new name.': '为此站点设置新名称。',
    'The site will be offline for a moment while it is renamed.': '重命名期间站点会短暂离线。',
    'The site might go down while this runs.': '执行期间站点可能会中断。',
    'Visitors see a "back soon" page while you work.': '操作期间访客会看到"稍后回来"页面。',
    'Take a backup before dropping': '删除前请先备份', 'Create a site to start collecting metrics for it.': '创建站点后即可开始采集其指标。'
  });

  // ─────────────────────────── 备份 / 还原 ───────────────────────────
  Object.assign(DICT, {
    'Backup Site': '备份站点', 'Back up now': '立即备份', 'Take new backup': '新建备份',
    'Restore backup': '还原备份', 'Restore…': '还原…', 'Restore into': '还原到',
    'Delete backup': '删除备份', 'Delete Backup': '删除备份', 'Backup actions': '备份操作',
    'Backup skipped': '已跳过备份', 'Backed up': '已备份', 'Backups of': '备份（站点）',
    'Backups to keep': '保留备份数', 'Automated backups': '自动备份',
    'Configure automated backups': '配置自动备份', 'Enable automated backups': '启用自动备份',
    'Enable automatic backups to start protecting your site.': '启用自动备份以开始保护你的站点。',
    'Automatic backups run on schedule. You can also back up now.': '自动备份按计划运行，也可以立即备份。',
    'Keeps the newest N backups; older ones are pruned.': '保留最新 N 份备份，更早的会被清理。',
    'Manual backups are kept until you delete them.': '手动备份会一直保留，直到你删除。',
    'No backups yet': '暂无备份',
    'No backups found. Take a backup on that site first.': '没有找到备份。请先为该站点做一次备份。',
    'Offsite': '异地存储', 'Connect S3-compatible storage for offsite backups.': '接入兼容 S3 的存储以做异地备份。',
    'Object storage settings': '对象存储设置', 'Object storage settings saved': '对象存储设置已保存',
    'Object storage disconnected': '对象存储已断开', 'Bucket': '存储桶', 'Region': '区域',
    'Access Key': 'Access Key', 'Secret Key': 'Secret Key', 'Root Disk': '根磁盘',
    'Free on disk': '磁盘可用', 'Disk usage': '磁盘使用', 'Disk size': '磁盘容量',
    'Analyze how storage is used': '分析存储使用情况', 'Claimable': '可回收',
    'Claimable Space': '可回收空间', 'Free': '可用', 'Used': '已用', 'Total': '合计',
    'Data Size': '数据大小', 'Index Size': '索引大小', 'Data': '数据', 'Index': '索引',
    'Rows': '行数', 'Optional for AWS, DigitalOcean, and Hetzner': 'AWS / DigitalOcean / Hetzner 可留空',
    'Usually ends in -files.tar': '通常以 -files.tar 结尾',
    'Usually ends in -private-files.tar': '通常以 -private-files.tar 结尾',
    'Usually ends in .sql.gz or .sql': '通常以 .sql.gz 或 .sql 结尾',
    'Retention': '保留策略', 'Take backup of sites': '为站点备份'
  });

  // ─────────────────────────── 应用 ───────────────────────────
  Object.assign(DICT, {
    'App actions': '应用操作', 'App name': '应用名称', 'Install app': '安装应用',
    'Install App': '安装应用', 'Uninstall App': '卸载应用', 'Remove App': '移除应用',
    'Get App': '获取应用', 'Import app': '导入应用', 'Import and install': '导入并安装',
    'Import app from GitHub': '从 GitHub 导入应用', 'Add app from GitHub': '从 GitHub 添加应用',
    'Create app': '创建应用', 'Create new app': '创建新应用', 'New App': '新建应用',
    'My app': '我的应用', 'Your custom apps': '你的自建应用', 'Matching apps': '匹配的应用',
    'Target apps': '目标应用', 'No apps found.': '未找到应用。',
    'No apps found in this bench.': '此 Bench 中没有应用。', 'Search for any app': '搜索任意应用',
    'Incompatible app': '不兼容的应用', 'Needs a newer Frappe version': '需要更新的 Frappe 版本',
    'Incomplete': '不完整', 'Contains errors': '包含错误', 'Update 1 app': '更新 1 个应用',
    'Update all': '全部更新', 'Fetch App Updates': '获取应用更新',
    'Rebuild JS and CSS for this site\'s apps.': '为此站点的应用重建 JS 与 CSS。',
    'Run pending database migrations on this site.': '在此站点上执行待处理的数据库迁移。',
    'This update needs attention': '此更新需要处理',
    'No updates are in this state right now.': '当前没有处于该状态的更新。',
    'Update failed. Check the Tasks view for details.': '更新失败，详情见"任务"页面。',
    'Update did not complete successfully.': '更新未能成功完成。',
    'Reverting apps': '正在回退应用', 'Migrated': '已迁移', 'Migration failed': '迁移失败',
    'Reinstall Site': '重装站点', 'Patch': '补丁', 'Skip patch': '跳过补丁',
    'Skip failing patches': '跳过失败的补丁', 'Skip patch queued': '已排队跳过补丁',
    'Skipped patches': '已跳过的补丁', 'What this app does': '此应用的功能',
    'Code from the app': '来自应用的代码', 'Publisher': '发布者', 'License': '许可证',
    'Website': '网站', 'Works with': '适用版本', 'Add a GitHub Actions unittest workflow': '添加 GitHub Actions 单元测试工作流'
  });

  // ─────────────────────────── 数据库 ───────────────────────────
  Object.assign(DICT, {
    'Database action': '数据库操作', 'Database actions': '数据库操作', 'Database engine': '数据库引擎',
    'Database setup': '数据库安装', 'Database configurations': '数据库配置',
    'Database capabilities are unavailable.': '数据库能力不可用。',
    'Database Binary Logs': '数据库二进制日志', 'Database Index Analysis': '数据库索引分析',
    'Database Locks': '数据库锁', 'Database Processes': '数据库进程', 'Database Size': '数据库大小',
    'Database Size Breakup': '数据库大小构成', 'DB analyzer': '数据库分析',
    'DB analyzer supports MariaDB only': '数据库分析仅支持 MariaDB', 'DB connections': '数据库连接数',
    'Create new database': '新建数据库', 'All databases': '全部数据库', 'Usage per database': '各数据库用量',
    'No database server': '没有数据库服务器', 'Choose and configure your database': '选择并配置数据库',
    'Analyze the indexes of the database': '分析数据库索引',
    'Analyze the lock waits of the database': '分析数据库锁等待',
    'Analyze the processes of the database': '分析数据库进程',
    'Inspect binary logs and safely purge complete log ranges.': '查看二进制日志并安全清理已完成的日志段。',
    'Binary logs are taking up space': '二进制日志占用空间', 'Binary logs deleted': '二进制日志已删除',
    'Binary logs purged': '二进制日志已清理', 'Delete binary logs': '删除二进制日志',
    'Purge binary logs': '清理二进制日志', 'Manage Binlogs': '管理二进制日志',
    'Manage the binary logs of the database': '管理数据库的二进制日志',
    'Kill database process': '终止数据库进程', 'Kill process': '终止进程', 'Killed': '已终止',
    'Query': '查询', 'Queries': '查询', 'Query String': '查询字符串',
    'Rows Examined': '扫描行数', 'Rows Locked': '锁定行数', 'Rows Modified': '修改行数',
    'Rows Sent': '发送行数', 'Full table scans': '全表扫描', 'Dominant Index': '主导索引',
    'Dominant Index Columns': '主导索引列', 'Redundant': '冗余', 'Redundant Index': '冗余索引',
    'Redundant Index Columns': '冗余索引列', 'Index Name': '索引名', 'Index Size': '索引大小',
    'Column': '列', 'Columns': '列', 'Table': '表', 'Tables': '表', 'Table Name': '表名',
    'Search tables': '搜索表', 'Search variables': '搜索变量', 'Schema': '结构',
    'No data': '无数据', 'Performance Schema': '性能架构', 'Performance Schema is off': '性能架构未开启',
    'Buffer pool size': '缓冲池大小', 'Buffer Pool Size': '缓冲池大小',
    'Buffer pool miss percent': '缓冲池未命中率', 'Buffer Pool Miss %': '缓冲池未命中 %',
    'Buffer pool size of total RAM': '缓冲池占内存比例', 'Buffer Pool % RAM': '缓冲池占内存 %',
    'Maximum connections': '最大连接数', 'Max Connections': '最大连接数',
    'Update database setting': '更新数据库设置', 'Update Max DB Connections': '更新最大数据库连接数',
    'Update InnoDB Buffer Pool Size': '更新 InnoDB 缓冲池大小', 'MariaDB': 'MariaDB',
    'PostgreSQL': 'PostgreSQL', 'MariaDB will restart to apply this change.': 'MariaDB 将重启以应用此更改。',
    'Restart MariaDB': '重启 MariaDB',
    'Restart the database service and verify that it accepts connections.': '重启数据库服务并确认其可接受连接。',
    'Some columns aren\'t available for PostgreSQL': 'PostgreSQL 下部分列不可用',
    'Refresh database capabilities': '刷新数据库能力', 'Refresh database configurations': '刷新数据库配置',
    'SQL Query Analysis': 'SQL 查询分析', 'Avg Row Lock Wait': '平均行锁等待',
    'Cached + Buffers': '缓存 + 缓冲区', 'Swap Used': '已用交换分区',
    'Analyze the processes of the database': '分析数据库进程',
    'Database configurations': '数据库配置', 'Database capabilities are unavailable.': '数据库能力不可用。'
  });

  // ─────────────────────────── 监控 / 指标 ───────────────────────────
  Object.assign(DICT, {
    'Load Average': '平均负载', 'Load Average 1': '1 分钟负载', 'Load Average 5': '5 分钟负载',
    'Load Average 15': '15 分钟负载', 'CPU usage': 'CPU 使用率', 'Memory usage': '内存使用率',
    'Network': '网络', 'Memory': '内存', 'Disk': '磁盘', 'Avg Time': '平均耗时',
    'Requests': '请求数', 'Request failed.': '请求失败。', 'Requests by IP': '按 IP 的请求',
    'Top source IPs': '请求最多的来源 IP', 'Slowest requests': '最慢的请求',
    'Slowest queries by site': '各站点最慢查询', 'Slowest reports': '最慢的报表',
    'Slowest background jobs': '最慢的后台任务', 'Top slow queries': '最慢查询排行',
    'Frequent slow queries': '高频慢查询', 'Frequent requests': '高频请求',
    'Frequent background jobs': '高频后台任务',
    'Queries run against that site\'s database.': '对比该站点数据库执行的查询。',
    'Background jobs': '后台任务', 'Background workers': '后台工作进程', 'Queues': '队列',
    'No of Workers': '工作进程数',
    'No background jobs match the filters you have applied.': '没有符合当前筛选条件的后台任务。',
    'Failed tasks': '失败的任务',
    'Failed tasks and resource alerts for this bench show up here.': '此 Bench 的失败任务与资源告警会显示在这里。',
    'Data will appear here once activity is tracked': '开始记录活动后，数据会显示在这里',
    'Monitoring hasn\'t collected metrics in this range yet.': '此时间范围内尚未采集到指标。',
    'The monitor hasn\'t sampled the database in this range yet.': '此时间范围内尚未对数据库采样。',
    'No data for the selected range': '所选范围内无数据', 'No uptime data yet': '暂无在线时长数据',
    'Uptime': '在线时长', 'Overall Uptime': '总在线时长', 'Site uptime': '站点在线时长',
    'Uptime monitoring is production-only': '在线监控仅在正式环境可用',
    'Refresh usage': '刷新用量',
    'Measure this bench\'s sites again. Usage is collected every six hours.': '重新测算此 Bench 各站点的用量。用量每六小时采集一次。',
    'No usage yet': '暂无用量', 'Resource': '资源', 'Runtime': '运行时',
    'Last activity': '最近活动', 'Last used': '最近使用', 'Last run': '上次运行',
    'Activity details': '活动详情', 'Actions taken by this session will show up here.': '本次会话的操作会显示在这里。',
    'No activity recorded': '暂无活动记录', 'No activity yet': '暂无活动',
    'Analyze how storage is used': '分析存储使用情况', 'High': '高', 'Low': '低', 'Medium': '中',
    'Very High': '极高', 'Percentage': '百分比', 'Anomaly threshold': '异常阈值',
    'Busy User': '用户态占用', 'Busy System': '内核态占用', 'Busy IOWait': 'IO 等待',
    'Busy IRQ': '硬中断', 'Busy Other': '其他占用'
  });

  // ─────────────────────────── 安全 / 防火墙 / SSH ───────────────────────────
  Object.assign(DICT, {
    'SSH keys': 'SSH 密钥', 'SSH key': 'SSH 密钥', 'SSH Key': 'SSH 密钥', 'Add SSH key': '添加 SSH 密钥',
    'Remove SSH key': '删除 SSH 密钥', 'SSH key added': 'SSH 密钥已添加', 'SSH key removed': 'SSH 密钥已删除',
    'No SSH keys': '暂无 SSH 密钥', 'Public key': '公钥', 'Fingerprint': '指纹',
    'SSH into the server.': 'SSH 登录服务器。',
    'Manage authorized public keys for server access.': '管理可用于登录服务器的授权公钥。',
    'Add a public key to give its holder SSH access to this server.': '添加公钥，使其持有者可 SSH 登录本服务器。',
    'Firewall settings': '防火墙设置', 'Enable firewall': '启用防火墙',
    'Enable web application firewall': '启用 Web 应用防火墙', 'Web application firewall': 'Web 应用防火墙',
    'Web application firewall updated': 'Web 应用防火墙已更新', 'Firewall updated': '防火墙已更新',
    'Rules': '规则', 'Rule name': '规则名称', 'Rule enabled': '规则已启用', 'Custom rules': '自定义规则',
    'No custom rules': '暂无自定义规则', 'Top rules': '命中最多的规则', 'Untitled rule': '未命名规则',
    'Remove rule': '删除规则', 'Delete rule': '删除规则', 'Add rule': '添加规则',
    'Blocked': '已阻止', 'Would block': '将被阻止', 'Detected only': '仅检测',
    'Detection only': '仅检测', 'Flagged requests': '被标记的请求',
    'Inspect incoming requests for attacks before they reach your sites.': '在请求到达站点前检测攻击。',
    'Inspect responses': '检查响应', 'Scan outbound responses for leaks. Adds latency.': '扫描出站响应中的泄漏。会增加延迟。',
    'Matching requests are rejected.': '匹配的请求会被拒绝。',
    'Match': '匹配', 'When': '当', 'Then': '则', 'When this matches:': '当满足：',
    'When all of 0 conditions match': '当满足全部 0 个条件',
    'When all of 2 conditions match': '当满足全部 2 个条件',
    'When any of 2 conditions match': '当满足任意 2 个条件',
    'When Header X-Real-IP contains "10.0.0.1"': '当请求头 X-Real-IP 包含 "10.0.0.1"',
    'When URI Path contains "…"': '当 URI 路径包含 "…"',
    'Request Header': '请求头', 'Header name': '请求头名称', 'Header value': '请求头值',
    'HTTP Method': 'HTTP 方法', 'URI Path': 'URI 路径', 'Full URI': '完整 URI',
    'Source IP': '来源 IP', 'X-Real-IP': 'X-Real-IP', 'User Agent': 'User-Agent',
    'Sensitivity': '灵敏度', 'Sensitive': '敏感',
    'Most coverage, most false positives.': '覆盖最全，误报最多。',
    'Very few false positives. Start here.': '误报极少，建议从这档开始。',
    'Block by default': '默认阻止', 'Everyone is blocked by default. Add an': '默认阻止所有人。添加一条',
    'Exempt paths': '豁免路径', 'Expect to add exclusions.': '通常需要添加例外。',
    'Max inspected body size': '最大检查体积', 'Add endpoint': '添加端点', 'Remove endpoint': '删除端点',
    'Add recipient': '添加收件人', 'Remove recipient': '删除收件人',
    'Remove condition': '删除条件', 'Remove config': '删除配置', 'Remove worker group': '删除工作进程组',
    'Restrict server access with IP allow and block rules.': '用 IP 允许/阻止规则限制服务器访问。',
    'Restrict who can reach Pilot and deployed sites; off means open.': '限制谁能访问 Pilot 与已部署站点；关闭即完全开放。',
    'Loaded but idle. Nothing is inspected.': '已加载但空闲，不检查任何内容。'
  });

  // ─────────────────────────── 会话 / 二步验证 ───────────────────────────
  Object.assign(DICT, {
    'Two-factor authentication': '两步验证', 'Recovery codes': '恢复码',
    'Save your recovery codes': '保存你的恢复码', 'Regenerate recovery codes': '重新生成恢复码',
    'Get QR code': '获取二维码', 'Authentication code': '验证码', 'Device': '设备',
    'Devices': '设备', 'Add device': '添加设备', 'Remove device': '移除设备',
    'Device added': '设备已添加', 'Device removed': '设备已移除', 'Device name': '设备名称',
    'No devices enrolled': '尚未录入设备', 'Current session': '当前会话', 'Session actions': '会话操作',
    'Session revoked': '会话已注销', 'No active sessions': '无活动会话',
    'Sign-ins appear here while their tokens are valid.': '登录会话在令牌有效期内会显示在这里。',
    'Revoke session': '注销会话', 'Sign in again to continue.': '请重新登录以继续。',
    'You were signed out': '你已被登出', 'Login failed': '登录失败',
    'Require a code from an enrolled device at every sign-in.': '每次登录都要求来自已录入设备的验证码。',
    'New password': '新密码', 'Confirm new password': '确认新密码', 'Repeat new password': '再次输入新密码',
    'Current password': '当前密码', 'Enter password': '输入密码',
    'New passwords do not match.': '两次输入的新密码不一致。', 'Incorrect password.': '密码不正确。',
    'At least 8 characters': '至少 8 个字符', 'At least one number': '至少 1 个数字',
    'At least one symbol': '至少 1 个符号', 'Administrator password': '管理员密码',
    'Update the password that signs in to this bench.': '更新登录此 Bench 的密码。',
    'Use a different login name': '使用其他登录名', 'Login name': '登录名'
  });

  // ─────────────────────────── 通知 / 告警 / 邮件 ───────────────────────────
  Object.assign(DICT, {
    'Notification settings': '通知设置', 'Notification settings saved': '通知设置已保存',
    'Email recipients': '邮件收件人', 'No email recipients': '暂无邮件收件人',
    'Add an address to receive alerts by email.': '添加接收邮件告警的地址。',
    'Mail settings': '邮件设置', 'Mail settings saved': '邮件设置已保存',
    'Outgoing server': '发件服务器', 'Use SSL instead of STARTTLS': '使用 SSL 而非 STARTTLS',
    'Send alerts to a mailbox alongside Central and webhooks.': '把告警同时发送到邮箱（与中央服务、Webhook 并列）。',
    'Webhook endpoints': 'Webhook 端点', 'No webhook endpoints': '暂无 Webhook 端点',
    'Endpoints listed here receive alerts as a POST carrying an': '此处列出的端点会以 POST 形式收到告警，携带',
    'Nothing receives alerts yet. Add an endpoint to receive them.': '尚无接收告警的目标。请添加一个端点。',
    'Alert when host resource usage crosses a limit.': '主机资源使用超过阈值时告警。',
    'Alert when disk use on this host crosses the limit.': '本机磁盘使用超过阈值时告警。',
    'Alert when memory use on this host crosses the limit.': '本机内存使用超过阈值时告警。',
    'Alert when processor use on this host crosses the limit.': '本机 CPU 使用超过阈值时告警。',
    'Alert when a site stops responding to its uptime check.': '站点停止响应在线检查时告警。',
    'Triggered by': '触发条件', 'Received': '已接收', 'Sent': '已发送', 'Event': '事件',
    'Unread': '未读', 'Read': '已读',
    'Every notification on this bench has been read.': '此 Bench 的所有通知都已读。',
    'Close notifications': '关闭通知', 'Close settings': '关闭设置'
  });

  // ─────────────────────────── AI 助手 ───────────────────────────
  Object.assign(DICT, {
    'AI assistant settings': 'AI 助手设置', 'AI assistant settings saved': 'AI 助手设置已保存',
    'AI assistant disconnected': 'AI 助手已断开', 'AI debugging failed.': 'AI 调试失败。',
    'Debug with AI Assistant': '用 AI 助手调试', 'AI debugging failed.': 'AI 调试失败。',
    'Connect an LLM provider to power assistant features.': '连接 LLM 提供方以启用助手功能。',
    'Select a provider first': '请先选择提供方', 'Search providers…': '搜索提供方…',
    'Search models…': '搜索模型…', 'Enter the API base URL to load models': '输入 API 基础地址以加载模型',
    'Enter the API key to load models': '输入 API Key 以加载模型', 'API Base URL': 'API 基础地址',
    'API Key': 'API Key', 'Model': '模型', 'Your served model name': '你部署的模型名',
    'Max Tokens': '最大 Token 数', 'System Prompt': '系统提示词',
    'Instructions sent with every request': '每次请求都会带上这段指令',
    'Token': '令牌', 'Update Token': '更新令牌', 'Personal Access Token': '个人访问令牌',
    'Leave blank to use the provider default': '留空则使用提供方默认值'
  });

  // ─────────────────────────── Git / 仓库 ───────────────────────────
  Object.assign(DICT, {
    'Git': 'Git', 'Git settings': 'Git 设置', 'Git account disconnected': 'Git 账号已断开',
    'Connect GitHub': '连接 GitHub', 'Your GitHub account': '你的 GitHub 账号',
    'No GitHub account connected': '未连接 GitHub 账号',
    'Connect GitHub for private installs and repo browsing.': '连接 GitHub 以安装私有应用、浏览仓库。',
    'Paste a personal access token to connect.': '粘贴个人访问令牌以连接。',
    'Search repositories…': '搜索仓库…', 'No repositories found.': '未找到仓库。',
    'Search branches…': '搜索分支…', 'Search or type a branch…': '搜索或输入分支…',
    'No matching branch. Type one to use it.': '没有匹配的分支。可直接输入一个使用。',
    'Use typed branch': '使用输入的分支', 'Checking repository…': '正在检查仓库…',
    'Switch branch': '切换分支', 'Switch Branch': '切换分支', 'New branch': '新分支',
    'The repository does not contain the Frappe app.': '此仓库中不包含该 Frappe 应用。'
  });

  // ─────────────────────────── 域名 / SSL ───────────────────────────
  Object.assign(DICT, {
    'Domain actions': '域名操作', 'Admin domain': '管理域名', 'Add domain': '添加域名',
    'Remove domain': '删除域名', 'Make primary': '设为主域名', 'Verify DNS': '验证 DNS',
    'DNS Records': 'DNS 记录', 'No DNS records needed': '无需 DNS 记录',
    'Setup Let\'s Encrypt': '配置 Let\'s Encrypt', 'Let\'s Encrypt email': 'Let\'s Encrypt 邮箱',
    'Enable SSL': '启用 SSL', 'Use your own domain': '使用你自己的域名',
    'Issue a Let\'s Encrypt certificate and serve this site over HTTPS.': '签发 Let\'s Encrypt 证书并通过 HTTPS 提供服务。',
    'Admin domain is required so the bench is reachable.': '需要管理域名，以便访问该 bench。',
    'Add this record at your domain provider.': '在你的域名服务商处添加这条记录。',
    'Points to': '指向', 'Setup Nginx': '配置 Nginx'
  });

  // ─────────────────────────── 字段 / 表头 / 时间 ───────────────────────────
  Object.assign(DICT, {
    'Branch': '分支', 'Provider': '提供方', 'Port': '端口', 'Host': '主机', 'IP address': 'IP 地址',
    'Endpoint URL': '端点地址', 'Mode': '模式', 'Value': '值', 'Type': '类型',
    'All types': '全部类型', 'Time': '时间', 'Duration': '耗时', 'Duration (s)': '耗时（秒）',
    'Frequency': '频率', 'Runs': '运行次数', 'Calls': '调用次数', 'Name': '名称', 'Size': '大小',
    'User': '用户', 'Users': '用户', 'Role': '角色', 'Roles': '角色', 'Email': '邮箱',
    'Email address': '邮箱地址', 'Password': '密码', 'Task': '任务', 'Count': '计数',
    'Day of month': '每月第几天', 'Day of week': '每周星期几', 'Private files': '私有文件',
    'Public files': '公共文件', 'Download Private': '下载私有文件', 'Download Public': '下载公共文件',
    'Download Database': '下载数据库', 'Download Config': '下载配置', 'Config': '配置',
    'Site config': '站点配置', 'Config actions': '配置操作', 'Add config': '添加配置',
    'Key': '键', 'Key is required.': '必须填写键。', 'Key already exists.': '键已存在。',
    'Unnamed key': '未命名键', 'Invalid value.': '值无效。', 'Title': '标题', 'Description': '描述',
    'Type': '类型', 'Date': '日期', 'Yearly': '每年', 'Daily': '每天', 'Weekly': '每周',
    'Monthly': '每月', 'Nightly': '每夜', 'Hourly': '每小时', 'Every': '每',
    'Monday': '周一', 'Tuesday': '周二', 'Wednesday': '周三', 'Thursday': '周四',
    'Friday': '周五', 'Saturday': '周六', 'Sunday': '周日',
    'Daily, 2:00 AM': '每天 02:00', 'Weekly, Sunday 2:00 AM': '每周日 02:00',
    'Light': '浅色', 'Dark': '深色', 'Theme': '主题', 'Language': '语言', 'Time zone': '时区',
    'All': '全部', 'None': '无', 'Any': '任意', 'All types': '全部类型'
  });

  // ─────────────────────────── 错误 / 失败消息 ───────────────────────────
  Object.assign(DICT, {
    'Action failed.': '操作失败。', 'Bench action failed': 'Bench 操作失败',
    'Unsupported bench action.': '不支持的 Bench 操作。',
    'Backup failed.': '备份失败。', 'Restore failed': '还原失败', 'Revert failed': '回退失败',
    'Migration failed': '迁移失败', 'Uninstall failed.': '卸载失败。', 'Update failed': '更新失败',
    'Delete failed.': '删除失败。', 'Failed to remove.': '移除失败。', 'Request failed.': '请求失败。',
    'Query failed.': '查询失败。', 'Login failed': '登录失败',
    'Failed to save.': '保存失败。', 'Could not save.': '无法保存。',
    'Failed to save configuration.': '保存配置失败。', 'Failed to load schedule.': '计划加载失败。',
    'Failed to load domains.': '域名加载失败。', 'Failed to load activity': '活动加载失败',
    'Failed to load more activity': '加载更多活动失败', 'Failed to load log': '日志加载失败',
    'Failed to load logs': '日志加载失败', 'Failed to load marketplace': '应用市场加载失败',
    'Failed to load notifications': '通知加载失败', 'Failed to load more notifications': '加载更多通知失败',
    'Failed to load site': '站点加载失败', 'Failed to load sites': '站点列表加载失败',
    'Failed to load task': '任务加载失败', 'Failed to load tasks': '任务列表加载失败',
    'Failed to load analytics.': '分析数据加载失败。', 'Failed to start setup.': '启动安装失败。',
    'Failed to start update.': '启动更新失败。', 'Failed to update.': '更新失败。',
    'Failed to validate domain.': '域名校验失败。',
    'Could not load settings.': '无法加载设置。', 'Could not load activity.': '无法加载活动。',
    'Could not load authentication data.': '无法加载认证数据。',
    'Could not load backup settings.': '无法加载备份设置。',
    'Could not load database capabilities.': '无法加载数据库能力。',
    'Could not load database configurations.': '无法加载数据库配置。',
    'Could not load more backups.': '无法加载更多备份。',
    'Could not load offsite backup.': '无法加载异地备份。',
    'Could not load SSH keys.': '无法加载 SSH 密钥。',
    'Could not load storage breakdown.': '无法加载存储明细。',
    'Could not load this update.': '无法加载此更新。',
    'Could not load two-factor settings.': '无法加载两步验证设置。',
    'Could not load updates.': '无法加载更新。',
    'Could not load version information.': '无法加载版本信息。',
    'Could not open the setup wizard': '无法打开安装向导',
    'Could not reach Frappe Cloud.': '无法连接 Frappe Cloud。',
    'Could not reach the AI assistant.': '无法连接 AI 助手。',
    'Could not reach the server': '无法连接服务器',
    'Could not read Frappe storage regions from Central.': '无法从中央服务读取 Frappe 存储区域。',
    'Could not regenerate recovery codes.': '无法重新生成恢复码。',
    'Could not remove that device.': '无法移除该设备。',
    'Could not revoke other sessions.': '无法注销其他会话。',
    'Could not save AI assistant settings.': '无法保存 AI 助手设置。',
    'Could not save object storage settings.': '无法保存对象存储设置。',
    'Could not start enrollment.': '无法开始录入。', 'Could not start install.': '无法开始安装。',
    'Could not start removal.': '无法开始移除。', 'Could not take a backup.': '无法执行备份。',
    'Could not update developer mode setting.': '无法更新开发者模式设置。',
    'Could not update lite mode setting.': '无法更新精简模式设置。',
    'Could not update the database configuration.': '无法更新数据库配置。',
    'Could not update the notification.': '无法更新通知。',
    'Could not upload the file.': '无法上传文件。',
    'Could not verify that code.': '无法验证该验证码。',
    'Could not cancel the request.': '无法取消请求。',
    'Could not change the password.': '无法修改密码。',
    'Could not check for updates.': '无法检查更新。', 'Could not check the backup.': '无法检查备份。',
    'Could not check the request.': '无法检查请求。', 'Could not check the upload.': '无法检查上传。',
    'Could not copy': '无法复制', 'Could not create bench.': '无法创建 Bench。',
    'Could not disable app.': '无法禁用应用。',
    'Could not disconnect object storage.': '无法断开对象存储。',
    'Could not disconnect the AI assistant.': '无法断开 AI 助手。',
    'Could not generate DNS records.': '无法生成 DNS 记录。',
    'Could not start the branch switch.': '无法启动分支切换。',
    'Could not load monitoring data.': '无法加载监控数据。',
    'Could not load binary logs.': '无法加载二进制日志。',
    'Could not delete binary logs.': '无法删除二进制日志。',
    'Could not purge binary logs.': '无法清理二进制日志。',
    'Could not load database diagnostics.': '无法加载数据库诊断。',
    'Could not load database lock waits.': '无法加载数据库锁等待。',
    'Could not load database metrics.': '无法加载数据库指标。',
    'Could not load database processes.': '无法加载数据库进程。',
    'Could not load models.': '无法加载模型。',
    'Could not load the index report.': '无法加载索引报告。',
    'Could not load the query report.': '无法加载查询报告。',
    'Could not load uptime data.': '无法加载在线时长数据。',
    'Could not read table sizes.': '无法读取表大小。',
    'Could not read the database size.': '无法读取数据库大小。',
    'Could not start the database action.': '无法启动数据库操作。',
    'Could not kill the process.': '无法终止进程。',
    'Could not add key.': '无法添加密钥。', 'Could not remove key.': '无法删除密钥。',
    'Could not create site.': '无法创建站点。', 'Could not create the app.': '无法创建应用。',
    'Could not import app.': '无法导入应用。',
    'Could not get the backups of this site.': '无法获取此站点的备份。',
    'Could not find a Frappe app in this repository.': '此仓库中找不到 Frappe 应用。',
    'Could not list the branches of this repository.': '无法列出此仓库的分支。',
    'Could not load branches.': '无法加载分支。',
    'Could not validate the Frappe branch.': '无法校验 Frappe 分支。',
    'Could not verify token.': '无法校验令牌。', 'Could not enabled SSL.': '无法启用 SSL。',
    'Could not enable SSL.': '无法启用 SSL。', 'Could not start the restore.': '无法启动还原。',
    'Could not start backup': '无法启动备份',
    'Could not log in as admin': '无法以管理员身份登录',
    'Could not revoke session': '无法注销会话',
    'Could not load branches.': '无法加载分支。',
    'Could not load settings.': '无法加载设置。',
    "Couldn't load notifications": '无法加载通知',
    "Couldn't debug this task": '无法调试此任务',
    "Couldn't load this section": '无法加载此部分',
    "Couldn't open Cloud settings. Please try again.": '无法打开云端设置，请重试。',
    'Setup failed. Open the details to see what went wrong, then try again.': '安装失败。展开详情查看原因后重试。',
    'Setup did not return a task to follow.': '安装未返回可跟踪的任务。',
    'The site login link is invalid.': '站点登录链接无效。',
    'The upload lost its connection.': '上传连接中断。',
    'The upload was cancelled.': '上传已取消。',
    'Frappe Cloud could not take the backup.': 'Frappe Cloud 无法执行备份。',
    'Backup file not found offsite.': '未在异地存储找到备份文件。',
    'AI debugging failed.': 'AI 调试失败。',
    'Allow pop-ups to open the site.': '允许弹出窗口以打开站点。',
    'Admin tooling may start tripping it.': '管理工具可能会触发它。',
    'Failed to build assets.': '构建资源失败。', 'Failed to clear cache.': '清除缓存失败。',
    'Failed to drop site.': '删除站点失败。', 'Failed to migrate site.': '迁移站点失败。',
    'Failed to refresh storage usage.': '刷新存储用量失败。', 'Failed to remove domain.': '移除域名失败。',
    'Failed to rename site.': '重命名站点失败。', 'Failed to reset site.': '重置站点失败。',
    'Failed to save schedule.': '保存计划失败。', 'Failed to set primary domain.': '设置主域名失败。',
    'Failed to add domain.': '添加域名失败。', 'Failed to cancel task': '取消任务失败。',
    'Failed to get offsite download link.': '获取异地下载链接失败。',
    'Delete failed.': '删除失败。', 'No output.': '无输出。', 'No output yet…': '暂无输出…',
    'Enter a whole number.': '请输入整数。', 'Invalid value.': '值无效。',
    'Must be an email address.': '必须是邮箱地址。',
    'Must be a positive whole number.': '必须是正整数。',
    'Limit must be a whole percentage between 1 and 100.': '阈值必须是 1–100 的整数百分比。',
    'Port must be a number between 1 and 65535.': '端口必须是 1–65535 之间的数字。',
    'Host is required for an external database': '外部数据库必须填写主机',
    'Authentication is required.': '需要登录。', 'Please try again.': '请重试。',
    'Something went wrong.': '出错了。', 'Try again.': '请重试。',
    'MariaDB will restart to apply this change.': 'MariaDB 将重启以应用此更改。',
    'System-managed and secret-like configuration keys cannot be changed.': '系统管理及密钥类配置项不可修改。',
    'Stop pilot start and run it again to use the new version.': '停止 pilot start 后重新运行以使用新版本。',
    'The last step restarts the admin service.': '最后一步会重启管理服务。',
    'No apps found.': '未找到应用。', 'No apps found in this bench.': '此 Bench 中没有应用。',
    'No repositories found.': '未找到仓库。',
    'No sites match your search or status filter.': '没有符合搜索或状态筛选的站点。',
    'No backups found. Take a backup on that site first.': '没有找到备份。请先为该站点做一次备份。',
    'No matching branch. Type one to use it.': '没有匹配的分支。可直接输入一个使用。',
    'Key added': '密钥已添加', 'Key removed': '密钥已删除',
    'Notification settings saved': '通知设置已保存',
    'Loading…': '加载中…', 'Loading...': '加载中…', 'Loading binary logs…': '正在加载二进制日志…',
    'Loading branches…': '正在加载分支…', 'Analyzing the failure…': '正在分析失败原因…'
  });

  // ─────────────────────────── 补充 ───────────────────────────
  Object.assign(DICT, {
    'Allow developer mode': '允许开发者模式', 'Any app': '任意应用', 'Auto Refresh': '自动刷新',
    'Choose': '选择', 'Clear': '清除', 'Clear cache': '清除缓存', 'Clear Cache': '清除缓存',
    'Command': '命令', 'Configure': '配置', 'Connected': '已连接',
    'Connect to external database': '连接外部数据库', 'Current': '当前', 'Alternative': '备选',
    'Delete this file and every older one': '删除此文件及所有更早的',
    'Deploy to production': '部署到生产', 'Developer mode': '开发者模式', 'Develop locally': '本地开发',
    'Documentation': '文档', 'Drop': '删除', 'E-Commerce': '电商', 'Human Resources': '人力资源',
    'Insert': '插入', 'Kept from': '保留自', 'Lite mode': '精简模式', 'Log': '日志',
    'Log only': '仅记录', 'Maintenance mode': '维护模式', 'Manager': '管理器',
    'Migrate site': '迁移站点', 'Migrate Site': '迁移站点', 'My Phone': '我的手机',
    'Newest deleted': '删除最新的', 'New name': '新名称', 'Next match': '下一个匹配',
    'No firewall rules': '暂无防火墙规则', 'Non-Profit': '非营利组织',
    'Oldest deleted': '删除最旧的', 'Open in editor': '在编辑器中打开', 'Open site': '打开站点',
    'Previous match': '上一个匹配', 'Process CPU': '进程 CPU', 'Process manager': '进程管理器',
    'Process Memory': '进程内存', 'Recovering sites': '正在恢复站点', 'Register': '注册',
    'Required version': '要求的版本', 'Restore in progress': '正在还原',
    'Root username': 'root 用户名', 'Root user password': 'root 密码', 'Running for': '已运行',
    'Save schedule': '保存计划', 'Search log files': '搜索日志文件', 'Search this log': '搜索此日志',
    'Select a log file': '选择日志文件', 'Select a site to get started': '选择一个站点开始',
    'Server settings': '服务器设置', 'Site, database and uploaded files': '站点、数据库与上传文件',
    'Slow queries by site': '各站点慢查询', 'Started': '已启动', 'Supervisor': '进程管理器',
    'Systemd': 'Systemd', 'Time consuming': '耗时', 'Unused': '未使用',
    'Update 2 apps': '更新 2 个应用', 'Update and restart': '更新并重启', 'Update CLI': '更新 CLI',
    'Updated successfully': '更新成功', 'Update erpnext': '更新 erpnext',
    'Update erpnext, hrms': '更新 erpnext、hrms', 'Upload files': '上传文件',
    'Use existing database': '使用已有数据库', 'Welcome! Please sign in to continue.': '欢迎！请登录以继续。',
    "You're on the latest version.": '已是最新版本。', 'Failed to create bench': '创建 Bench 失败',
    'CRM Integration': 'CRM 集成', 'Customer Relations': '客户关系', 'Endpoint URL': '端点地址',
    "Let's Encrypt email": "Let's Encrypt 邮箱", 'Setup Let\'s Encrypt': "配置 Let's Encrypt",
    'Enables per-site developer mode and code editor.': '为站点启用开发者模式与代码编辑器。',
    'Fix the cause and run the restore again.': '修复原因后重新执行还原。',
    'Inspect MariaDB system variables and tune guarded dynamic settings.':
      '查看 MariaDB 系统变量并调整受保护的动态设置。',
    "Issue a Let's Encrypt certificate and serve this site over HTTPS.":
      "签发 Let's Encrypt 证书并通过 HTTPS 提供服务。",
    'Lets developers customise doctypes on this site.': '允许开发者在此站点上自定义 DocType。',
    'Measure this bench\'s sites again. Usage is collected every six hours.':
      '重新测算此 Bench 各站点的用量。用量每六小时采集一次。',
    "Monitoring hasn't collected metrics in this range yet.": '此时间范围内尚未采集到指标。',
    'Number with a k, m or g suffix, e.g. 50m.': '数字可带 k/m/g 后缀，例如 50m。',
    "Queries run against that site's database.": '对比该站点数据库执行的查询。',
    "Rebuild JS and CSS for this site's apps.": '为此站点的应用重建 JS 与 CSS。',
    'Scheduled emails, reports and automations.': '定时邮件、报表与自动化。',
    "Some columns aren't available for PostgreSQL": 'PostgreSQL 下部分列不可用',
    "The monitor hasn't sampled the database in this range yet.": '此时间范围内尚未对数据库采样。',
    'Insert': '插入'
  });

  // ─────────────────────────── 存储页 + 动态模式 ───────────────────────────
  Object.assign(DICT, {
    'Database storage': '数据库存储', 'App storage': '应用存储', 'of': '/', 'used': '已用'
  });

  var PATTERNS = [
    { re: /^(\d+) databases$/, repl: '$1 个数据库' },
    { re: /^(\d+) apps$/, repl: '$1 个应用' },
    { re: /^(\d+) sites$/, repl: '$1 个站点' },
    { re: /^(\d+) backups?$/, repl: '$1 份备份' },
    { re: /^(\w+) (binary log|error log|slow query log|binary log index|write-ahead log|server log|core files)$/,
      repl: function (m, engine, label) {
        var E = { mariadb: 'MariaDB', postgresql: 'PostgreSQL', sqlite: 'SQLite' };
        var L = { 'binary log': '二进制日志', 'error log': '错误日志', 'slow query log': '慢查询日志',
                  'binary log index': '二进制日志索引', 'write-ahead log': '预写日志',
                  'server log': '服务器日志', 'core files': '核心文件' };
        return (E[engine] || engine) + ' ' + (L[label] || label);
      } }
  ];

  // ─────────────────────────── 运行时翻译逻辑 ───────────────────────────
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, SVG: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function tr(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var key = raw.trim();
    if (!key) return;
    var hit = DICT[key];
    if (hit === undefined) {
      for (var i = 0; i < PATTERNS.length; i++) {
        if (PATTERNS[i].re.test(key)) { hit = key.replace(PATTERNS[i].re, PATTERNS[i].repl); break; }
      }
    }
    if (hit === undefined || hit === key) return;
    node.nodeValue = raw.replace(key, hit);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { tr(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP[root.tagName] || (root.hasAttribute && root.hasAttribute('data-no-i18n'))) return;
    for (var i = 0; i < root.childNodes.length; i++) walk(root.childNodes[i]);
    for (var a = 0; a < ATTRS.length; a++) {
      var v = root.getAttribute && root.getAttribute(ATTRS[a]);
      if (v && DICT[v.trim()] !== undefined) root.setAttribute(ATTRS[a], DICT[v.trim()]);
    }
  }

  function runAll() { if (document.body) walk(document.body); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runAll);
  else runAll();

  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') tr(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  window.__pilotCn = { dict: DICT, run: runAll, count: Object.keys(DICT).length };
})();
