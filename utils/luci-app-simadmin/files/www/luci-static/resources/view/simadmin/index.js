'use strict';
'require view';

return view.extend({
handleSave: null,
handleSaveApply: null,
handleReset: null,
render: function() {
var host = window.location.hostname;
return E('iframe', {
src: 'http://' + host + ':3000/',
style: 'width:100%;height:calc(100vh - 80px);border:none;display:block;'
});
}
});
