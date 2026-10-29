'use strict';
'require view';

return view.extend({
	load: function() {
		return Promise.resolve();
	},

	render: function() {
		var host = window.location.hostname;
		var frame = E('iframe', {
			'src': 'http://' + host + ':3000/',
			'style': 'width:100%;height:100%;border:0;display:block',
			'allow': 'clipboard-read; clipboard-write; fullscreen'
		});
		var box = E('div', {
			'style': 'height:70vh;background:#f5f6f8'
		}, [frame]);

		var fit = function() {
			if (!box.isConnected)
				return;
			var r = box.getBoundingClientRect();
			box.style.height = Math.max(320, window.innerHeight - r.top - 12) + 'px';
		};

		setTimeout(fit, 30);
		window.addEventListener('resize', fit);

		return box;
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
