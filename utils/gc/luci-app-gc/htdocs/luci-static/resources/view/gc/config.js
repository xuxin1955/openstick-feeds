'use strict';
'require form';
'require rpc';
'require ui';
'require view';

var callRcInit = rpc.declare({
	object: 'rc',
	method: 'init',
	params: [ 'name', 'action' ]
});

return view.extend({
	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev)
			.then(function() {
				return ui.changes.apply(mode == '0');
			})
			.then(function() {
				window.setTimeout(function() {
					Promise.resolve(callRcInit('gc', 'restart')).catch(function() {});
				}, 100);
			});
	},

	render: function() {
		var m, s, o;

		m = new form.Map('gc', _('USB 设备模式'), _('用于配置 USB Host / Gadget 模式及 Gadget 功能。注意：保存并应用后将按所选模式立即切换。'));

		s = m.section(form.NamedSection, 'config', 'gc', _('基本设置'));
		s.anonymous = false;
		s.addremove = false;

		o = s.option(form.ListValue, 'mode', _('USB 模式'));
		o.value('gadget', _('设备模式'));
		o.value('host', _('主机模式'));
		o.rmempty = false;
		o.description = _('切换 USB 控制器工作在 Gadget 或 Host 模式。');

		o = s.option(form.Flag, 'enabled', _('启用'));
		o.rmempty = false;
		o.description = _('启用 USB Gadget 管理。仅在设备模式下生效。');

		o = s.option(form.Flag, 'adb', _('ADB 调试'));
		o.rmempty = false;
		o.description = _('启用 ADB 调试功能。设备上需存在 /etc/init.d/adbd。');

		o = s.option(form.Flag, 'rndis', _('RNDIS 网络'));
		o.rmempty = false;
		o.description = _('启用 RNDIS USB 网络接口。');

		o = s.option(form.Flag, 'ecm', _('ECM 网络'));
		o.rmempty = false;
		o.description = _('启用 ECM USB 网络接口。');

		o = s.option(form.Flag, 'ncm', _('NCM 网络'));
		o.rmempty = false;
		o.description = _('启用 NCM USB 网络接口。');

		o = s.option(form.Flag, 'mass', _('大容量存储'));
		o.rmempty = false;
		o.description = _('启用 USB 大容量存储功能。');

		o = s.option(form.Value, 'mass_path', _('存储后端路径'));
		o.depends('mass', '1');
		o.placeholder = '/';
		o.description = _('填写用于大容量存储的后端文件或块设备绝对路径。');
		o.validate = function(section_id, value) {
			var mass = this.section.formvalue(section_id, 'mass');

			if (mass !== '1')
				return true;

			if (!value)
				return _('启用大容量存储时，必须填写存储后端路径。');

			if (value.charAt(0) !== '/')
				return _('存储后端路径必须是绝对路径。');

			return true;
		};

		o = s.option(form.Flag, 'serial', _('串行接口'));
		o.rmempty = false;
		o.description = _('启用 USB 串行接口功能。');

		o = s.option(form.Flag, 'hid', _('HID 设备'));
		o.rmempty = false;
		o.description = _('启用 USB HID 人机接口设备功能。');

		o = s.option(form.Flag, 'acm', _('ACM 串口'));
		o.rmempty = false;
		o.description = _('启用 USB ACM 串口功能。');

		o = s.option(form.Flag, 'printer', _('打印机'));
		o.rmempty = false;
		o.description = _('启用 USB 打印机功能。');

		o = s.option(form.Flag, 'midi', _('MIDI 设备'));
		o.rmempty = false;
		o.description = _('启用 USB MIDI 设备功能。');

		return m.render();
	}
});
