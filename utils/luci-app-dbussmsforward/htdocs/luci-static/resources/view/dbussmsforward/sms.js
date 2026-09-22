'use strict';
'require view';
'require fs';
'require ui';

var PROG = '/usr/bin/DbusSmsForwardCPlus';
var CONF = '/var/etc/dbussmsforward.conf';

// --listsms 一次性返回模组里的短信和插件记录的历史，省一次往返
function loadSms() {
	return fs.exec(PROG, [ '--listsms', '--configfile=' + CONF ]).then(function(res) {
		var out = ((res && res.stdout) || '').trim();

		if (out === '')
			throw new Error(_('程序没有返回任何内容'));

		return JSON.parse(out);
	});
}

function formatTimestamp(value) {
	// 模组返回的是 ISO8601，如 2026-09-22T10:00:00+08:00
	return (value || '').replace('T', ' ').replace(/[+-]\d\d:\d\d$/, '');
}

function table(headers, rows, emptyText) {
	if (!rows.length)
		return E('p', {}, E('em', {}, emptyText));

	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' },
			headers.map(function(h) {
				return E('th', { 'class': 'th' }, h);
			})),
		rows.map(function(cells) {
			return E('tr', { 'class': 'tr' }, cells);
		})
	]);
}

return view.extend({
	load: function() {
		return loadSms().catch(function(e) {
			var raw = (e && e.stdout) ? String(e.stdout).trim() : '';
			return {
				error: (e && e.message) || String(e),
				raw: raw,
				live: [],
				history: []
			};
		});
	},

	buildHistory: function() {
		var rows = ((this.data || {}).history || []).map(function(item) {
			return [
				E('td', { 'class': 'td' }, formatTimestamp(item.time)),
				E('td', { 'class': 'td' }, item.number || ''),
				E('td', { 'class': 'td' }, (item.from || '') + (item.code || '')),
				E('td', { 'class': 'td', 'style': 'white-space:pre-wrap;word-break:break-all' }, item.text || '')
			];
		});

		return table(
			[ _('时间'), _('号码'), _('验证码'), _('内容') ],
			rows,
			_('还没有记录。程序每转发一条短信就会追加一条历史。'));
	},

	buildLive: function() {
		var stateText = {
			received: _('收到'),
			sent: _('已发送'),
			sending: _('发送中'),
			stored: _('已存储'),
			unknown: _('未知')
		};

		var rows = ((this.data || {}).live || []).map(function(item) {
			return [
				E('td', { 'class': 'td' }, formatTimestamp(item.timestamp)),
				E('td', { 'class': 'td' }, item.number || ''),
				E('td', { 'class': 'td' }, stateText[item.state] || item.state || ''),
				E('td', { 'class': 'td' }, item.storage || ''),
				E('td', { 'class': 'td', 'style': 'white-space:pre-wrap;word-break:break-all' }, item.text || '')
			];
		});

		return table(
			[ _('时间'), _('号码'), _('状态'), _('存储'), _('内容') ],
			rows,
			_('模组里当前没有短信。'));
	},

	// 两张表各自套一层 div，刷新时整层换掉
	buildLists: function() {
		var self = this;

		this.historyBox = E('div', {}, self.buildHistory());
		this.liveBox = E('div', {}, self.buildLive());

		return [
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('插件历史')),
				E('p', { 'class': 'cbi-section-descr' },
					_('程序转发过的每一条短信都会追加到历史文件，可长期回看。')),
				this.historyBox
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('模组中的短信')),
				E('p', { 'class': 'cbi-section-descr' },
					_('直接读 ModemManager 当前保存的短信，模组容量有限，满了会被新短信挤掉。')),
				this.liveBox
			])
		];
	},

	handleRefresh: function() {
		var self = this;

		return loadSms().then(function(data) {
			self.data = data;
			self.historyBox.replaceChild(self.buildHistory(), self.historyBox.firstChild);
			self.liveBox.replaceChild(self.buildLive(), self.liveBox.firstChild);
			ui.addNotification(null, E('p', {}, _('已刷新')), 'info');
		}).catch(function(e) {
			ui.addNotification(null, E('p', {}, _('刷新失败：%s').format((e && e.message) || e)), 'error');
		});
	},

	handleSend: function() {
		var number = (document.getElementById('sms_number').value || '').trim();
		var text = document.getElementById('sms_text').value || '';

		if (number === '') {
			ui.addNotification(null, E('p', {}, _('请填写收信号码')), 'warning');
			return;
		}
		if (text === '') {
			ui.addNotification(null, E('p', {}, _('请填写短信内容')), 'warning');
			return;
		}

		// 参数按数组传给 rpcd，直接 exec，不经过 shell，所以内容里的引号、
		// 换行、中文都不需要转义
		return fs.exec(PROG, [ '--sendsms=' + number, '--smstext=' + text, '--configfile=' + CONF ])
			.then(function(res) {
				var out = ((res && res.stdout) || '').trim();
				document.getElementById('sms_text').value = '';
				ui.addNotification(null, E('p', {}, out || _('已提交发送')), 'info');
			})
			.catch(function(e) {
				ui.addNotification(null, E('p', {},
					((e && e.stdout) || (e && e.message) || String(e)).trim()), 'error');
			});
	},

	render: function(data) {
		this.data = data;

		var body = [
			E('h2', {}, _('短信转发 - 短信')),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('发送短信')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'sms_number' }, _('收信号码')),
					E('div', { 'class': 'cbi-value-field' },
						E('input', { 'type': 'text', 'id': 'sms_number', 'class': 'cbi-input-text' }))
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'sms_text' }, _('短信内容')),
					E('div', { 'class': 'cbi-value-field' },
						E('textarea', { 'id': 'sms_text', 'class': 'cbi-input-textarea', 'rows': 4 }))
				]),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, 'handleSend')
					}, _('发送'))
				])
			])
		];

		if (data.error)
			body.push(E('div', { 'class': 'alert-message error' },
				_('读取短信失败：%s').format(data.error)));

		body.push(E('div', { 'class': 'cbi-page-actions' }, [
			E('button', {
				'class': 'btn cbi-button',
				'click': ui.createHandlerFn(this, 'handleRefresh')
			}, _('刷新'))
		]));

		body = body.concat(this.buildLists());

		return E('div', { 'class': 'cbi-map' }, body);
	}
});
