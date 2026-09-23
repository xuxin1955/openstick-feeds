'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callSmsSend = rpc.declare({
	object: 'sms_sqlite',
	method: 'send',
	params: ['number', 'text']
});

return view.extend({
	render: function() {
		var numInput = E('input', { type: 'text', class: 'cbi-input-text', placeholder: '+XXXXXXXXXXX' });
		var txtInput = E('textarea', { style: 'width:100%; height:100px;' });

		return E('div', { class: 'cbi-map' }, [
			E('h2', { name: 'content' }, _('Send SMS')),
			E('div', { class: 'cbi-section' }, [
				E('div', { class: 'cbi-value' }, [
					E('label', { class: 'cbi-value-title' }, _('Recipient number')),
					E('div', { class: 'cbi-value-field' }, numInput)
				]),
				E('div', { class: 'cbi-value' }, [
					E('label', { class: 'cbi-value-title' }, _('Message text')),
					E('div', { class: 'cbi-value-field' }, txtInput)
				]),
				E('div', { class: 'cbi-value' }, [
					E('div', { class: 'cbi-value-field' }, [
						E('button', {
							class: 'cbi-button cbi-button-apply',
							click: ui.createHandlerFn(this, function(ev) {
								if (!numInput.value || !txtInput.value) {
									ui.addNotification(null, E('p', _('Please fill in all fields')));
									return;
								}
								var btn = ev.target;
								btn.disabled = true;
								btn.textContent = _('Sending...');

								return callSmsSend(numInput.value, txtInput.value).then(function(res) {
									btn.disabled = false;
										btn.textContent = _('Send');
										ui.addNotification(null, E('p', _('SMS sent successfully')), 'notice');
									numInput.value = '';
									txtInput.value = '';
								}).catch(function(e) {
									btn.disabled = false;
										btn.textContent = _('Send');
										ui.addNotification(null, E('p', _('Error: ') + String(e)), 'danger');
								});
							})
							}, _('Send'))
					])
				])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
