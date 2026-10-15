/* pilot-cn —— Pilot 管理面板中文翻译（运行时注入，不改前端源码）
 *
 * 原理：面板是 Vue SPA，文案硬编码英文。本脚本在页面加载后遍历 DOM，
 *       按「整段精确匹配」把英文换成中文，并用 MutationObserver 处理后续动态渲染。
 *
 * 为什么用运行时注入：这样翻译只存在于 cn/ 层与一个极小的后端补丁里，
 *       上游 Pilot 升级时不会被覆盖（见 cn/patches/README.md）。
 *
 * 扩展方式：直接往 DICT 里加 '英文': '中文'，刷新页面即可生效。
 */
(function () {
  'use strict';

  var DICT = {
    // ── 侧边栏导航 ──
    'Sites': '站点',
    'Site': '站点',
    'All sites': '全部站点',
    'Storage': '存储',
    'Marketplace': '应用市场',
    'Insights': '洞察',
    'Analytics': '分析',
    'Updates': '更新',
    'Update': '更新',
    'Tasks': '任务',
    'Logs': '日志',
    'Dev tools': '开发工具',
    'Dev Tools': '开发工具',
    'DB analyzer': '数据库分析',
    'SQL playground': 'SQL 沙盒',
    'Code editor': '代码编辑器',

    // ── 常用操作 ──
    'Save': '保存',
    'Saved': '已保存',
    'Cancel': '取消',
    'Close': '关闭',
    'Delete': '删除',
    'Remove': '移除',
    'Edit': '编辑',
    'Rename': '重命名',
    'Add': '添加',
    'New': '新建',
    'Create': '创建',
    'Creating': '创建中…',
    'Copy': '复制',
    'Download': '下载',
    'Upload': '上传',
    'Install': '安装',
    'Installing': '安装中…',
    'Uninstall': '卸载',
    'Enable': '启用',
    'Disable': '禁用',
    'Enabled': '已启用',
    'Disabled': '已禁用',
    'Retry': '重试',
    'Refresh': '刷新',
    'Search': '搜索',
    'Filter': '筛选',
    'Filter by': '筛选条件',
    'Confirm': '确认',
    'Continue': '继续',
    'Back': '返回',
    'Next': '下一步',
    'Previous': '上一步',
    'Done': '完成',
    'OK': '确定',
    'Yes': '是',
    'No': '否',
    'View': '查看',
    'View jobs': '查看任务',
    'Details': '详情',
    'Overview': '概览',
    'Settings': '设置',
    'General': '通用',
    'Advanced': '高级',

    // ── 状态 ──
    'Status': '状态',
    'State': '状态',
    'Active': '活跃',
    'Inactive': '未激活',
    'Running': '运行中',
    'Pending': '待处理',
    'Paused': '已暂停',
    'Queued': '排队中',
    'Success': '成功',
    'Failed': '失败',
    'Error': '错误',
    'Warning': '警告',
    'Broken': '异常',
    'Busy': '忙碌',
    'Idle': '空闲',
    'Ready': '就绪',
    'Online': '在线',
    'Offline': '离线',
    'Unknown': '未知',

    // ── 站点 / 应用 ──
    'Apps': '应用',
    'App': '应用',
    'Bench': 'Bench',
    'Benches': 'Bench 列表',
    'Site': '站点',
    'Domain': '域名',
    'Domains': '域名',
    'SSL': 'SSL',
    'Certificate': '证书',
    'Backup': '备份',
    'Backups': '备份',
    'Restore': '还原',
    'Migrate': '迁移',
    'Migration': '迁移',
    'Upgrade': '升级',
    'Rollback': '回滚',
    'Snapshot': '快照',
    'Files': '文件',
    'Private files': '私有文件',
    'Public files': '公共文件',
    'Disk': '磁盘',
    'Memory': '内存',
    'CPU': 'CPU',
    'Network': '网络',
    'Uptime': '运行时长',
    'Version': '版本',
    'Branch': '分支',
    'Commit': '提交',
    'Installed': '已安装',
    'Installed apps': '已安装应用',
    'Marketplace app': '市场应用',
    'Database': '数据库',
    'Databases': '数据库',
    'Query': '查询',
    'Value': '值',
    'Type': '类型',
    'Name': '名称',
    'Size': '大小',
    'Time': '时间',
    'Date': '日期',
    'User': '用户',
    'Users': '用户',
    'Role': '角色',
    'Roles': '角色',
    'Permissions': '权限',
    'Email': '邮箱',
    'Server': '服务器',
    'System': '系统',
    'Security': '安全',
    'Alerts': '告警',
    'Notifications': '通知',
    'Integrations': '集成',
    'Localization': '本地化',
    'Business': '业务',
    'Utility': '工具',
    'Setup': '安装向导',
    'Home': '首页',
    'Login': '登录',
    'Log in': '登录',
    'Logout': '退出登录',
    'Log out': '退出登录',
    'Sign in': '登录',
    'Sign out': '退出登录',
    'Password': '密码',
    'Username': '用户名',
    'Theme': '主题',
    'Light': '浅色',
    'Dark': '深色',
    'System theme': '跟随系统',
    'Language': '语言',
    'Time zone': '时区',

    // ── 时间 ──
    'Daily': '每天',
    'Weekly': '每周',
    'Monthly': '每月',
    'Hourly': '每小时',
    'Today': '今天',
    'Yesterday': '昨天',
    'Last 7 days': '最近 7 天',
    'Last 30 days': '最近 30 天',
    'All': '全部',
    'None': '无',

    // ── 常见提示消息 ──
    'Failed to save.': '保存失败。',
    'Could not save.': '无法保存。',
    'Failed to load.': '加载失败。',
    'Could not load settings.': '无法加载设置。',
    'Failed to load analytics.': '分析数据加载失败。',
    'No output.': '无输出。',
    'No results.': '无结果。',
    'Loading…': '加载中…',
    'Loading...': '加载中…',
    'Could not start backup': '无法启动备份',
    'Could not start the restore.': '无法启动还原。',
    'Could not load binary logs.': '无法加载二进制日志。',
    'Could not enable SSL.': '无法启用 SSL。',
    "Couldn't load this section": '无法加载此部分',
    "Couldn't open Cloud settings. Please try again.": '无法打开云端设置，请重试。',
    'The upload was cancelled.': '上传已取消。',
    'Are you sure?': '确定吗？',
    'This action cannot be undone.': '此操作不可撤销。',
    'Copied to clipboard.': '已复制到剪贴板。',
    'Something went wrong.': '出错了。',
    'Please try again.': '请重试。'
  };

  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, INPUT: 1, SVG: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function tr(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var key = raw.trim();
    if (!key) return;
    var hit = DICT[key];
    if (hit === undefined || hit === key) return;
    node.nodeValue = raw.replace(key, hit);
    node.__pilotCn = 1;
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { tr(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP[root.tagName] || root.hasAttribute('data-no-i18n')) return;
    for (var i = 0; i < root.childNodes.length; i++) walk(root.childNodes[i]);
    for (var a = 0; a < ATTRS.length; a++) {
      var v = root.getAttribute && root.getAttribute(ATTRS[a]);
      if (v && DICT[v.trim()] !== undefined) root.setAttribute(ATTRS[a], DICT[v.trim()]);
    }
    if (root.placeholder && DICT[root.placeholder.trim()]) root.placeholder = DICT[root.placeholder.trim()];
  }

  function runAll() { if (document.body) walk(document.body); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }

  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') tr(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  window.__pilotCn = { dict: DICT, run: runAll };
})();
