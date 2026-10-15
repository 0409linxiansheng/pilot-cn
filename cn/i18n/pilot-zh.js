/* pilot-cn —— Pilot 管理面板中文翻译（运行时注入，不改前端源码）
 *
 * 原理：面板是 Vue SPA，文案硬编码英文。本脚本在页面加载后遍历 DOM，
 *       按「整段精确匹配」把英文换成中文，并用 MutationObserver 处理动态渲染。
 *
 * 为什么运行时注入：翻译只存在于 cn/ 层 + 一个极小的后端补丁里，
 *       上游 Pilot 升级不会覆盖（见 cn/patches/README.md）。
 *
 * 扩展：往 DICT 里加 '英文原文': '中文'，刷新页面即生效（服务端每次请求重读本文件）。
 */
(function () {
  'use strict';

  var DICT = {
    // ── 侧边栏导航 ──
    'Sites': '站点', 'Site': '站点', 'All sites': '全部站点', 'Storage': '存储',
    'Marketplace': '应用市场', 'Insights': '洞察', 'Analytics': '分析',
    'Updates': '更新', 'Update': '更新', 'Tasks': '任务', 'Logs': '日志',
    'Dev tools': '开发工具', 'Dev Tools': '开发工具',
    'DB analyzer': '数据库分析', 'SQL playground': 'SQL 沙盒', 'Code editor': '代码编辑器',

    // ── 操作 / 按钮 ──
    'Save': '保存', 'Saved': '已保存', 'Cancel': '取消', 'Close': '关闭', 'Open': '打开',
    'Delete': '删除', 'Remove': '移除', 'Edit': '编辑', 'Rename': '重命名', 'Add': '添加',
    'New': '新建', 'Create': '创建', 'Copy': '复制', 'Download': '下载', 'Upload': '上传',
    'Install': '安装', 'Uninstall': '卸载', 'Enable': '启用', 'Disable': '禁用',
    'Connect': '连接', 'Disconnect': '断开连接', 'Verify': '验证', 'Regenerate': '重新生成',
    'Retry': '重试', 'Refresh': '刷新', 'Search': '搜索', 'Filter': '筛选', 'Block': '阻止',
    'Allow': '允许', 'Back': '返回', 'Continue': '继续', 'Confirm': '确认', 'Actions': '操作',
    'Action': '操作', 'Load more': '加载更多', 'Show less': '收起', 'View': '查看',
    'View jobs': '查看任务', 'View analytics': '查看分析', 'Try again.': '请重试。',
    'Login': '登录', 'Log in': '登录', 'Logout': '退出登录', 'Log out': '退出登录',
    'Sign in': '登录', 'Sign out': '退出登录', 'Skip patch': '跳过补丁',

    // ── 状态 ──
    'Status': '状态', 'State': '状态', 'Active': '活跃', 'Inactive': '未激活',
    'Running': '运行中', 'Pending': '待处理', 'Paused': '已暂停', 'Queued': '排队中',
    'Stopped': '已停止', 'Completed': '已完成', 'Success': '成功', 'Failed': '失败',
    'Error': '错误', 'Warning': '警告', 'Broken': '异常', 'Idle': '空闲', 'Off': '关闭',
    'On': '开启', 'Enabled': '已启用', 'Disabled': '已禁用', 'Creating': '创建中…',
    'Migrating': '迁移中…', 'Backing up': '备份中…', 'Recovering': '恢复中…',
    'Recovered': '已恢复', 'Reverted': '已回滚', 'Needs attention': '需要关注',
    'Already installed': '已安装', 'Unavailable': '不可用', 'Installed': '已安装',
    'Waiting for configuration': '等待配置', 'Starting…': '启动中…',
    'Admin active': '管理员在线', 'Logged in as admin': '已以管理员登录',
    'Logging in as admin': '正在以管理员登录…', 'Password changed': '密码已修改',
    'Query failed': '查询失败', 'Legacy error.': '历史错误。', 'Bad input.': '输入无效。',

    // ── 板块 / 章节 ──
    'Utility': '工具', 'Business': '业务', 'Activity': '活动', 'Server': '服务器',
    'Database': '数据库', 'Integrations': '集成', 'Setup': '安装向导', 'System': '系统',
    'Central': '中央服务', 'Payments': '支付', 'General': '通用', 'Notifications': '通知',
    'Localization': '本地化', 'Home': '首页', 'Other': '其他', 'Featured': '精选',
    'Settings': '设置', 'Backups': '备份', 'Backup': '备份', 'Restore': '还原',
    'Migrate': '迁移', 'Apps': '应用', 'App': '应用', 'Domains': '域名', 'Domain': '域名',

    // ── 字段 / 表头 ──
    'Site name': '站点名称', 'Site files': '站点文件', 'Branch': '分支', 'Provider': '提供方',
    'Port': '端口', 'Host': '主机', 'IP address': 'IP 地址', 'Admin domain': '管理域名',
    'API Base URL': 'API 基础地址', 'Endpoint URL': '端点地址', 'Mode': '模式',
    'Model': '模型', 'Table': '表', 'Table Name': '表名', 'Index': '索引', 'Key': '键',
    'Value': '值', 'Type': '类型', 'All types': '全部类型', 'Time': '时间',
    'Duration': '耗时', 'Duration (s)': '耗时（秒）', 'Frequency': '频率',
    'Requests': '请求数', 'Runs': '运行次数', 'Calls': '调用次数', 'Memory': '内存',
    'Name': '名称', 'Size': '大小', 'User': '用户', 'Users': '用户', 'Role': '角色',
    'Email': '邮箱', 'Password': '密码', 'New password': '新密码', 'Task': '任务',
    'Day of month': '每月第几天', 'Day of week': '每周星期几', 'Last run': '上次运行',
    'Private files': '私有文件', 'Public files': '公共文件', 'Site actions': '站点操作',

    // ── 监控 / 指标 ──
    'Cached + Buffers': '缓存 + 缓冲区', 'Swap Used': '已用交换分区',
    'Load Average 1': '1 分钟负载', 'Load Average 5': '5 分钟负载',
    'Load Average 15': '15 分钟负载', 'Max Connections': '最大连接数',
    'Buffer Pool Size': '缓冲池大小', 'Buffer Pool % RAM': '缓冲池占内存 %',
    'Buffer Pool Miss %': '缓冲池未命中 %', 'Performance Schema': '性能架构',
    'Avg Row Lock Wait': '平均行锁等待', 'Frequent slow queries': '高频慢查询',
    'Background jobs': '后台任务', 'Activity details': '活动详情', 'Supervisor': '进程管理器',
    'Web application firewall': 'Web 应用防火墙', 'MariaDB': 'MariaDB', 'PostgreSQL': 'PostgreSQL',
    'Restart MariaDB': '重启 MariaDB', 'Refresh database capabilities': '刷新数据库能力',
    'Refresh database configurations': '刷新数据库配置',
    'Update Max DB Connections': '更新最大数据库连接数',
    'Update InnoDB Buffer Pool Size': '更新 InnoDB 缓冲池大小',
    'Update and restart': '更新并重启', 'Back up now': '立即备份',

    // ── 时间 ──
    'Daily': '每天', 'Weekly': '每周', 'Monthly': '每月', 'Nightly': '每夜',
    'Monday': '周一', 'Tuesday': '周二', 'Wednesday': '周三', 'Thursday': '周四',
    'Friday': '周五', 'Saturday': '周六', 'Sunday': '周日',
    'Light': '浅色', 'Dark': '深色', 'All': '全部', 'None': '无',

    // ── 消息 / 报错 ──
    'Could not load settings.': '无法加载设置。', 'Failed to save.': '保存失败。',
    'Could not save.': '无法保存。', 'Failed to load analytics.': '分析数据加载失败。',
    'No output.': '无输出。', 'Backup failed.': '备份失败。', 'Delete failed.': '删除失败。',
    'Could not enable SSL.': '无法启用 SSL。', 'Could not load binary logs.': '无法加载二进制日志。',
    'Could not start the restore.': '无法启动还原。', 'The upload was cancelled.': '上传已取消。',
    'Could not add key.': '无法添加密钥。', 'Could not remove key.': '无法删除密钥。',
    'Could not create site.': '无法创建站点。', 'Could not create the app.': '无法创建应用。',
    'Could not delete binary logs.': '无法删除二进制日志。',
    'Could not find a Frappe app in this repository.': '此仓库中找不到 Frappe 应用。',
    'Could not get the backups of this site.': '无法获取此站点的备份。',
    'Could not import app.': '无法导入应用。', 'Could not kill the process.': '无法终止进程。',
    'Could not list the branches of this repository.': '无法列出此仓库的分支。',
    'Could not load branches.': '无法加载分支。',
    'Could not load database diagnostics.': '无法加载数据库诊断。',
    'Could not load database lock waits.': '无法加载数据库锁等待。',
    'Could not load database metrics.': '无法加载数据库指标。',
    'Could not load database processes.': '无法加载数据库进程。',
    'Could not load models.': '无法加载模型。', 'Could not load monitoring data.': '无法加载监控数据。',
    'Could not load the index report.': '无法加载索引报告。',
    'Could not load the query report.': '无法加载查询报告。',
    'Could not load uptime data.': '无法加载在线时长数据。',
    'Could not purge binary logs.': '无法清理二进制日志。',
    'Could not read table sizes.': '无法读取表大小。',
    'Could not read the database size.': '无法读取数据库大小。',
    'Could not start the branch switch.': '无法启动分支切换。',
    'Could not start the database action.': '无法启动数据库操作。',
    'Could not validate the Frappe branch.': '无法校验 Frappe 分支。',
    'Could not verify token.': '无法校验令牌。', 'Could not start backup': '无法启动备份',
    'Could not log in as admin': '无法以管理员身份登录',
    'Could not revoke session': '无法注销会话', 'Could not start the database action': '无法启动数据库操作',
    'Enter a whole number.': '请输入整数。', 'Invalid value.': '值无效。',
    'Must be an email address.': '必须是邮箱地址。', 'Authentication is required.': '需要登录。',
    'Failed to add domain.': '添加域名失败。', 'Failed to build assets.': '构建资源失败。',
    'Failed to clear cache.': '清除缓存失败。', 'Failed to drop site.': '删除站点失败。',
    'Failed to migrate site.': '迁移站点失败。', 'Failed to refresh storage usage.': '刷新存储用量失败。',
    'Failed to remove domain.': '移除域名失败。', 'Failed to rename site.': '重命名站点失败。',
    'Failed to reset site.': '重置站点失败。', 'Failed to save schedule.': '保存计划失败。',
    'Failed to set primary domain.': '设置主域名失败。', 'Failed to cancel task': '取消任务失败。',
    'MariaDB will restart to apply this change.': 'MariaDB 将重启以应用此更改。',
    'System-managed and secret-like configuration keys cannot be changed.':
      '系统管理及密钥类配置项不可修改。',
    'Remove SSH key': '删除 SSH 密钥', 'Remove device': '移除设备', 'Add device': '添加设备',
    'Delete Backup': '删除备份', 'Delete binary logs': '删除二进制日志',
    'Drop Bench': '删除 Bench', 'Drop Site': '删除站点', 'Drop site': '删除站点',
    'New Site': '新建站点', 'Rename Site': '重命名站点', 'Reset site': '重置站点',
    'Restore Site': '还原站点', 'Restore backup': '还原备份', 'Migrate Site': '迁移站点',
    'Migrate site': '迁移站点', 'Switch branch': '切换分支', 'Switch Bench': '切换 Bench',
    'Enable SSL': '启用 SSL', 'Open site': '打开站点', 'Select site': '选择站点',
    'Select a log file': '选择日志文件', 'Search or type a branch…': '搜索或输入分支…',
    'Connect GitHub': '连接 GitHub', 'Revoke session': '注销会话',
    'Type the site name to confirm': '输入站点名称以确认',

    // ── 说明性文字 ──
    'Clear this site\'s cache if something looks stale.': '若界面显示陈旧（数据未更新），可清除此站点缓存。',
    'Configure background worker groups and queues.': '配置后台工作进程组与队列。',
    'Connect GitHub for private installs and repo browsing.': '连接 GitHub 以安装私有应用、浏览仓库。',
    'Collect database instrumentation for deeper performance diagnostics.':
      '采集数据库埋点，用于更深入的性能诊断。',
    'Automatic backups run on schedule. You can also back up now.':
      '自动备份按计划运行，也可以立即备份。',
    'Actions taken by this session will show up here.': '本次会话的操作会显示在这里。',
    'Add a public key to give its holder SSH access to this server.':
      '添加公钥，使其持有者可 SSH 登录本服务器。',
    'Add an address to receive alerts by email.': '添加接收邮件告警的地址。',
    'Alert when disk use on this host crosses the limit.': '本机磁盘使用超过阈值时告警。',
    'Alert when memory use on this host crosses the limit.': '本机内存使用超过阈值时告警。',
    'Alert when processor use on this host crosses the limit.': '本机 CPU 使用超过阈值时告警。',
    'Alert when a site stops responding to its uptime check.': '站点停止响应在线检查时告警。',
    'App updates across your sites appear here, with backup and recovery.':
      '各站点的应用更新会显示在这里，含备份与恢复。',
    'Admin domain is required so the bench is reachable.': '需要管理域名，以便访问该 bench。'
  };

  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, SVG: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function tr(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var key = raw.trim();
    if (!key) return;
    var hit = DICT[key];
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
