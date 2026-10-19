# OpenWrt ModemManager

## Description

Cellular modem control and connectivity

Optional libraries libmbim and libqmi are available.
Your modem may require additional kernel modules and/or the usb-modeswitch
package.

## Usage

Once installed, you can configure the 2G/3G/4G modem connections directly in
/etc/config/network as in the following example:

    config interface 'broadband'
        option device      '/sys/devices/platform/soc/20980000.usb/usb1/1-1/1-1.2/1-1.2.1'
        option proto       'modemmanager'
        option apn         'ac.vodafone.es'
        option allowedauth 'pap chap'
        option username    'vodafone'
        option password    'vodafone'
        option pincode     '7423'
        option iptype      'ipv4'
        option plmn        '214001'
        option lowpower    '1'
        option signalrate  '30'
        option allow_roaming '1'
        option force_connection '1'
        option init_epsbearer '<none|default|custom>'

Only 'device' and 'proto' are mandatory options, the remaining ones are all
optional.

The 'allowedauth' option allows limiting the list of authentication protocols.
It is given as a space-separated list of values, including any of the
following: 'pap', 'chap', 'mschap', 'mschapv2' or 'eap'. It will default to
allowing all protocols.

The 'iptype' option supports any of these values: 'ipv4', 'ipv6' or 'ipv4v6'.
It will default to 'ipv4' if not given.

The 'plmn' option allows to set the network operator MCCMNC.

The 'signalrate' option set's the signal refresh rate (in seconds) for the device.
You can call signal info with command: mmcli -m 0 --signal-get

The 'force_connection' option is designed to ensure that the modem automatically
attempts to reconnect regardless of any errors encountered during the
connection process.

The 'timeout' option sets the command timeout (in seconds) for the long running
'mmcli' calls ('enable', '3gpp-register-in-operator' and 'simple-connect') in
the modemmanager protohandler. The default value is 120 seconds, if no value
is configured.

The 'autoconnect' option controls whether the protohandler starts the data
connection after network registration. It defaults to 1. When set to '0', the
setup finishes right after the modem has registered on the network
(registration state 'home' or 'roaming') without dialing the APN - useful when
the connection itself is managed externally. Note that the interface will be
up but without any IP configuration in this mode.

Network registration is performed in silent mode: if the registration command
fails, the protohandler does not abort but polls the modem's registration state
(modem.3gpp.registration-state) for up to 180 seconds, every 5 seconds, and
proceeds as soon as the modem reports 'home' or 'roaming'. This makes the
handler tolerant to modems that need a long time to register.

Additionally, this package ships two helpers on top of the plain ModemManager
daemon:

* ModemManager-wrapper starts the daemon and replays cached kernel events
  (uevents seen before the daemon was ready) so that no port is missed on
  slow-booting systems.
* ModemManager-monitor listens for modem add/remove events (mmcli -M) and
  reports the availability of the underlying device to netifd
  (proto_set_available), so that interfaces configured with this proto are
  brought down automatically when the modem disappears and brought back up
  when it reappears. If the listener dies, it reconnects automatically and
  reconciles its state with the list of modems currently known to
  ModemManager.

If there is no Circuit switch network available, then an initial EPS
bearer must be set, so this could be used during the network registration
process in 4G and 5G network. For this resaon a new configuration option
'init_epsbearer' was added, which could have the following values.
* none:    Do not set an initial EPS bearer (default)
* default: Use the configuration option 'apn', 'iptype', 'allowedauth',
           'username' and 'password' for setting the initial EPS bearer.
           These are the same options as when establishing a connection.
* custom:  This could be used to use diffrent options when establishing a
           connection. The options are prefixed with an 'init'. So we have
           the following options 'init_apn', 'init_iptype',
           'init_allowedauth', 'init_username' and 'init_password' for
           setting the initial EPS bearer.
