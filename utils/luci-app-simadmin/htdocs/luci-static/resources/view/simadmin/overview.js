'use strict';
'require view';

var base = 'http://' + window.location.hostname + ':3000/';
var frame = null;
var holder = null;
var timer = null;
var down = false;

function probe() {
	if (!frame || !frame.isConnected)
		return;
	fetch(base, { mode: 'no-cors', cache: 'no-store' }).then(function() {
		if (down) {
			down = false;
			frame.src = base;
		}
	}).catch(function() {
		down = true;
	});
}

function watch() {
	if (!timer)
		timer = setInterval(probe, 5000);
}

return view.extend({
	load: function() {
		return Promise.resolve();
	},

	render: function() {
		if (!frame) {
			frame = E('iframe', {
				'src': base,
				'title': 'SimAdmin',
				'style': 'width:100%;height:100%;border:0;display:block;background:#fff',
				'allow': 'clipboard-read; clipboard-write; fullscreen'
			});
			holder = E('div', {
				'style': 'height:70vh;min-height:320px;background:#fff;overflow:hidden'
			}, [frame]);
		}

		var box = holder;

		var fit = function() {
			if (!box.isConnected)
				return;
			var top = box.getBoundingClientRect().top;
			var h = Math.max(320, window.innerHeight - top - 12);
			if (Math.abs(box.offsetHeight - h) > 2)
				box.style.height = h + 'px';
		};

		requestAnimationFrame(fit);
		window.addEventListener('resize', fit);
		watch();

		return box;
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
