include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-wifi
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=local

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-wifi
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=WiFi relay STA uplink without dropping the AP
  DEPENDS:=+luci-base +iw +iwinfo +jsonfilter +coreutils-timeout
  PKGARCH:=all
endef

define Package/luci-app-wifi/description
  LuCI page and backend to connect a WiFi uplink as STA while keeping the AP up.
endef

define Build/Compile
endef

define Package/luci-app-wifi/install
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/90-wifi-relay $(1)/etc/uci-defaults/90-wifi-relay
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/wifi-relay.sh $(1)/usr/libexec/wifi-relay.sh
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-wifi.json $(1)/usr/share/luci/menu.d/luci-app-wifi.json
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-wifi.json $(1)/usr/share/rpcd/acl.d/luci-app-wifi.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/wifi-relay
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/wifi-relay/wr2.js $(1)/www/luci-static/resources/view/wifi-relay/wr2.js
endef

define Package/luci-app-wifi/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -f /tmp/luci-indexcache.*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null
fi
exit 0
endef

$(eval $(call BuildPackage,luci-app-wifi))
