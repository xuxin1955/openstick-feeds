'use strict';
'require view';
'require rpc';
'require fs';
'require uci';
'require ui';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ],
	expect: { '': {} }
});

var CHANNELS = [
	[ 'email_enabled',    '邮箱' ],
	[ 'pushplus_enabled', 'PushPlus' ],
	[ 'wecom_enabled',    '企业微信' ],
	[ 'telegram_enabled', 'Telegram' ],
	[ 'dingtalk_enabled', '钉钉' ],
	[ 'bark_enabled',     'Bark' ],
	[ 'shell_enabled',    'Shell 脚本' ]
];

function isRunning(data) {
	var svc = data && data.dbussmsforward;

	if (!svc || !svc.instances)
		return false;

	for (var name in svc.instances)
		if (svc.instances[name].running)
			return true;

	return false;
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('dbussmsforward'),
			callServiceList('dbussmsforward')
		]);
	},

	handleAction: function(action) {
		return fs.exec('/etc/init.d/dbussmsforward', [ action ]).then(function() {
			ui.addNotification(null, E('p', {}, _('已执行「%s」，正在刷新状态…').format(action)), 'info');
			window.setTimeout(function() { location.reload(); }, 1500);
		}).catch(function(e) {
			ui.addNotification(null, E('p', {}, _('执行失败：%s').format(e.message || e)), 'error');
		});
	},

	render: function(data) {
		var enabled = uci.get('dbussmsforward', 'main', 'enabled') == '1';
		var running = isRunning(data[1]);
		var channels = [];
		var i;

		for (i = 0; i < CHANNELS.length; i++)
			if (uci.get('dbussmsforward', 'main', CHANNELS[i][0]) == '1')
				channels.push(CHANNELS[i][1]);

		if (uci.get('dbussmsforward', 'main', 'api_enabled') == '1')
			channels.push(_('发送短信API（端口 %s）').format(
				uci.get('dbussmsforward', 'main', 'api_port') || '8080'));

		var state, label;
		if (!enabled) {
			state = 'warning';
			label = _('未启用');
		}
		else if (running) {
			state = 'success';
			label = _('运行中');
		}
		else {
			state = 'danger';
			label = _('已停止');
		}

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('短信转发 - 运行状态')),

			E('div', { 'class': 'cbi-section' }, [
				E('table', { 'class': 'table' }, [
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td left', 'width': '35%' }, _('服务状态')),
						E('td', { 'class': 'td left' }, [
							E('span', { 'class': 'label ' + state }, label)
						])
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td left' }, _('已启用渠道')),
						E('td', { 'class': 'td left' }, channels.length
							? channels.join('、')
							: E('em', {}, _('无（服务不会启动）')))
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td left' }, _('运行日志')),
						E('td', { 'class': 'td left' },
							_('可用 logread -e DbusSmsForwardCPlus 查看转发过程输出。'))
					])
				]),

				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, 'handleAction', 'restart')
					}, _('重启服务')),
					E('button', {
						'class': 'btn cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, 'handleAction', 'start')
					}, _('启动')),
					E('button', {
						'class': 'btn cbi-button cbi-button-reset',
						'click': ui.createHandlerFn(this, 'handleAction', 'stop')
					}, _('停止'))
				])
			])
		]);
	}
});
