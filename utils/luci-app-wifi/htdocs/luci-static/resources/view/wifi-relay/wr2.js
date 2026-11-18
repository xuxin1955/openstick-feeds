'use strict';
'require view';
'require fs';
'require uci';
'require ui';
'require poll';

var SCRIPT = '/usr/libexec/wifi-relay.sh';
var SCAN_FILE = '/tmp/wifi-relay-scan.json';
var SEC = 'wifi_relay_sta';
var NET = 'wwan';
var POLL = 8;

var CSS = `
#wr-app {
  max-width: 880px;
  margin: 0 auto;
  padding: 6px 4px 40px;
  font-size: 14px;
  color: #1f2937;
  text-align: left;
}
#wr-app * { box-sizing: border-box; }
#wr-app .wr-card {
  background: #fff;
  border: 1px solid #e6e9f0;
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 14px;
  box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 32px -26px rgba(15,23,42,.45);
}
#wr-app .wr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
#wr-app .wr-title { font-size: 17px; font-weight: 600; letter-spacing: .2px; }
#wr-app .wr-sub { font-size: 12px; color: #8a94a6; margin-top: 3px; }
#wr-app .wr-head-actions { display: flex; gap: 10px; flex: none; }
#wr-app .wr-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
  background: #f4f6fa;
  color: #374151;
}
#wr-app .wr-btn:hover { background: #eceff6; }
#wr-app .wr-btn-primary { background: #4f63d2; color: #fff; }
#wr-app .wr-btn-primary:hover { background: #4457c0; }
#wr-app .wr-btn-quiet { background: #fff; color: #d64545; border-color: #f0c9c9; }
#wr-app .wr-btn-quiet:hover { background: #fdf3f3; border-color: #e9b4b4; }

#wr-app .wr-st { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
#wr-app .wr-st > div { min-width: 0; }
#wr-app .wr-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
#wr-app .wr-dot-ok { background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.13); }
#wr-app .wr-dot-warn { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,.13); }
#wr-app .wr-dot-idle { background: #cbd5e1; box-shadow: 0 0 0 4px rgba(203,213,225,.28); }
#wr-app .wr-st-title { font-size: 13px; font-weight: 600; }
#wr-app .wr-st-sub {
  font-size: 12px;
  color: #8a94a6;
  margin-top: 2px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#wr-app .wr-st-ip {
  margin-left: auto;
  font-size: 12.5px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}
#wr-app .wr-st-ip-k {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .6px;
  color: #97a1b2;
  background: #f1f4f9;
  border-radius: 5px;
  padding: 1px 5px;
  margin-right: 6px;
  vertical-align: 1px;
}
#wr-app .wr-sig { display: inline-flex; align-items: center; gap: 8px; }
#wr-app .wr-sig-bar {
  display: inline-block;
  height: 5px;
  background: #edf0f5;
  border-radius: 4px;
  overflow: hidden;
}
#wr-app .wr-sig-val {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 56px;
}
#wr-app .wr-sig-na { color: #9aa6b8; font-size: 12px; }

#wr-app .wr-banner { margin-bottom: 14px; }
#wr-app .wr-note {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #f6f8fe;
  border: 1px solid #dbe3f8;
  border-left: 3px solid #4f63d2;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: #3b4a63;
}
#wr-app .wr-note-dim { color: #8895aa; font-size: 11.5px; }

#wr-app .wr-list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
#wr-app .wr-title2 { font-size: 13.5px; font-weight: 600; color: #374151; }
#wr-app .wr-count { font-size: 11.5px; color: #98a2b3; }
#wr-app .wr-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 2px;
  border-top: 1px solid #f1f3f7;
}
#wr-app .wr-row:first-child { border-top: 0; }
#wr-app .wr-row-main { min-width: 0; flex: 1; }
#wr-app .wr-ssid {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#wr-app .wr-meta {
  font-size: 11.5px;
  color: #98a2b3;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}
#wr-app .wr-row-right { display: flex; align-items: center; gap: 14px; flex: none; }
#wr-app .wr-connect {
  padding: 6px 15px;
  font-size: 12.5px;
  border-radius: 8px;
  background: #eef1fb;
  color: #4f63d2;
  border: 1px solid #dde3f8;
  cursor: pointer;
  transition: background .15s;
}
#wr-app .wr-connect:hover { background: #e2e7fa; }
#wr-app .wr-tag { font-size: 12.5px; color: #1f9d55; font-weight: 600; }
#wr-app .wr-empty {
  text-align: center;
  color: #98a2b3;
  font-size: 12.5px;
  padding: 22px 10px;
}

@media (max-width: 560px) {
  #wr-app { padding: 0 0 26px; }
  #wr-app .wr-card { border-radius: 12px; padding: 14px; }
  #wr-app .wr-title { font-size: 16px; }
  #wr-app .wr-head-actions { width: 100%; }
  #wr-app .wr-head-actions .wr-btn { flex: 1; text-align: center; }
  #wr-app .wr-st-gap { display: none; }
  #wr-app .wr-st-ip { margin-left: 0; width: 100%; padding-left: 23px; }
  #wr-app .wr-bssid { display: none; }
  #wr-app .wr-row { gap: 10px; padding: 11px 0; }
  #wr-app .wr-row-right { gap: 9px; }
  #wr-app .wr-sig-bar { width: 44px !important; }
  #wr-app .wr-sig-val { min-width: 50px; font-size: 11.5px; }
}
`;

function run(args) {
	return fs.exec(SCRIPT, args || []).then(function(res) {
		return (res && res.stdout) ? String(res.stdout).trim() : '';
	});
}

function readScan() {
	return L.resolveDefault(fs.read(SCAN_FILE), '[]');
}

function scanOnce(depth) {
	return readScan().then(function(txt) {
		var list = tryParse(txt);
		if (list && list.length)
			return list;
		if (depth >= 3)
			return [];
		return new Promise(function(resolve) {
			window.setTimeout(resolve, 400);
		}).then(function() {
			return scanOnce(depth + 1);
		});
	});
}

function tryParse(txt) {
	try { return JSON.parse(txt); } catch (e) { return null; }
}

function encMode(enc) {
	var e = String(enc || '').toUpperCase();
	if (e.indexOf('SAE') > -1 || e.indexOf('WPA3') > -1) return 'sae';
	if (e.indexOf('WPA2') > -1) {
		if (e.indexOf('CCMP') === -1 && e.indexOf('TKIP') > -1) return 'psk2+tkip';
		return 'psk2';
	}
	if (e.indexOf('WPA') > -1) return 'psk';
	if (e.indexOf('PSK') > -1) return 'psk2';
	if (e.indexOf('WEP') > -1) return 'wep';
	return 'none';
}

function encLabel(enc) {
	var e = String(enc || '').toUpperCase();
	if (e.indexOf('WPA3') > -1 || e.indexOf('SAE') > -1) return 'WPA3';
	if (e.indexOf('WPA2') > -1) return 'WPA2';
	if (e.indexOf('WPA') > -1) return 'WPA';
	if (e.indexOf('WEP') > -1) return 'WEP';
	if (!e || e === 'NONE' || e === 'OPEN') return '开放';
	return enc;
}

function validBssid(b) {
	return /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(b);
}

function validKey(enc, k) {
	if (enc === 'none') return true;
	if (enc === 'wep') return /^([0-9a-fA-F]{10}|[0-9a-fA-F]{26}|[\x20-\x7e]{5}|[\x20-\x7e]{13})$/.test(k);
	return (k.length >= 8 && k.length <= 63) || /^[0-9a-fA-F]{64}$/.test(k);
}

function sigQuality(sig) {
	if (sig === null || sig === undefined) return null;
	var s = String(sig).trim();
	if (s === '' || isNaN(s)) return null;
	var n = Number(s);
	if (n >= 0 || n < -120) return null;
	return Math.max(0, Math.min(100, 2 * (n + 100)));
}

function sigColor(v) {
	return v >= 60 ? '#22c55e' : (v >= 30 ? '#f59e0b' : '#ef4444');
}

function sigBar(sig, width) {
	var v = sigQuality(sig), w = width || 84;
	if (v === null)
		return E('span', { 'class': 'wr-sig-na' }, '—');
	var c = sigColor(v);
	return E('span', { 'class': 'wr-sig' }, [
		E('span', { 'class': 'wr-sig-bar', 'style': 'width:' + w + 'px' },
			E('span', { 'style': 'display:block;height:100%;width:' + v + '%;background:' + c + ';border-radius:4px' })),
		E('span', { 'class': 'wr-sig-val', 'style': 'color:' + c }, String(sig).replace(/^-?\d+$/, '$& dBm'))
	]);
}

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(run([ 'status' ]), '{}'),
			L.resolveDefault(uci.load('wireless'), null)
		]);
	},

	render: function(data) {
		var self = this;

		this.status = tryParse(data[0]) || {};

		this.statusEl = E('div', { 'class': 'wr-st' }, this.renderStatus(this.status));
		this.bannerEl = E('div', { 'class': 'wr-banner', 'style': 'display:none' });
		this.listEl = E('div', { 'class': 'wr-list' });

		var root = E('div', { 'id': 'wr-app' }, [
			E('style', {}, CSS),
			E('div', { 'class': 'wr-card wr-head' }, [
				E('div', {}, [
					E('div', { 'class': 'wr-title' }, 'WiFi 中继'),
					E('div', { 'class': 'wr-sub' }, '保持热点运行，同时用 STA 接入上游 WiFi')
				]),
				E('div', { 'class': 'wr-head-actions' }, [
					E('button', {
						'class': 'wr-btn wr-btn-primary',
						'click': function() { return self.handleScan(); }
					}, '扫描 WiFi'),
					E('button', {
						'class': 'wr-btn wr-btn-quiet',
						'click': function() { return self.handleDisconnect(); }
					}, '断开')
				])
			]),
			E('div', { 'class': 'wr-card' }, [ this.statusEl ]),
			this.bannerEl,
			this.listEl
		]);

		poll.add(function() { return self.refreshStatus(); }, POLL);

		window.setTimeout(function() {
			var box = document.getElementById('maincontent');
			if (!box) return;
			Array.prototype.forEach.call(box.querySelectorAll('.cbi-page-actions'), function(n) {
				if (n.parentNode) n.parentNode.removeChild(n);
			});
		}, 50);

		return root;
	},

	renderStatus: function(s) {
		var up = (s.up === true || s.up === 'true');
		var linked = (s.linked === true || s.linked === 'true');

		var main = function(color, title, sub) {
			return [
				E('span', { 'class': 'wr-dot wr-dot-' + color }),
				E('div', {}, [
					E('div', { 'class': 'wr-st-title' }, title),
					sub ? E('div', { 'class': 'wr-st-sub' }, sub) : ''
				])
			];
		};

		if (up) {
			return [].concat(
				main('ok', '已连接', s.ssid || '—'),
				[ E('span', { 'class': 'wr-st-gap', 'style': 'width:6px' }), sigBar(s.signal, 96) ],
				[ E('div', { 'class': 'wr-st-ip' }, [
					E('span', { 'class': 'wr-st-ip-k' }, 'IP'),
					s.address || '—'
				]) ]
			);
		}
		if (linked) {
			return [].concat(
				main('warn', '已关联，等待 IP', s.ssid || '—'),
				[ E('span', { 'class': 'wr-st-gap', 'style': 'width:6px' }), sigBar(s.signal, 96) ]
			);
		}
		if (s.disabled === '1')
			return main('idle', '未启用', '点击下方扫描并选择上游网络');
		return main('idle', '未连接', '点击下方扫描并选择上游网络');
	},

	refreshStatus: function() {
		var self = this;
		return run([ 'status' ]).then(function(txt) {
			var s = tryParse(txt) || {};
			self.status = s;
			if (!self.statusEl) return;
			self.statusEl.innerHTML = '';
			self.renderStatus(s).forEach(function(n) {
				if (n) self.statusEl.appendChild(n);
			});
		}).catch(function() {});
	},

	handleScan: function() {
		var self = this;
		this.listEl.innerHTML = '';
		this.listEl.appendChild(E('div', { 'class': 'wr-card' },
			E('div', { 'class': 'wr-empty' }, '扫描中，约需 2~4 秒（单频设备热点会短暂抖动）')));

		return run([ 'scan' ]).then(function() {
			return scanOnce(0);
		}).then(function(list) {
			self.renderList(list);
		}).catch(function() {
			self.listEl.innerHTML = '';
			self.listEl.appendChild(E('div', { 'class': 'wr-card' },
				E('div', { 'class': 'wr-empty' }, '扫描失败，请稍后重试')));
		});
	},

	renderList: function(list) {
		var self = this;

		this.listEl.innerHTML = '';

		if (!list || !list.length) {
			this.listEl.appendChild(E('div', { 'class': 'wr-card' },
				E('div', { 'class': 'wr-empty' }, '没有扫到网络：确认热点正在运行，且上游信号可达')));
			return;
		}

		var sorted = list.slice().sort(function(a, b) {
			return (Number(b.signal) || -999) - (Number(a.signal) || -999);
		});

		var st = self.status || {};
		var curUp = (st.up === true || st.up === 'true' || st.linked === true || st.linked === 'true');

		var rows = sorted.map(function(n) {
			var ch = Number(n.channel) || 0;
			var isCur = curUp && st.ssid && st.ssid === n.ssid;

			var action = isCur
				? E('span', { 'class': 'wr-tag' }, '已连接')
				: E('button', {
					'class': 'wr-connect',
					'click': function() { return self.handleConnect(n); }
				}, '连接');

			return E('div', { 'class': 'wr-row' }, [
				E('div', { 'class': 'wr-row-main' }, [
					E('div', { 'class': 'wr-ssid' }, n.ssid || '（隐藏网络）'),
					E('div', { 'class': 'wr-meta' }, [
						E('span', { 'class': 'wr-bssid' }, (n.bssid || '') + ' · '),
						'信道 ' + ch + ' · ' + encLabel(n.enc)
					])
				]),
				E('div', { 'class': 'wr-row-right' }, [ sigBar(n.signal, 70), action ])
			]);
		});

		this.listEl.appendChild(E('div', { 'class': 'wr-card' }, [
			E('div', { 'class': 'wr-list-head' }, [
				E('div', { 'class': 'wr-title2' }, '可用网络'),
				E('span', { 'class': 'wr-count' }, sorted.length + ' 个')
			]),
			E('div', {}, rows)
		]));
	},

	handleConnect: function(n) {
		var self = this;
		var enc = encMode(n.enc);

		var ssidEl = E('input', { 'class': 'cbi-input-text', 'style': 'width:100%', 'value': n.ssid || '' });
		var keyEl = E('input', { 'class': 'cbi-input-text', 'type': 'password', 'style': 'width:100%;min-width:0' });
		var eyeBtn = E('button', {
			'class': 'cbi-button',
			'type': 'button',
			'style': 'margin-left:6px;padding:4px 10px;font-size:12px;white-space:nowrap;flex:0 0 auto',
			'click': function(ev) {
				var b = ev.currentTarget;
				if (keyEl.type === 'password') {
					keyEl.type = 'text';
					b.textContent = '隐藏';
				}
				else {
					keyEl.type = 'password';
					b.textContent = '显示';
				}
			}
		}, '显示');
		var bssidEl = E('input', { 'class': 'cbi-input-text', 'style': 'width:100%', 'value': n.bssid || '' });
		var errEl = E('div', { 'style': 'display:none;color:#dc2626;font-size:12.5px;margin-top:6px' });

		function fail(msg) {
			errEl.innerHTML = '';
			errEl.appendChild(E('span', {}, msg));
			errEl.style.display = '';
			return false;
		}

		function submit() {
			var ssid = String(ssidEl.value || '').trim();
			var key = String(keyEl.value || '');
			var bssid = String(bssidEl.value || '').trim();

			if (!ssid)
				return fail('SSID 不能为空。');
			if (bssid && !validBssid(bssid))
				return fail('BSSID 格式应为 aa:bb:cc:dd:ee:ff。');
			if (enc !== 'none' && !validKey(enc, key))
				return fail(enc === 'wep' ? 'WEP 密码需 5 或 13 个字符，或 10 或 26 位十六进制。'
					: 'WPA 密码需 8 到 63 个字符，或 64 位十六进制。');

			ui.hideModal();
			return self.commitSta({ ssid: ssid, enc: enc, key: key, bssid: bssid, label: ssid });
		}

		ui.showModal('连接 ' + (n.ssid || n.bssid || ''), [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, 'SSID'),
				E('div', { 'class': 'cbi-value-field' }, ssidEl)
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, '密码'),
				E('div', { 'class': 'cbi-value-field' }, [
					E('div', { 'style': 'display:flex;align-items:center' }, [ keyEl, eyeBtn ])
				])
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, '锁定 BSSID'),
				E('div', { 'class': 'cbi-value-field' }, [
					bssidEl,
					E('div', { 'style': 'color:#8a94a6;font-size:11.5px;margin-top:4px' },
						'留空不锁定；锁定可避免同名热点抢连导致跳信道')
				])
			]),
			errEl,
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, '取消'),
				' ',
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() { return submit(); }
				}, '保存并连接')
			])
		]);
	},

	commitSta: function(p) {
		var self = this;
		this.showScheduled(p.label);
		window.setTimeout(function() { self.refreshStatus(); }, 60000);

		return run([ 'configure', p.ssid, p.enc, p.key, p.bssid || '', '5' ]).then(function(txt) {
			if (txt && txt.indexOf('ERR') === 0)
				throw txt;
		}).catch(function(err) {
			self.hideBanner();
			ui.addNotification(null, E('p', {}, '下发失败：' + err), 'error');
		});
	},

	showScheduled: function(desc) {
		if (!this.bannerEl) return;
		this.bannerEl.innerHTML = '';
		this.bannerEl.appendChild(E('div', { 'class': 'wr-note' }, [
			E('span', { 'class': 'spinning' }),
			E('span', {}, [ '正在切换「', E('b', {}, desc), '」，设备 10 秒后重启，热点约 40 秒后恢复' ]),
			E('span', { 'class': 'wr-note-dim' }, '超过 2 分钟仍未恢复，检查 WiFi 密码是否正确')
		]));
		this.bannerEl.style.display = '';
	},

	hideBanner: function() {
		if (!this.bannerEl) return;
		this.bannerEl.innerHTML = '';
		this.bannerEl.style.display = 'none';
	},

	handleDisconnect: function() {
		var self = this;
		this.hideBanner();

		return run([ 'disconnect' ]).then(function(txt) {
			if (txt && txt.indexOf('ERR') === 0)
				throw txt;
			ui.addNotification(null, E('p', {}, '已断开上游连接。'), 'info');
			window.setTimeout(function() { self.refreshStatus(); }, 6000);
		}).catch(function(err) {
			ui.addNotification(null, E('p', {}, '断开失败：' + err), 'error');
		});
	}
});
