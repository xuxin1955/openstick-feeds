'use strict';
'require view';
'require form';

/*
 * Every option lives in a single UCI section (config dbussmsforward 'main') so
 * that s.taboption() can spread them across one shared tab bar.
 * Option names map 1:1 onto /etc/config/dbussmsforward.
 */

var STORAGE_TYPES = [
	[ 'all',     _('全部（不过滤）') ],
	[ 'unknown', 'unknown' ],
	[ 'sm',      'sm（收到的短信）' ],
	[ 'me',      'me' ],
	[ 'mt',      'mt' ],
	[ 'sr',      'sr' ],
	[ 'bm',      'bm' ],
	[ 'ta',      'ta' ]
];

return view.extend({
	render: function() {
		var m, s, o, i;

		m = new form.Map('dbussmsforward', _('短信转发'),
			_('通过 D-Bus 监听 ModemManager 收到的新短信并按渠道转发。保存后服务会自动重启生效。'));

		s = m.section(form.NamedSection, 'main', 'dbussmsforward', _('转发设置'));
		s.addremove = false;
		s.tab('general',  _('常规'));
		s.tab('email',    _('邮箱'));
		s.tab('pushplus', _('PushPlus'));
		s.tab('wecom',    _('企业微信'));
		s.tab('telegram', _('Telegram'));
		s.tab('dingtalk', _('钉钉'));
		s.tab('bark',     _('Bark'));
		s.tab('shell',    _('Shell 脚本'));
		s.tab('api',      _('发送短信 API'));

		/* ---------------- General ---------------- */

		o = s.taboption('general', form.Flag, 'enabled', _('启用服务'),
			_('关闭时服务不会启动，配置也不会生效。'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('general', form.Value, 'device_name', _('转发设备名称'),
			_('会出现在转发内容里，留空则自动使用设备主机名。'));
		o.placeholder = _('自动（设备主机名）');
		o.rmempty = false;

		o = s.taboption('general', form.ListValue, 'forward_storage', _('短信存储类型过滤'),
			_('只转发该存储类型里的短信，避免把已发送、草稿箱里的短信重复转发。'));
		for (i = 0; i < STORAGE_TYPES.length; i++)
			o.value(STORAGE_TYPES[i][0], STORAGE_TYPES[i][1]);
		o.default = 'sm';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'sms_code_key', _('验证码关键字'),
			_('用 ± 分隔的关键字列表，短信里出现任一关键字就会尝试提取验证码并写进标题。'));
		o.placeholder = '验证码±verification±code±인증±代码±随机码';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'history_file', _('短信历史文件'),
			_('程序会把转发过的短信追加到这个文件，供「短信」页回看。' +
			  '内容含验证码且明文写在 flash 上，不想留痕就指到 /tmp 下。'));
		o.placeholder = '/etc/dbussmsforward/history.jsonl';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'history_max', _('历史条数上限'),
			_('超出后自动只保留最新的若干条。'));
		o.datatype = 'uinteger';
		o.placeholder = '500';
		o.rmempty = false;

		/* ---------------- Email ---------------- */

		o = s.taboption('email', form.Flag, 'email_enabled', _('启用邮箱转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('email', form.Value, 'email_smtp_host', _('SMTP 服务器'),
			_('例如 smtp.qq.com。'));
		o.depends('email_enabled', '1');
		o.placeholder = 'smtp.qq.com';

		o = s.taboption('email', form.Value, 'email_smtp_port', _('SMTP 端口'),
			_('注意：程序当前固定使用 465 端口发信，此项只作记录。'));
		o.depends('email_enabled', '1');
		o.datatype = 'port';
		o.placeholder = '465';
		o.rmempty = false;

		o = s.taboption('email', form.Value, 'email_key', _('邮箱密钥 / 授权码'));
		o.depends('email_enabled', '1');
		o.password = true;

		o = s.taboption('email', form.Value, 'email_from', _('发件邮箱'));
		o.depends('email_enabled', '1');
		o.datatype = 'email';

		o = s.taboption('email', form.Value, 'email_to', _('收件邮箱'));
		o.depends('email_enabled', '1');
		o.datatype = 'email';

		/* ---------------- PushPlus ---------------- */

		o = s.taboption('pushplus', form.Flag, 'pushplus_enabled', _('启用 PushPlus 转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('pushplus', form.Value, 'pushplus_token', _('PushPlus Token'));
		o.depends('pushplus_enabled', '1');

		/* ---------------- WeCom ---------------- */

		o = s.taboption('wecom', form.Flag, 'wecom_enabled', _('启用企业微信转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('wecom', form.Value, 'wecom_corpid', _('企业 ID（corpid）'));
		o.depends('wecom_enabled', '1');

		o = s.taboption('wecom', form.Value, 'wecom_agentid', _('自建应用 AgentId'));
		o.depends('wecom_enabled', '1');

		o = s.taboption('wecom', form.Value, 'wecom_secret', _('自建应用 Secret'));
		o.depends('wecom_enabled', '1');
		o.password = true;

		/* ---------------- Telegram ---------------- */

		o = s.taboption('telegram', form.Flag, 'telegram_enabled', _('启用 Telegram 转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('telegram', form.Value, 'telegram_token', _('机器人 Token'));
		o.depends('telegram_enabled', '1');
		o.password = true;

		o = s.taboption('telegram', form.Value, 'telegram_chatid', _('目标 Chat ID'));
		o.depends('telegram_enabled', '1');

		o = s.taboption('telegram', form.ListValue, 'telegram_custom_api', _('使用自定义 API'),
			_('官方接口被墙时，可换成自建反代地址。'));
		o.value('false', _('否（使用 api.telegram.org）'));
		o.value('true', _('是（使用下面的自定义地址）'));
		o.depends('telegram_enabled', '1');
		o.default = 'false';
		o.rmempty = false;

		o = s.taboption('telegram', form.Value, 'telegram_api_base', _('自定义 API 地址'),
			_('只填域名，不要带结尾的 /bot...，例如 https://tg.example.com'));
		o.depends('telegram_custom_api', 'true');
		o.placeholder = 'https://tg.example.com';

		/* ---------------- DingTalk ---------------- */

		o = s.taboption('dingtalk', form.Flag, 'dingtalk_enabled', _('启用钉钉机器人转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('dingtalk', form.Value, 'dingtalk_access_token', _('机器人 AccessToken'));
		o.depends('dingtalk_enabled', '1');

		o = s.taboption('dingtalk', form.Value, 'dingtalk_secret', _('加签 Secret'));
		o.depends('dingtalk_enabled', '1');
		o.password = true;

		/* ---------------- Bark ---------------- */

		o = s.taboption('bark', form.Flag, 'bark_enabled', _('启用 Bark 转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('bark', form.Value, 'bark_server', _('Bark 服务器地址'),
			_('例如 https://api.day.app'));
		o.depends('bark_enabled', '1');
		o.placeholder = 'https://api.day.app';

		o = s.taboption('bark', form.Value, 'bark_key', _('推送 Key'));
		o.depends('bark_enabled', '1');
		o.password = true;

		/* ---------------- Shell script ---------------- */

		o = s.taboption('shell', form.Flag, 'shell_enabled', _('启用 Shell 脚本转发'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('shell', form.Value, 'shell_path', _('脚本路径'),
			_('脚本需要可执行权限。程序会依次传入 6 个参数：' +
			  '发信号码、收信日期、短信内容、验证码、验证码来源、设备名。'));
		o.depends('shell_enabled', '1');
		o.placeholder = '/etc/dbussmsforward/forward.sh';

		/* ---------------- Send-SMS API ---------------- */

		o = s.taboption('api', form.Flag, 'api_enabled', _('启用发送短信 API'),
			_('开启后会额外暴露一个 HTTP 服务和发送短信网页。'));
		o.rmempty = false;
		o.default = '0';

		o = s.taboption('api', form.Value, 'api_port', _('监听端口'),
			_('接口地址 http://设备IP:端口/api?telnum=号码&smstext=内容，' +
			  '根路径 / 是发送短信网页。'));
		o.depends('api_enabled', '1');
		o.datatype = 'port';
		o.placeholder = '8080';
		o.rmempty = false;

		return m.render();
	}
});
